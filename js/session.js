/* ============================================================
   Bloom Kids — سيشن مباشرة (LiveKit)

   الملف ده بيخدم صفحتين مفصولتين:
     meeting.html  data-role="kid"   → الطلبة
     host.html     data-role="host"  → المدرّس

   الفصل الحقيقي مش هنا — هو في التوكن اللي السيرفر بيوقّعه:
     • الطالب توكنه canPublishSources = ["microphone"] بس، يعني
       حتى لو حد فتح الكونسول وحاول يشارك شاشته، LiveKit هيرفض.
     • المدرّس توكنه فيه screen_share + roomAdmin.
   إخفاء الأزرار هنا مجرد تحسين شكل، مش هو الحماية.
   ============================================================ */
(function () {
  "use strict";

  var LK_SRC = "https://cdn.jsdelivr.net/npm/livekit-client@2.21.0/dist/livekit-client.umd.min.js";
  var DEFAULT_ROOM = "bloom-1";
  var NAME_KEY = "bloomkids_meet_name";

  /* ============================================================
     إعدادات الصوت والصورة — كلها في مكان واحد عشان تتظبط بسهولة
     ============================================================ */

  /* الميك: شيلنا voiceIsolation. هو بيشتغل معالجة تقيلة جوه
     المتصفح، بيزوّد تأخير محسوس وبيخلي صوت الأطفال أحياناً
     مقطّع أو "روبوت". كتم الضوضاء العادي كفاية. */
  var MIC_CONSTRAINTS = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 48000,
    latency: 0.01,
  };

  /* ٣٢ كيلوبت بدل ٢٤ — الصوت بيطلع أوضح والفرق في الاستهلاك
     مش محسوس على أي شبكة. */
  var VOICE_PRESET = { maxBitrate: 32000 };

  /* مشاركة الشاشة:
     - بنطلب ٧٢٠p/٣٠ إطار من الأول، عشان المتصفح ما يصوّرش
       ٤K ويفضل يصغّرها كل إطار (ده كان بياكل المعالج ويأخّر).
     - contentHint: motion + maintain-framerate = الأولوية
       للحركة اللحظية، والوضوح هو اللي بينزل وقت الزحمة. */
  var SCREEN_RES = { width: 1280, height: 720, frameRate: 30 };
  var SCREEN_ENCODING = { maxBitrate: 3000000, maxFramerate: 30, priority: "high" };
  var SCREEN_CAPTURE = {
    audio: true,
    contentHint: "motion",
    resolution: SCREEN_RES,
    selfBrowserSurface: "exclude",
    surfaceSwitching: "include",
    systemAudio: "include",
  };

  var ROLE = document.body.dataset.role === "host" ? "host" : "kid";
  var IS_HOST = ROLE === "host";

  var el = {};
  [
    "gate", "gateForm", "displayName", "roomCode", "hostKey", "gateError", "joinBtn",
    "shareLink", "copyBtn",
    "stage", "roomLabel", "peopleCount", "meetStatus",
    "shareStage", "shareVideo", "shareTag", "people", "audioSink",
    "micBtn", "micIcon", "micText", "handBtn", "handText",
    "shareBtn", "shareText", "muteAllBtn", "clearHandsBtn", "hangupBtn",
    "panel", "panelBtn", "panelClose", "panelList", "panelHint",
    "fallback", "fallbackMsg", "fallbackBack"
  ].forEach(function (id) {
    el[id] = document.getElementById(id);
  });

  var room = null;
  var handUp = false;
  var hands = {};       // identity -> true
  var speaking = {};    // identity -> true
  var audioEls = {};    // trackSid -> { node, id }
  var hostKey = "";     // بيتحفظ في الذاكرة بس بعد نجاح الدخول
  var currentCode = "";

  var micWanted = false;   // اللي المستخدم طالبه دلوقتي
  var micBusy = false;     // فيه أمر ميك شغال لسه
  var shareBusy = false;
  var audioUnlockArmed = false;

  /* ---------- مساعدات ---------- */

  function cleanRoom(value) {
    return String(value || "")
      .trim().toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function show(section) {
    el.gate.hidden = section !== "gate";
    el.stage.hidden = section !== "stage";
    el.fallback.hidden = section !== "fallback";
    if (el.panel && section !== "stage") {
      el.panel.hidden = true;
      document.body.classList.remove("panel-open");
    }
  }

  function showError(msg) {
    el.gateError.textContent = msg;
    el.gateError.hidden = false;
  }

  var statusTimer = null;
  function say(msg, keep) {
    window.clearTimeout(statusTimer);
    if (!msg) { el.meetStatus.hidden = true; return; }
    el.meetStatus.textContent = msg;
    el.meetStatus.hidden = false;
    if (!keep) {
      statusTimer = window.setTimeout(function () { el.meetStatus.hidden = true; }, 3500);
    }
  }

  function fail(msg) {
    el.fallbackMsg.textContent = msg;
    show("fallback");
    resetJoinBtn();
  }

  function resetJoinBtn() {
    el.joinBtn.disabled = false;
    el.joinBtn.textContent = IS_HOST ? "🚀 ابدأ السيشن" : "🎤 ادخل السيشن";
  }

  function readError(err) {
    if (!err) return { code: "", text: "" };
    var code = err.message || err.reason || String(err);

    if (/NotAllowed|Permission denied/i.test(code)) {
      return { code: code, text: "لازم تسمح للموقع باستخدام الميكروفون من المتصفح 🎤" };
    }
    if (/NotFound|Requested device|no audio/i.test(code)) {
      return { code: code, text: "مفيش ميكروفون على الجهاز. وصّل سماعة وجرّب تاني." };
    }
    if (/token|expired|invalid|unauthorized|401|403/i.test(code)) {
      return { code: code, text: "الجلسة انتهت. اقفل الصفحة وافتحها تاني." };
    }
    if (/quota|limit|exceeded/i.test(code)) {
      return { code: code, text: "دقايق السيشنز خلصت الشهر ده." };
    }
    if (/network|connect|timeout|websocket/i.test(code)) {
      return { code: code, text: "النت فصل أو بطيء. اتأكد من الاتصال وجرّب تاني." };
    }
    return { code: code, text: "" };
  }

  function initial(name) {
    var n = String(name || "").trim();
    return n ? n[0] : "؟";
  }

  var FACE_COLORS = ["#6a4fb6", "#23a89f", "#ef5f7c", "#f6a92c", "#7dc242", "#332d6e"];
  function faceColor(key) {
    var sum = 0;
    for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    return FACE_COLORS[sum % FACE_COLORS.length];
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* المدرّس هويته بتبدأ بـ host- (السيرفر هو اللي بيحددها) */
  function isHostIdentity(id) {
    return String(id || "").indexOf("host-") === 0;
  }

  /* ---------- تحميل المكتبة ---------- */
  var loader = null;
  function loadLiveKit() {
    if (window.LivekitClient) return Promise.resolve();
    if (loader) return loader;
    loader = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = LK_SRC;
      s.async = true;
      s.onload = function () { window.LivekitClient ? resolve() : reject(new Error("missing")); };
      s.onerror = function () { reject(new Error("blocked")); };
      document.head.appendChild(s);
    });
    return loader;
  }
  loadLiveKit().catch(function () { /* هنتعامل معاها وقت الدخول */ });

  /* ============================================================
     رسم المشاركين
     ============================================================ */
  function everyone() {
    if (!room) return [];
    var list = [room.localParticipant];
    room.remoteParticipants.forEach(function (p) { list.push(p); });
    return list;
  }

  function micLiveFor(p) {
    /* بنسأل نفس المصدر اللي الزرار بيسأله، عشان الكارت والزرار
       ما يقولوش كلامين مختلفين */
    if (room && p === room.localParticipant) {
      var mine = micPub();
      return !!mine && !mine.isMuted;
    }
    var pubs = p.audioTrackPublications;
    if (!pubs || !pubs.size) return false;
    var live = false;
    pubs.forEach(function (pub) { if (!pub.isMuted) live = true; });
    return live;
  }

  function canSpeak(p) {
    var perm = p.permissions;
    if (!perm) return true;
    return perm.canPublish !== false;
  }

  /* ============================================================
     الرسم بالتحديث الجزئي — مش إعادة بناء

     الأول كنا بنعيد بناء كل كروت المشاركين (innerHTML) في كل
     حدث، و ActiveSpeakersChanged بيضرب كذا مرة في الثانية.
     يعني كل ما حد يتكلم، المتصفح يهد ويبني الصفحة من أول
     وجديد — ده كان بيوقف الـ main thread، وساعتها الصورة
     المشاركة بتلخبط والصوت بيتقطّع.

     دلوقتي بنبني الكروت مرة واحدة بس لما العدد يتغيّر،
     وبعد كده بنغيّر الكلاس أو النص المتغيّر بس.
     ============================================================ */
  var peopleNodes = {};   // identity -> { card, hand, state, ... }
  var peopleKey = "";     // بصمة الحاضرين — لو اتغيّرت يبقى نعيد البناء

  function stateText(p) {
    if (!canSpeak(p)) return "🚫 ممنوع الكلام";
    return micLiveFor(p) ? "🎤 الميك مفتوح" : "🔇 ساكت";
  }

  function buildPeople(list) {
    var frag = document.createDocumentFragment();
    peopleNodes = {};

    list.forEach(function (p) {
      var id = p.identity;
      var name = p.name || id || "ضيف";
      var isMe = p === room.localParticipant;

      var card = document.createElement("div");
      card.className = "person";

      var hand = document.createElement("span");
      hand.className = "person-hand";
      hand.title = "رافع إيده";
      hand.textContent = "✋";
      hand.hidden = true;

      var face = document.createElement("div");
      face.className = "person-face";
      face.style.background = faceColor(name + id);
      face.textContent = initial(name);

      var nameEl = document.createElement("div");
      nameEl.className = "person-name";
      nameEl.textContent = name + (isMe ? " (أنت)" : "");

      var state = document.createElement("div");
      state.className = "person-state";

      card.appendChild(hand);
      card.appendChild(face);
      card.appendChild(nameEl);
      card.appendChild(state);

      if (isHostIdentity(id)) {
        var badge = document.createElement("span");
        badge.className = "person-badge";
        badge.textContent = "المدرّس";
        card.appendChild(badge);
      }

      frag.appendChild(card);
      peopleNodes[id] = { card: card, hand: hand, state: state };
    });

    el.people.textContent = "";
    el.people.appendChild(frag);
  }

  function renderPeople() {
    if (!room) return;
    var list = everyone();

    var key = list.map(function (p) { return p.identity; }).join("|");
    if (key !== peopleKey) {
      peopleKey = key;
      buildPeople(list);
      setCount(list.length);
    }

    list.forEach(function (p) {
      var node = peopleNodes[p.identity];
      if (!node) return;

      var talking = !!speaking[p.identity];
      if (node.talking !== talking) {
        node.talking = talking;
        node.card.classList.toggle("is-talking", talking);
      }

      var raised = !!hands[p.identity];
      if (node.raised !== raised) {
        node.raised = raised;
        node.hand.hidden = !raised;
      }

      var txt = stateText(p);
      if (node.txt !== txt) {
        node.txt = txt;
        node.state.textContent = txt;
      }
    });

    syncButtons();
    if (IS_HOST) renderPanel();
  }

  /* الأحداث بتيجي ورا بعض بسرعة — بنجمّعها في رسمة واحدة
     مع إطار الشاشة بدل ما نرسم عشر مرات في الثانية */
  var renderQueued = false;
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    window.requestAnimationFrame(function () {
      renderQueued = false;
      renderPeople();
    });
  }

  /* نبضة أمان كل ثانية: بتراجع الشكل على الحقيقة.
     الرسم بقى تحديث جزئي، يعني لو مفيش حاجة اتغيّرت النبضة دي
     ما بتلمسش الصفحة أصلاً — تقريباً ببلاش. وفايدتها إن أي حدث
     يضيع من الشبكة ما يسيبناش بزرار غلط على طول. */
  var beat = null;
  function startHeartbeat() {
    if (beat) return;
    beat = window.setInterval(function () {
      if (room) renderPeople();
    }, 1000);
  }
  function stopHeartbeat() {
    if (!beat) return;
    window.clearInterval(beat);
    beat = null;
  }

  function setCount(n) {
    if (!n) { el.peopleCount.hidden = true; return; }
    el.peopleCount.textContent = n === 1 ? "👤 لوحدك دلوقتي" : "👥 " + n + " في السيشن";
    el.peopleCount.hidden = false;
  }

  /* ============================================================
     حالة الأزرار

     كل زرار بيفتكر آخر شكل اتعرض عليه. كده نقدر نناديه في كل
     إطار من غير ما نلمس الصفحة من غير لزوم، والأهم إنه بيتصلّح
     لوحده لو أي حدث ضاع أو جه بالمقلوب.
     ============================================================ */
  var micShown = null;
  var handShown = null;
  var shareShown = null;

  function setMic(on) {
    on = !!on;
    if (micShown === on) return;
    micShown = on;
    el.micBtn.setAttribute("aria-pressed", on ? "true" : "false");
    el.micBtn.classList.toggle("is-live", on);
    el.micIcon.textContent = on ? "🎤" : "🔇";
    el.micText.textContent = on ? "اقفل الميك" : "افتح الميك";
  }

  function setHand(up) {
    up = !!up;
    handUp = up;
    if (!el.handBtn || handShown === up) return;
    handShown = up;
    el.handBtn.setAttribute("aria-pressed", up ? "true" : "false");
    el.handBtn.classList.toggle("is-live", up);
    el.handText.textContent = up ? "نزّل إيدك" : "ارفع إيدك";
  }

  function setShare(on) {
    on = !!on;
    if (!el.shareBtn || shareShown === on) return;
    shareShown = on;
    el.shareBtn.setAttribute("aria-pressed", on ? "true" : "false");
    el.shareBtn.classList.toggle("is-live", on);
    el.shareText.textContent = on ? "وقّف المشاركة" : "شارك شاشتك";
  }

  /* ============================================================
     مزامنة الأزرار مع الحقيقة

     ده المصدر الوحيد لشكل الأزرار. بنسأل التراك المنشور نفسه:
     إنت مكتوم ولا لأ؟ وبنرسم على أساس رده — مش على أساس إن
     حدث معيّن وصلنا.

     الاستثناء الوحيد: وإحنا لسه بننفّذ أمر المستخدم، بنعرض
     اللي هو طالبه عشان الضغطة تبان لحظية.
     ============================================================ */
  function syncButtons() {
    if (!room) return;

    if (micBusy) {
      setMic(micWanted);
    } else {
      var pub = micPub();
      micWanted = !!pub && !pub.isMuted;
      setMic(micWanted);
    }

    if (el.shareBtn && !shareBusy) {
      setShare(!!room.localParticipant.isScreenShareEnabled);
    }
  }

  /* ============================================================
     لوحة تحكم المدرّس
     ============================================================ */
  var panelKey = "";

  function renderPanel() {
    if (!el.panelList || !room) return;

    /* اللوحة مقفولة؟ مفيش داعي نتعب المتصفح. وبنصفّر البصمة
       عشان تتبني من جديد أول ما تتفتح */
    if (el.panel && el.panel.hidden) { panelKey = ""; return; }

    var kids = [];
    room.remoteParticipants.forEach(function (p) {
      if (!isHostIdentity(p.identity)) kids.push(p);
    });

    /* اللي رافع إيده يطلع فوق، عشان المدرّس يشوفه على طول */
    kids.sort(function (a, b) {
      return (hands[b.identity] ? 1 : 0) - (hands[a.identity] ? 1 : 0);
    });

    /* بنعيد بناء صفوف اللوحة بس لما حاجة فيها تتغيّر فعلاً،
       مش كل ما حد يتكلم — كده الأزرار ما بتختفيش تحت إيد
       المدرّس وهو بيضغط */
    var key = kids.map(function (p) {
      return p.identity +
        (hands[p.identity] ? "1" : "0") +
        (micLiveFor(p) ? "1" : "0") +
        (canSpeak(p) ? "1" : "0");
    }).join("|");
    if (key === panelKey) return;
    panelKey = key;

    el.panelHint.textContent = kids.length
      ? kids.length + " طفل في السيشن"
      : "لسه محدش دخل.";

    el.panelList.innerHTML = kids.map(function (p) {
      var id = p.identity;
      var live = micLiveFor(p);
      var allowed = canSpeak(p);

      return (
        '<div class="panel-row' + (hands[id] ? " has-hand" : "") + '">' +
        '<div class="panel-who">' +
        (hands[id] ? '<span class="panel-hand">✋</span>' : "") +
        '<b>' + esc(p.name || id) + "</b>" +
        '<small>' + (!allowed ? "🚫 ممنوع" : live ? "🎤 بيتكلم" : "🔇 ساكت") + "</small>" +
        "</div>" +
        '<div class="panel-acts">' +
        (live
          ? '<button class="pbtn pbtn-mute" data-act="mute" data-id="' + esc(id) + '">🔇 اكتمه</button>'
          : "") +
        (allowed
          ? '<button class="pbtn" data-act="lock-mic" data-id="' + esc(id) + '">🚫 امنع الكلام</button>'
          : '<button class="pbtn pbtn-ok" data-act="unlock-mic" data-id="' + esc(id) + '">✅ اسمحله</button>') +
        '<button class="pbtn pbtn-kick" data-act="remove" data-id="' + esc(id) + '">👋 اطرده</button>' +
        "</div></div>"
      );
    }).join("");
  }

  /* كل أوامر التنظيم بتروح للسيرفر ومعاها مفتاح المدرّس —
     السيرفر هو اللي بيتأكد، مش الصفحة */
  function admin(action, identity) {
    return fetch("/api/room-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: action,
        identity: identity || "",
        code: currentCode,
        hostKey: hostKey,
      }),
    })
      .then(function (res) {
        return res.json().then(function (d) {
          if (!res.ok || !d.ok) throw new Error(d.error || "الأمر مانفذش");
          return d;
        });
      })
      .catch(function (err) {
        say(err.message || "الأمر مانفذش", true);
        throw err;
      });
  }

  function broadcast(msg) {
    if (!room) return;
    try {
      room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(msg)),
        { reliable: true }
      );
    } catch (_) {
      /* الرسايل دي كماليات — السيشن بتكمل من غيرها */
    }
  }

  /* ============================================================
     الدخول
     ============================================================ */
  function joinRoom(info, code) {
    var LK = window.LivekitClient;
    var E = LK.RoomEvent;

    /* ============================================================
       إعدادات الأداء — الافتراضيات مضبوطة لمكالمات فيديو عامة،
       وإحنا سيشن صوت لأطفال على نت مصري، فمحتاجين حاجة أخف وأسرع:

       adaptiveStream: false
         بيقيس حجم عنصر الفيديو ويطلب جودة على أساسه. عنصر
         المشاركة عندنا دايماً بملء الشاشة، والقياس ده كان
         بيأخّر ظهور الصورة. قفلناه = الصورة بتيجي كاملة فوراً.

       dynacast: false
         بيوقف الطبقات اللي محدش مشترك فيها. مالناش طبقات
         أصلاً، فهو مجرد رسايل زيادة على الشبكة.

       audioPreset: ٣٢ كيلوبت
         أوضح من الـ speech الجاهز (٢٤)، ولسه أخف بكتير من
         إعداد الموسيقى. الفرق مش محسوس على أي شبكة.

       dtx: false
         الـ DTX بيوقف الإرسال في السكوت، فبيقص أول حرف لما
         الطفل يبدأ يتكلم. قفلناه عشان الكلام يوصل كامل.

       red: true
         بيبعت الصوت مكرر، فلو ضاعت باكتة الصوت ميتقطعش.

       degradationPreference: maintain-framerate
         الأهم هنا. كان maintain-resolution — يعني وقت الزحمة
         المتصفح كان بيتمسك بالوضوح ويرمي الإطارات، فالشاشة
         بتبقى شرايح واقفة ومتأخرة. دلوقتي الحركة هي الأولوية
         والوضوح هو اللي بينزل شوية وقت الحاجة.

       videoCodec: vp8
         أخف كوديك في الترميز اللحظي ومدعوم على كل جهاز. VP9
         و AV1 بيضغطوا أحسن بس بياكلوا معالج المدرّس ويأخّروا.
       ============================================================ */
    if (LK.setLogLevel) { try { LK.setLogLevel("error"); } catch (_) {} }

    room = new LK.Room({
      adaptiveStream: false,
      dynacast: false,
      stopLocalTrackOnUnpublish: false,
      webAudioMix: false,

      audioCaptureDefaults: MIC_CONSTRAINTS,

      publishDefaults: {
        audioPreset: VOICE_PRESET,
        dtx: false,
        red: true,
        simulcast: false,
        stopMicTrackOnMute: false,
        videoCodec: "vp8",
        backupCodec: false,
        screenShareEncoding: SCREEN_ENCODING,
        degradationPreference: "maintain-framerate",
      },
    });

    room
      .on(E.Connected, function () {
        say("");
        renderPeople();
        startHeartbeat();
      })
      .on(E.ParticipantConnected, scheduleRender)
      .on(E.ParticipantDisconnected, function (p) {
        delete hands[p.identity];
        delete speaking[p.identity];
        Object.keys(audioEls).forEach(function (sid) {
          if (audioEls[sid].id === p.identity) {
            audioEls[sid].node.remove();
            delete audioEls[sid];
          }
        });
        renderPeople();
      })

      .on(E.TrackSubscribed, function (track, pub, participant) {
        if (track.kind === "audio") {
          var node = track.attach();
          node.autoplay = true;
          node.playsInline = true;
          node.setAttribute("playsinline", "");
          audioEls[pub.trackSid] = { node: node, id: participant.identity };
          el.audioSink.appendChild(node);
          var playing = node.play && node.play();
          if (playing && playing.catch) {
            playing.catch(function () {
              say("اضغط على أي حتة في الصفحة عشان الصوت يشتغل 🔊", true);
              armAudioUnlock();
            });
          }
        } else if (isScreenPub(pub)) {
          /* مهم: نظهر المكان الأول وبعدين نربط الفيديو.
             لو ربطنا وهو متخفي، العنصر مقاسه صفر والمتصفح
             بيأجّل الرسم — وده كان سبب تأخير المشاركة */
          showShare(participant.name || participant.identity);
          /* المتصفح بيحب يخزّن كام إطار قبل ما يعرض عشان
             النعومة — وده كان بيزوّد التأخير. بنقوله اعرض
             أول ما يوصل */
          zeroDelay(track);
          track.attach(el.shareVideo);
          var vp = el.shareVideo.play && el.shareVideo.play();
          if (vp && vp.catch) vp.catch(function () {});
        }
        scheduleRender();
      })
      .on(E.TrackUnsubscribed, function (track, pub) {
        if (track.kind === "audio") {
          track.detach().forEach(function (n) { n.remove(); });
          delete audioEls[pub.trackSid];
        } else if (isScreenPub(pub)) {
          /* بنفصل التراك عن عنصر الفيديو بس — العنصر نفسه لازم
             يفضل مكانه في الصفحة. قبل كده كان بيتشال من الصفحة
             خالص، فأول مشاركة كانت بتشتغل والمشاركة اللي بعدها
             ما بتظهرش أبداً */
          track.detach(el.shareVideo);
          hideShare();
        }
        scheduleRender();
      })

      .on(E.ActiveSpeakersChanged, function (speakers) {
        speaking = {};
        (speakers || []).forEach(function (p) { speaking[p.identity] = true; });
        scheduleRender();
      })

      /* مش بنغيّر شكل الزرار من هنا — بنطلب رسمة، والرسمة
         بتقرا الحقيقة من التراك نفسه */
      .on(E.TrackMuted, scheduleRender)
      .on(E.TrackUnmuted, scheduleRender)
      .on(E.ParticipantPermissionsChanged, scheduleRender)

      .on(E.Reconnecting, function () { say("النت اتهزهز… بنرجّعك 🔄", true); })
      .on(E.Reconnected, function () { say("رجعنا ✅"); })
      .on(E.AudioPlaybackStatusChanged, function () {
        if (room && !room.canPlaybackAudio) {
          say("اضغط على أي حتة في الصفحة عشان الصوت يشتغل 🔊", true);
          armAudioUnlock();
        }
      })

      .on(E.LocalTrackPublished, function (pub) {
        if (isScreenPub(pub) && pub.kind === "video") {
          showShare(null);
          if (pub.track) {
            /* contentHint = motion بيقول للترميز: الأهم إن الحركة
               تبقى ناعمة ولحظية. كان detail، وده كان بيخلي المتصفح
               يتمسك بالوضوح ويأخّر الإطارات */
            var mst = pub.track.mediaStreamTrack;
            if (mst) try { mst.contentHint = "motion"; } catch (_) {}
            pub.track.attach(el.shareVideo);
          }
        }
        scheduleRender();
      })
      .on(E.LocalTrackUnpublished, function (pub) {
        if (isScreenPub(pub)) {
          if (pub.kind === "video") {
            if (pub.track) try { pub.track.detach(el.shareVideo); } catch (_) {}
            hideShare();
          }
        }
        scheduleRender();
      })

      .on(E.DataReceived, function (payload, participant) {
        var msg;
        try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch (_) { return; }
        if (!msg || !participant) return;

        if (msg.kind === "hand") {
          if (msg.up) hands[participant.identity] = true;
          else delete hands[participant.identity];
          renderPeople();
          if (IS_HOST && msg.up) say("✋ " + (participant.name || "طفل") + " رافع إيده");
        } else if (msg.kind === "hands-clear" && isHostIdentity(participant.identity)) {
          // المدرّس بس اللي بينزّل الإيدين
          hands = {};
          setHand(false);
          renderPeople();
        } else if (msg.kind === "muted-you" && isHostIdentity(participant.identity)) {
          if (msg.to === room.localParticipant.identity) say("المدرّس كتم الميك بتاعك 🔇", true);
        }
      })

      .on(E.Disconnected, function () {
        cleanup();
        show("gate");
      });

    el.roomLabel.textContent = code;
    show("stage");
    say("بنوصّلك بالسيشن…", true);

    /* بنسخّن الاتصال بالسيرفر (DNS + TLS) قبل ما نطلب الدخول
       بثانية — من غير ما نستنى رده */
    if (room.prepareConnection) {
      try { room.prepareConnection(info.url, info.token); } catch (_) {}
    }

    return room
      .connect(info.url, info.token, { autoSubscribe: true, maxRetries: 3 })
      .then(function () {
        return primeMic();
      });
  }

  /* playoutDelayHint = 0 — اعرض الإطار أول ما يوصل من غير
     تخزين احتياطي. (متطبقش على الصوت: هناك المخزون بيتظبط
     لوحده حسب الشبكة وأحسن نسيبه) */
  function zeroDelay(track) {
    if (track && typeof track.setPlayoutDelay === "function") {
      try { track.setPlayoutDelay(0); } catch (_) {}
    }
  }

  /* لو المتصفح رفض تشغيل الصوت لوحده، أول لمسة في الصفحة
     بتفكّه — بدل ما الطفل يفضل قاعد من غير صوت */
  function armAudioUnlock() {
    if (audioUnlockArmed) return;
    audioUnlockArmed = true;

    function unlock() {
      document.removeEventListener("click", unlock, true);
      document.removeEventListener("touchend", unlock, true);
      audioUnlockArmed = false;
      if (!room) return;
      var p = room.startAudio();
      if (p && p.then) p.then(function () { say(""); }, function () {});
    }
    document.addEventListener("click", unlock, true);
    document.addEventListener("touchend", unlock, true);
  }

  /* ============================================================
     طلب الميك — لازم يبقى جوه اللمسة نفسها

     دي كانت مشكلة الموبايل. المتصفح (خصوصاً سفاري على الآيفون)
     بيسمح بطلب الميكروفون بس وإحنا لسه "جوه" لمسة المستخدم.
     إحنا كنا بنطلبه بعد ما نجيب التوكن من السيرفر ونتصل بالأوضة
     — يعني بعد ثانية أو اتنين من اللمسة، والمتصفح ساعتها بيرفض
     الطلب من غير حتى ما يسأل صاحب الجهاز.

     عشان كده بنطلب الميك دلوقتي حالاً في نفس لحظة اللمسة،
     والتوكن بيتجاب في نفس الوقت بالتوازي. الاتنين بيخلصوا مع
     بعض، فمفيش وقت ضايع كمان.

     مهم: الدالة دي لازم تتنادى من غير أي await قبلها، وإلا
     المتصفح بيعتبر اللمسة "خلصت".
     ============================================================ */
  var micTrackPromise = null;

  /* بنستخدم getUserMedia الأصلي بتاع المتصفح مباشرةً — مش
     مكتبة LiveKit — عشان الطلب يخرج في نفس اللحظة من غير ما
     يستنى المكتبة تتحمّل. ده اللي بيخلي المتصفح يقبل يسأل. */
  function requestMicTrack() {
    var md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) {
      return Promise.reject(new Error("NotFoundError: no mediaDevices"));
    }

    return md
      .getUserMedia({ audio: MIC_CONSTRAINTS, video: false })
      .catch(function (err) {
        /* بعض أجهزة الموبايل مش بتعرف تنفّذ القيود بالظبط.
           لو دي المشكلة، الإذن يبقى اتاخد خلاص، فنعيد الطلب
           بأبسط شكل من غير ما يتسأل تاني */
        var raw = String((err && (err.name || err.message)) || "");
        if (/Overconstrained|Constraint|NotSupported|TypeError/i.test(raw)) {
          return md.getUserMedia({ audio: true, video: false });
        }
        throw err;
      })
      .then(function (stream) {
        var msTrack = stream.getAudioTracks()[0];
        if (!msTrack) throw new Error("NotFoundError: no audio track");
        return msTrack;
      });
  }

  /* بنجهّز التراك ونحطه في الجيب — بيستنانا لحد ما الاتصال يخلص */
  function grabMicEarly() {
    micTrackPromise = requestMicTrack();
    micTrackPromise.catch(function () { /* هنتعامل معاها في primeMic */ });
  }

  /* لو الدخول فشل، منسيبش الميك مفتوح والنور الأحمر شغال */
  function releaseEarlyMic() {
    if (!micTrackPromise) return;
    var pending = micTrackPromise;
    micTrackPromise = null;
    pending.then(function (msTrack) {
      try { msTrack.stop(); } catch (_) {}
    }, function () {});
  }

  function publishMic(msTrack, muted) {
    var LK = window.LivekitClient;
    var track = new LK.LocalAudioTrack(msTrack, MIC_CONSTRAINTS, false);
    track.source = LK.Track.Source.Microphone;

    var step = muted ? track.mute() : Promise.resolve();
    return Promise.resolve(step).then(function () {
      return room.localParticipant.publishTrack(track, {
        source: LK.Track.Source.Microphone,
        audioPreset: VOICE_PRESET,
        dtx: false,
        red: true,
        stopMicTrackOnMute: false,
      });
    });
  }

  /* ============================================================
     تجهيز الميك من أول لحظة

     بننشر التراك **مكتوم** من ساعة الدخول، فضغطة "افتح الميك"
     بعد كده بتبقى مجرد unmute — لحظية.
     ============================================================ */
  function primeMic() {
    var pending = micTrackPromise || requestMicTrack();
    micTrackPromise = null;

    return pending
      // بنكتمه قبل النشر عشان محدش يسمع حاجة بالغلط
      .then(function (track) { return publishMic(track, true); })
      .then(function () { scheduleRender(); })
      .catch(function (err) {
        /* مفيش ميك أو الإذن مرفوض — السيشن بتكمل سماع عادي،
           والزرار لسه بيشتغل: أول ما يدوس هنطلب الإذن تاني */
        scheduleRender();
        micHelp(err);
      });
  }

  /* رسايل واضحة لكل سبب — الطفل لازم يعرف يعمل إيه بالظبط */
  function micHelp(err) {
    var raw = String((err && (err.name || err.message)) || "");

    if (/NotAllowed|Permission|Denied|SecurityError/i.test(raw)) {
      say("الميكروفون مقفول. دوس على 🔒 جنب عنوان الموقع فوق ← الأذونات ← اسمح للميكروفون، وبعدين دوس على زرار الميك تاني 🎤", true);
    } else if (/NotFound|DevicesNotFound|no audio/i.test(raw)) {
      say("مش لاقيين ميكروفون على الجهاز.", true);
    } else if (/NotReadable|TrackStart|Busy|AbortError/i.test(raw)) {
      say("الميكروفون مشغول في تطبيق تاني (مكالمة أو واتساب). اقفله وجرّب تاني.", true);
    } else if (!window.isSecureContext) {
      say("لازم تفتح الموقع بـ https عشان الميكروفون يشتغل.", true);
    } else {
      var info = readError(err);
      say(info.text || "مقدرناش نفتح الميك. دوس على الزرار تاني.", true);
    }
  }

  /* ============================================================
     طلب الإذن من جديد بضغطة الزرار

     لو الإذن اترفض وقت الدخول، الطفل لسه يقدر يدوس على زرار
     الميك — وساعتها بنطلب الإذن **جوه اللمسة** على طول، من غير
     أي انتظار قبلها، عشان المتصفح يقبل يسأل.
     ============================================================ */
  function grabMicNow() {
    if (micBusy || !room) return;
    micBusy = true;

    /* الطلب أول سطر خالص — أي انتظار قبله بيضيّع اللمسة */
    var pending = requestMicTrack();

    setMic(true);
    say("بنطلب إذن الميكروفون — اقبل من فوق 🎤", true);

    pending
      .then(function (track) {
        return publishMic(track, false);
      })
      .then(function () {
        say("الميك اشتغل 🎤");
      })
      .catch(function (err) {
        micWanted = false;
        micHelp(err);
      })
      .then(function () {
        micBusy = false;
        scheduleRender();
      });
  }

  /* ============================================================
     فتح وقفل الميك — لحظي

     الضغطة بقت بتغيّر شكل الزرار في نفس اللحظة (من غير ما
     تستنى السيرفر)، وبعدين بننفّذ الأمر على التراك المنشور
     نفسه بـ mute/unmute المباشرة.

     كمان لو الطفل ضغط كذا مرة ورا بعض، مش هنبعت كذا أمر —
     بنستنى اللي شغال يخلص وننفّذ آخر حاجة طلبها بس.
     ============================================================ */
  function micPub() {
    if (!room) return null;
    var found = null;
    room.localParticipant.audioTrackPublications.forEach(function (pub) {
      if (!found && pub.source === "microphone") found = pub;
    });
    return found;
  }

  var micTries = 0;

  function applyMic() {
    if (micBusy || !room) return;

    var pub = micPub();
    var live = !!pub && !pub.isMuted;
    /* خلص الأمر — بنرسم حالاً مش في الإطار الجاي، عشان الكارت
       والزرار يتغيّروا مع بعض في نفس اللحظة */
    if (live === micWanted) { micTries = 0; renderPeople(); return; }

    /* لو الأمر مشي والحالة ما اتغيّرتش، مش هنفضل نعيد للأبد —
       بنسيب المزامنة ترجّع الزرار على الحقيقة */
    if (++micTries > 3) {
      micTries = 0;
      say("الميك مش راضي يستجيب. جرّب اخرج وادخل تاني.", true);
      scheduleRender();
      return;
    }

    micBusy = true;
    var op = pub
      ? (micWanted ? pub.unmute() : pub.mute())
      : room.localParticipant.setMicrophoneEnabled(micWanted, MIC_CONSTRAINTS);

    Promise.resolve(op)
      .catch(function (err) {
        /* الأمر فشل — بنقول السبب وبس. الشكل مش بنلمسه هنا،
           المزامنة هي اللي هتقرا الحقيقة وترسمها */
        var info = readError(err);
        micTries = 99;
        say(info.text || "مش قادرين نفتح الميك.", true);
      })
      .then(function () {
        micBusy = false;
        if (micTries === 99) { micTries = 0; scheduleRender(); return; }
        applyMic();   // لو المستخدم غيّر رأيه وإحنا شغالين
      });
  }

  function isScreenPub(pub) {
    if (!pub) return false;
    return pub.source === "screen_share" || pub.source === "screen_share_audio";
  }

  function showShare(who) {
    el.shareStage.hidden = false;
    el.stage.classList.add("is-sharing");
    el.shareTag.textContent = who ? "🖥️ " + who + " بيشارك شاشته" : "🖥️ انت بتشارك شاشتك";
  }

  function hideShare() {
    el.shareStage.hidden = true;
    el.shareVideo.srcObject = null;
    el.stage.classList.remove("is-sharing");
  }

  function cleanup() {
    Object.keys(audioEls).forEach(function (k) { audioEls[k].node.remove(); });
    audioEls = {};
    hands = {};
    speaking = {};
    handUp = false;
    micWanted = false;
    micBusy = false;
    micTries = 0;
    shareBusy = false;
    peopleNodes = {};
    peopleKey = "";
    panelKey = "";
    micShown = null;
    handShown = null;
    shareShown = null;
    stopHeartbeat();
    el.people.textContent = "";
    if (el.panelList) el.panelList.innerHTML = "";
    hideShare();
    setCount(0);
    setHand(false);
    setShare(false);
    setMic(false);
    say("");

    releaseEarlyMic();

    if (room) {
      try { room.disconnect(); } catch (_) { /* خلاص اتقفل */ }
      room = null;
    }
    resetJoinBtn();
  }

  /* ============================================================
     الأزرار المشتركة
     ============================================================ */
  el.micBtn.addEventListener("click", function () {
    if (!room) return;
    micTries = 0;
    micWanted = !micWanted;
    setMic(micWanted);   // الشكل بيتغيّر دلوقتي حالاً

    /* مفيش تراك ميك أصلاً؟ يبقى الإذن اترفض أو فشل وقت الدخول.
       بنطلبه دلوقتي من جوه اللمسة — لازم يبقى أول سطر، من غير
       أي انتظار قبله، وإلا الموبايل هيرفض من غير ما يسأل */
    if (micWanted && !micPub()) {
      grabMicNow();
      return;
    }
    applyMic();
  });

  el.hangupBtn.addEventListener("click", function () {
    if (room) room.disconnect();
    else show("gate");
  });

  el.fallbackBack.addEventListener("click", function () { show("gate"); });

  /* ---------- خاص بالطالب ---------- */
  if (el.handBtn) {
    el.handBtn.addEventListener("click", function () {
      if (!room) return;
      setHand(!handUp);
      var me = room.localParticipant.identity;
      if (handUp) hands[me] = true; else delete hands[me];
      broadcast({ kind: "hand", up: handUp });
      renderPeople();
      say(handUp ? "إيدك مرفوعة ✋ استنى المدرّس ينده عليك" : "نزّلت إيدك");
    });
  }

  /* ---------- خاص بالمدرّس ---------- */
  if (IS_HOST) {
    el.shareBtn.addEventListener("click", function () {
      if (!room || shareBusy) return;
      var LK = window.LivekitClient;
      var lp = room.localParticipant;
      var want = !lp.isScreenShareEnabled;

      shareBusy = true;
      if (want) say("اختار الشاشة من النافذة اللي فتحت 🖥️", true);

      lp.setScreenShareEnabled(
        want,
        want ? SCREEN_CAPTURE : undefined,
        want
          ? {
              videoEncoding: SCREEN_ENCODING,
              screenShareEncoding: SCREEN_ENCODING,
              simulcast: false,
              videoCodec: "vp8",
              backupCodec: false,
              degradationPreference: "maintain-framerate",
              /* لو المدرّس بيشغّل فيديو أو أغنية، الصوت ده
                 بيتبعت على تراك لوحده بجودة أعلى من الكلام */
              audioPreset: LK.AudioPresets.music,
            }
          : undefined
      )
        .then(function () { say(""); })
        .catch(function (err) {
          var raw = String((err && (err.message || err.name)) || "");
          /* المدرّس قفل نافذة الاختيار — ده مش خطأ، نسكت */
          if (/NotAllowed|Permission denied|AbortError|dismissed|cancel/i.test(raw)) {
            say("");
            return;
          }
          var info = readError(err);
          say(info.text || "مشاركة الشاشة مش شغالة على الجهاز ده.", true);
        })
        .then(function () { shareBusy = false; scheduleRender(); });
    });

    el.muteAllBtn.addEventListener("click", function () {
      admin("mute-all").then(function () {
        say("كتمت كل الأطفال 🤫");
        window.setTimeout(renderPeople, 400);
      }).catch(function () {});
    });

    el.clearHandsBtn.addEventListener("click", function () {
      hands = {};
      broadcast({ kind: "hands-clear" });
      renderPeople();
      say("نزّلت كل الإيدين 🧹");
    });

    function togglePanel(open) {
      el.panel.hidden = !open;
      document.body.classList.toggle("panel-open", open);
      if (open) { panelKey = ""; renderPanel(); }
    }
    el.panelBtn.addEventListener("click", function () {
      togglePanel(el.panel.hidden);
    });
    el.panelClose.addEventListener("click", function () { togglePanel(false); });

    el.panelList.addEventListener("click", function (evt) {
      var btn = evt.target.closest(".pbtn");
      if (!btn) return;
      var act = btn.dataset.act;
      var id = btn.dataset.id;

      btn.disabled = true;
      admin(act, id)
        .then(function () {
          if (act === "mute") {
            broadcast({ kind: "muted-you", to: id });
            say("كتمته 🔇");
          } else if (act === "lock-mic") say("منعته من الكلام 🚫");
          else if (act === "unlock-mic") say("سمحتله يتكلم ✅");
          else if (act === "remove") say("طردته من السيشن 👋");
          window.setTimeout(renderPeople, 400);
        })
        .catch(function () {})
        .then(function () { btn.disabled = false; });
    });

    /* لينك الأطفال.
       مهم: Cloudflare Pages بيشيل .html من الروابط، يعني الصفحة
       دي ممكن تبقى /host مش /host.html — عشان كده بناخد المجلد
       ونركّب عليه بدل ما نستبدل اسم الملف */
    function kidsLink() {
      var code = cleanRoom(el.roomCode.value) || DEFAULT_ROOM;
      var dir = location.pathname.replace(/[^/]*$/, "");
      return location.origin + dir + "meeting.html?room=" + encodeURIComponent(code);
    }
    function refreshShareLink() { el.shareLink.value = kidsLink(); }
    el.roomCode.addEventListener("input", refreshShareLink);
    refreshShareLink();

    function copyLabel(text, ms) {
      el.copyBtn.textContent = text;
      window.setTimeout(function () {
        el.copyBtn.textContent = "📋 انسخ لينك الأطفال";
      }, ms);
    }
    el.copyBtn.addEventListener("click", function () {
      el.shareLink.focus();
      el.shareLink.select();
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(kidsLink()).then(
          function () { copyLabel("✅ اتنسخ!", 1800); },
          function () { copyLabel("انسخه بإيدك (Ctrl+C)", 2600); }
        );
      } else {
        copyLabel("انسخه بإيدك (Ctrl+C)", 2600);
      }
    });
  }

  /* ============================================================
     إرسال الفورم
     ============================================================ */
  el.gateForm.addEventListener("submit", function (evt) {
    evt.preventDefault();
    el.gateError.hidden = true;

    var name = el.displayName.value.trim();
    var code = cleanRoom(el.roomCode.value);
    var key = el.hostKey ? el.hostKey.value.trim() : "";

    if (name.length < 2) {
      showError("اكتب اسمك الأول 🙂");
      el.displayName.focus();
      return;
    }
    if (!code) {
      showError("اكتب كود السيشن (حروف وأرقام إنجليزي).");
      el.roomCode.focus();
      return;
    }
    if (IS_HOST && !key) {
      showError("اكتب مفتاح المدرّس.");
      el.hostKey.focus();
      return;
    }

    try { localStorage.setItem(NAME_KEY, name); } catch (_) { /* عادي */ }

    el.joinBtn.disabled = true;
    el.joinBtn.textContent = "بنجهّز السيشن…";

    /* أول حاجة خالص: نطلب الميكروفون وإحنا لسه جوه اللمسة.
       أي كود بينتظر قبل كده (تحميل مكتبة، طلب سيرفر) بيخلي
       الموبايل يعتبر اللمسة خلصت ويرفض الطلب من غير ما يسأل.
       الطلب ده بيمشي بالتوازي مع جلب التوكن، فمفيش وقت ضايع */
    grabMicEarly();

    loadLiveKit()
      .then(function () {
        return fetch("/api/meeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: code,
            name: name,
            role: ROLE,
            hostKey: key,
          }),
        });
      })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data.ok) {
            var e = new Error(data.error || "مقدرناش نجهّز السيشن");
            e.fromApi = true;
            throw e;
          }
          return data;
        });
      })
      .then(function (info) {
        hostKey = IS_HOST ? key : "";
        currentCode = code;
        return joinRoom(info, code);
      })
      .catch(function (err) {
        if (err && err.fromApi) { fail(err.message); cleanup(); return; }
        var info = readError(err);
        if (info.code === "blocked" || info.code === "missing") {
          fail("النت عندك بيمنع تحميل خدمة السيشن. جرّب شبكة تانية.");
        } else if (info.text) {
          fail(info.text);
        } else {
          fail("مقدرناش نفتح السيشن." + (info.code ? " التفاصيل: " + info.code : " حاول تاني."));
        }
        cleanup();
      });
  });

  /* ---------- التجهيز الأولي ---------- */
  (function init() {
    var params = new URLSearchParams(location.search);
    el.roomCode.value = cleanRoom(params.get("room")) || DEFAULT_ROOM;

    try {
      var saved = localStorage.getItem(NAME_KEY);
      if (saved) el.displayName.value = saved;
    } catch (_) { /* عادي */ }

    resetJoinBtn();

    (el.displayName.value ? el.roomCode : el.displayName).focus();
  })();
})();
