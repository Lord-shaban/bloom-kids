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
  var audioEls = {};    // identity -> <audio>
  var hostKey = "";     // بيتحفظ في الذاكرة بس بعد نجاح الدخول
  var currentCode = "";

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
    if (room && p === room.localParticipant) return !!p.isMicrophoneEnabled;
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

  function renderPeople() {
    if (!room) return;
    var list = everyone();

    el.people.innerHTML = list.map(function (p) {
      var id = p.identity;
      var isMe = p === room.localParticipant;
      var name = p.name || id || "ضيف";
      var teacher = isHostIdentity(id);

      return (
        '<div class="person' + (speaking[id] ? " is-talking" : "") + '">' +
        (hands[id] ? '<span class="person-hand" title="رافع إيده">✋</span>' : "") +
        '<div class="person-face" style="background:' + faceColor(name + id) + '">' +
        esc(initial(name)) + "</div>" +
        '<div class="person-name">' + esc(name) + (isMe ? " (أنت)" : "") + "</div>" +
        '<div class="person-state">' +
        (!canSpeak(p) ? "🚫 ممنوع الكلام" : micLiveFor(p) ? "🎤 الميك مفتوح" : "🔇 ساكت") +
        "</div>" +
        (teacher ? '<span class="person-badge">المدرّس</span>' : "") +
        "</div>"
      );
    }).join("");

    setCount(list.length);
    if (IS_HOST) renderPanel();
  }

  function setCount(n) {
    if (!n) { el.peopleCount.hidden = true; return; }
    el.peopleCount.textContent = n === 1 ? "👤 لوحدك دلوقتي" : "👥 " + n + " في السيشن";
    el.peopleCount.hidden = false;
  }

  /* ---------- حالة الأزرار ---------- */
  function setMic(on) {
    el.micBtn.setAttribute("aria-pressed", on ? "true" : "false");
    el.micIcon.textContent = on ? "🎤" : "🔇";
    el.micText.textContent = on ? "اقفل الميك" : "افتح الميك";
  }

  function setHand(up) {
    handUp = up;
    if (!el.handBtn) return;
    el.handBtn.setAttribute("aria-pressed", up ? "true" : "false");
    el.handText.textContent = up ? "نزّل إيدك" : "ارفع إيدك";
  }

  function setShare(on) {
    if (!el.shareBtn) return;
    el.shareBtn.setAttribute("aria-pressed", on ? "true" : "false");
    el.shareText.textContent = on ? "وقّف المشاركة" : "شارك شاشتك";
  }

  /* ============================================================
     لوحة تحكم المدرّس
     ============================================================ */
  function renderPanel() {
    if (!el.panelList || !room) return;

    var kids = [];
    room.remoteParticipants.forEach(function (p) {
      if (!isHostIdentity(p.identity)) kids.push(p);
    });

    /* اللي رافع إيده يطلع فوق، عشان المدرّس يشوفه على طول */
    kids.sort(function (a, b) {
      return (hands[b.identity] ? 1 : 0) - (hands[a.identity] ? 1 : 0);
    });

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

    room = new LK.Room({ adaptiveStream: true, dynacast: true });

    room
      .on(E.Connected, function () {
        say("");
        setMic(false);
        renderPeople();
      })
      .on(E.ParticipantConnected, renderPeople)
      .on(E.ParticipantDisconnected, function (p) {
        delete hands[p.identity];
        delete speaking[p.identity];
        var node = audioEls[p.identity];
        if (node) { node.remove(); delete audioEls[p.identity]; }
        renderPeople();
      })

      .on(E.TrackSubscribed, function (track, pub, participant) {
        if (track.kind === "audio") {
          var node = track.attach();
          node.autoplay = true;
          node.playsInline = true;
          audioEls[participant.identity] = node;
          el.audioSink.appendChild(node);
          var playing = node.play && node.play();
          if (playing && playing.catch) {
            playing.catch(function () {
              say("اضغط على أي حتة في الصفحة عشان الصوت يشتغل 🔊", true);
            });
          }
        } else if (isScreenPub(pub)) {
          track.attach(el.shareVideo);
          el.shareStage.hidden = false;
          el.stage.classList.add("is-sharing");
          el.shareTag.textContent =
            "🖥️ " + (participant.name || participant.identity) + " بيشارك شاشته";
        }
        renderPeople();
      })
      .on(E.TrackUnsubscribed, function (track, pub, participant) {
        track.detach().forEach(function (n) { n.remove(); });
        if (track.kind === "audio") delete audioEls[participant.identity];
        else if (isScreenPub(pub)) hideShare();
        renderPeople();
      })

      .on(E.ActiveSpeakersChanged, function (speakers) {
        speaking = {};
        (speakers || []).forEach(function (p) { speaking[p.identity] = true; });
        renderPeople();
      })

      .on(E.TrackMuted, renderPeople)
      .on(E.TrackUnmuted, renderPeople)
      .on(E.ParticipantPermissionsChanged, renderPeople)

      .on(E.LocalTrackPublished, function (pub) {
        if (isScreenPub(pub)) {
          setShare(true);
          el.shareTag.textContent = "🖥️ انت بتشارك شاشتك";
          el.shareStage.hidden = false;
          el.stage.classList.add("is-sharing");
          if (pub.track) pub.track.attach(el.shareVideo);
        } else {
          setMic(true);
        }
        renderPeople();
      })
      .on(E.LocalTrackUnpublished, function (pub) {
        if (isScreenPub(pub)) { setShare(false); hideShare(); }
        else setMic(false);
        renderPeople();
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

    return room.connect(info.url, info.token).then(function () {
      return room.localParticipant.setMicrophoneEnabled(false);
    });
  }

  function isScreenPub(pub) {
    if (!pub) return false;
    return pub.source === "screen_share" || pub.source === "screen_share_audio";
  }

  function hideShare() {
    el.shareStage.hidden = true;
    el.shareVideo.srcObject = null;
    el.stage.classList.remove("is-sharing");
  }

  function cleanup() {
    Object.keys(audioEls).forEach(function (k) { audioEls[k].remove(); });
    audioEls = {};
    hands = {};
    speaking = {};
    handUp = false;
    el.people.innerHTML = "";
    if (el.panelList) el.panelList.innerHTML = "";
    hideShare();
    setCount(0);
    setHand(false);
    setShare(false);
    say("");

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
    var lp = room.localParticipant;
    lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled).catch(function (err) {
      var info = readError(err);
      say(info.text || "مش قادرين نفتح الميك.", true);
    });
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
      if (!room) return;
      var lp = room.localParticipant;
      lp.setScreenShareEnabled(!lp.isScreenShareEnabled).catch(function (err) {
        var info = readError(err);
        say(info.text || "مشاركة الشاشة مش شغالة على الجهاز ده.", true);
      });
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
      if (open) renderPanel();
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
