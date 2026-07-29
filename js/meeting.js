/* ============================================================
   Bloom Kids — سيشن مباشرة (Daily.co)

   ليه Daily مش Jitsi؟ لأن جيتسي العام بيطلب تسجيل دخول بجوجل
   من أول واحد يفتح الأوضة، والتسجيل ده مش بيشتغل جوه iframe.
   Daily مفيش فيه تسجيل خالص: السيرفر بتاعنا بينشئ الأوضة
   ويطلع توكن، والطفل بيدخل على طول.

   الواجهة كلها بتاعتنا (call object مش prebuilt)، عشان:
     • عربي بالكامل ومن اليمين للشمال
     • كروت مشاركين كبيرة، اللي بيتكلم إطاره بيولّع أخضر
     • رفع الإيد بيبان كشارة صفراء على كارت الطفل
     • مفيش كاميرا ولا شات ولا أي زرار زيادة
   ============================================================ */
(function () {
  "use strict";

  var DAILY_SRC = "https://unpkg.com/@daily-co/daily-js";
  var DEFAULT_ROOM = "bloom-1";
  var NAME_KEY = "bloomkids_meet_name";

  var el = {};
  [
    "gate", "gateForm", "displayName", "roomCode", "gateError", "joinBtn",
    "hostBox", "hostKey", "shareLink", "copyBtn",
    "stage", "roomLabel", "peopleCount", "meetStatus",
    "shareStage", "shareVideo", "shareTag", "people", "audioSink",
    "micBtn", "micIcon", "micText", "handBtn", "handText",
    "shareBtn", "shareText", "hangupBtn",
    "fallback", "fallbackMsg", "fallbackBack"
  ].forEach(function (id) {
    el[id] = document.getElementById(id);
  });

  var call = null;        // Daily call object
  var handUp = false;
  var hands = {};         // من رافع إيده: { sessionId: true }
  var talkingId = null;
  var audioEls = {};      // عنصر <audio> لكل مشارك

  /* ---------- مساعدات ---------- */

  function cleanRoom(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function show(section) {
    el.gate.hidden = section !== "gate";
    el.stage.hidden = section !== "stage";
    el.fallback.hidden = section !== "fallback";
  }

  function showError(msg) {
    el.gateError.textContent = msg;
    el.gateError.hidden = false;
  }

  var statusTimer = null;
  function say(msg, keep) {
    window.clearTimeout(statusTimer);
    if (!msg) {
      el.meetStatus.hidden = true;
      return;
    }
    el.meetStatus.textContent = msg;
    el.meetStatus.hidden = false;
    if (!keep) {
      statusTimer = window.setTimeout(function () {
        el.meetStatus.hidden = true;
      }, 3500);
    }
  }

  function fail(msg) {
    el.fallbackMsg.textContent = msg;
    show("fallback");
    el.joinBtn.disabled = false;
    el.joinBtn.textContent = "🎤 ادخل السيشن";
  }

  /* Daily بيقول إن p.audio و p.screen مهملين والمفروض نقرا من
     tracks — بنعمل كده، ومسيبين الخاصية القديمة كاحتياطي */
  function trackOn(p, kind) {
    var t = p && p.tracks && p.tracks[kind];
    if (t && t.state) return t.state === "playable";
    return kind === "audio" ? !!(p && p.audio) : !!(p && p.screen);
  }
  function micOn(p) { return trackOn(p, "audio"); }
  function isSharing(p) { return trackOn(p, "screenVideo"); }

  /* أول حرف من الاسم — بيتحط في الدايرة الملونة */
  function initial(name) {
    var n = String(name || "").trim();
    return n ? n[0] : "؟";
  }

  /* لون ثابت لكل اسم، عشان الطفل يعرف نفسه من اللون كل مرة */
  var FACE_COLORS = ["#6a4fb6", "#23a89f", "#ef5f7c", "#f6a92c", "#7dc242", "#332d6e"];
  function faceColor(key) {
    var sum = 0;
    for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    return FACE_COLORS[sum % FACE_COLORS.length];
  }

  /* ---------- تحميل مكتبة Daily ---------- */
  var loader = null;
  function loadDaily() {
    if (window.Daily) return Promise.resolve();
    if (loader) return loader;

    loader = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = DAILY_SRC;
      s.crossOrigin = "anonymous";
      s.async = true;
      s.onload = function () {
        window.Daily ? resolve() : reject(new Error("missing"));
      };
      s.onerror = function () {
        reject(new Error("blocked"));
      };
      document.head.appendChild(s);
    });
    return loader;
  }

  /* بنبدأ التحميل من دلوقتي عشان لما يضغط "ادخل" يكون جاهز */
  loadDaily().catch(function () {
    /* هنتعامل مع الغلطة وقت الدخول */
  });

  /* ============================================================
     رسم المشاركين
     ============================================================ */
  function renderPeople() {
    if (!call) return;

    var all = call.participants();
    var ids = Object.keys(all);

    el.people.innerHTML = ids
      .map(function (key) {
        var p = all[key];
        var id = p.session_id;
        var isMe = key === "local";
        var name = p.user_name || (isMe ? "أنا" : "ضيف");
        var talking = id === talkingId;

        return (
          '<div class="person' + (talking ? " is-talking" : "") + '">' +
          (hands[id] ? '<span class="person-hand" title="رافع إيده">✋</span>' : "") +
          '<div class="person-face" style="background:' + faceColor(name + id) + '">' +
          initial(name) +
          "</div>" +
          '<div class="person-name">' + escapeHtml(name) + (isMe ? " (أنت)" : "") + "</div>" +
          '<div class="person-state">' + (micOn(p) ? "🎤 الميك مفتوح" : "🔇 ساكت") + "</div>" +
          (p.owner ? '<span class="person-badge">المدرّس</span>' : "") +
          "</div>"
        );
      })
      .join("");

    setCount(ids.length);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function setCount(n) {
    if (!n) {
      el.peopleCount.hidden = true;
      return;
    }
    el.peopleCount.textContent = n === 1 ? "👤 لوحدك دلوقتي" : "👥 " + n + " في السيشن";
    el.peopleCount.hidden = false;
  }

  /* ---------- الصوت ----------
     لازم نعمل عنصر <audio> لكل مشارك عشان صوته يطلع.
     Daily مش بيعمل ده لوحده في وضع call object. */
  function attachAudio(p) {
    if (!p || p.local) return;
    var id = p.session_id;
    var track = p.tracks && p.tracks.audio;
    var ready = track && track.state === "playable" && track.persistentTrack;

    if (!ready) {
      if (audioEls[id]) {
        audioEls[id].remove();
        delete audioEls[id];
      }
      return;
    }

    var node = audioEls[id];
    if (!node) {
      node = document.createElement("audio");
      node.autoplay = true;
      node.playsInline = true;
      audioEls[id] = node;
      el.audioSink.appendChild(node);
    }

    var stream = new MediaStream([track.persistentTrack]);
    node.srcObject = stream;
    var playing = node.play();
    if (playing && playing.catch) {
      playing.catch(function () {
        say("اضغط على أي حتة في الصفحة عشان الصوت يشتغل 🔊", true);
      });
    }
  }

  function refreshAudio() {
    if (!call) return;
    var all = call.participants();
    Object.keys(all).forEach(function (k) {
      attachAudio(all[k]);
    });
  }

  /* ---------- مشاركة الشاشة ---------- */
  function refreshScreen() {
    if (!call) return;
    var all = call.participants();
    var sharer = null;

    Object.keys(all).forEach(function (k) {
      var p = all[k];
      var t = p.tracks && p.tracks.screenVideo;
      if (t && t.state === "playable" && t.persistentTrack) sharer = p;
    });

    if (!sharer) {
      el.shareStage.hidden = true;
      el.shareVideo.srcObject = null;
      el.stage.classList.remove("is-sharing");
      return;
    }

    el.shareStage.hidden = false;
    el.stage.classList.add("is-sharing");
    el.shareTag.textContent = "🖥️ " + (sharer.user_name || "ضيف") + " بيشارك شاشته";
    el.shareVideo.srcObject = new MediaStream([sharer.tracks.screenVideo.persistentTrack]);
    var playing = el.shareVideo.play();
    if (playing && playing.catch) playing.catch(function () {});
  }

  /* ---------- حالة الأزرار ---------- */
  function setMic(on) {
    el.micBtn.setAttribute("aria-pressed", on ? "true" : "false");
    el.micIcon.textContent = on ? "🎤" : "🔇";
    el.micText.textContent = on ? "اقفل الميك" : "افتح الميك";
  }

  function setHand(up) {
    handUp = up;
    el.handBtn.setAttribute("aria-pressed", up ? "true" : "false");
    el.handText.textContent = up ? "نزّل إيدك" : "ارفع إيدك";
  }

  function setShare(on) {
    el.shareBtn.setAttribute("aria-pressed", on ? "true" : "false");
    el.shareText.textContent = on ? "وقّف المشاركة" : "شارك شاشتك";
  }

  /* ============================================================
     الدخول
     ============================================================ */
  function joinRoom(info, name, code) {
    call = window.Daily.createCallObject({
      subscribeToTracksAutomatically: true,
      dailyConfig: { useDevicePreferenceCookies: true },
    });

    call
      .on("joined-meeting", function () {
        say("");
        setMic(false);
        renderPeople();
        refreshAudio();
      })
      .on("participant-joined", function (e) {
        renderPeople();
        attachAudio(e && e.participant);
        refreshScreen();
      })
      .on("participant-updated", function (e) {
        renderPeople();
        attachAudio(e && e.participant);
        refreshScreen();
        if (e && e.participant && e.participant.local) {
          setMic(micOn(e.participant));
          setShare(isSharing(e.participant));
        }
      })
      .on("participant-left", function (e) {
        var id = e && e.participant && e.participant.session_id;
        if (id) {
          delete hands[id];
          if (audioEls[id]) {
            audioEls[id].remove();
            delete audioEls[id];
          }
        }
        renderPeople();
        refreshScreen();
      })
      .on("active-speaker-change", function (e) {
        talkingId = e && e.activeSpeaker ? e.activeSpeaker.peerId : null;
        renderPeople();
      })
      .on("app-message", function (e) {
        // رسالة رفع إيد من مشارك تاني
        var d = e && e.data;
        if (!d || d.kind !== "hand") return;
        if (d.up) hands[e.fromId] = true;
        else delete hands[e.fromId];
        renderPeople();
      })
      .on("error", function (e) {
        fail(
          (e && e.errorMsg) ||
            "حصلت مشكلة في الاتصال. اتأكد من النت وحاول تاني."
        );
        cleanup();
      })
      .on("left-meeting", function () {
        cleanup();
        show("gate");
      });

    el.roomLabel.textContent = code;
    show("stage");
    say("بنوصّلك بالسيشن…", true);

    return call.join({
      url: info.url,
      token: info.token,
      userName: name,
      startVideoOff: true,
      startAudioOff: true,
    });
  }

  function cleanup() {
    Object.keys(audioEls).forEach(function (k) {
      audioEls[k].remove();
    });
    audioEls = {};
    hands = {};
    talkingId = null;
    handUp = false;
    el.people.innerHTML = "";
    el.shareStage.hidden = true;
    el.shareVideo.srcObject = null;
    el.stage.classList.remove("is-sharing");
    setCount(0);
    say("");

    if (call) {
      try {
        call.destroy();
      } catch (_) {
        /* خلاص اتقفل */
      }
      call = null;
    }
    el.joinBtn.disabled = false;
    el.joinBtn.textContent = "🎤 ادخل السيشن";
  }

  /* ---------- الأزرار ---------- */
  el.micBtn.addEventListener("click", function () {
    if (!call) return;
    call.setLocalAudio(!call.localAudio());
  });

  el.handBtn.addEventListener("click", function () {
    if (!call) return;
    setHand(!handUp);

    var me = call.participants().local;
    if (me) {
      if (handUp) hands[me.session_id] = true;
      else delete hands[me.session_id];
    }
    try {
      call.sendAppMessage({ kind: "hand", up: handUp }, "*");
    } catch (_) {
      /* الرسالة مش ضرورية للسيشن نفسها */
    }
    renderPeople();
    say(handUp ? "إيدك مرفوعة ✋ استنى المدرّس ينده عليك" : "نزّلت إيدك");
  });

  el.shareBtn.addEventListener("click", function () {
    if (!call) return;
    var me = call.participants().local;
    if (me && isSharing(me)) call.stopScreenShare();
    else {
      try {
        call.startScreenShare();
      } catch (_) {
        say("مشاركة الشاشة مش شغالة على الجهاز ده.");
      }
    }
  });

  el.hangupBtn.addEventListener("click", function () {
    if (call) call.leave();
    else show("gate");
  });

  /* ---------- ركن المدرّس ---------- */
  function roomUrls() {
    var code = cleanRoom(el.roomCode.value) || DEFAULT_ROOM;
    return {
      code: code,
      kids: location.origin + location.pathname + "?room=" + encodeURIComponent(code),
    };
  }

  function refreshShareLink() {
    el.shareLink.value = roomUrls().kids;
  }
  el.roomCode.addEventListener("input", refreshShareLink);

  function copyLabel(text, ms) {
    el.copyBtn.textContent = text;
    window.setTimeout(function () {
      el.copyBtn.textContent = "📋 انسخ اللينك";
    }, ms);
  }

  el.copyBtn.addEventListener("click", function () {
    el.shareLink.focus();
    el.shareLink.select();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(roomUrls().kids).then(
        function () { copyLabel("✅ اتنسخ!", 1800); },
        function () { copyLabel("انسخه بإيدك (Ctrl+C)", 2600); }
      );
    } else {
      copyLabel("انسخه بإيدك (Ctrl+C)", 2600);
    }
  });

  /* ---------- إرسال الفورم ---------- */
  el.gateForm.addEventListener("submit", function (evt) {
    evt.preventDefault();
    el.gateError.hidden = true;

    var name = el.displayName.value.trim();
    var code = cleanRoom(el.roomCode.value);
    var hostKey = el.hostKey.value.trim();

    if (name.length < 2) {
      showError("اكتب اسمك الأول عشان زمايلك يعرفوك 🙂");
      el.displayName.focus();
      return;
    }
    if (!code) {
      showError("اكتب كود السيشن (حروف وأرقام إنجليزي).");
      el.roomCode.focus();
      return;
    }

    try {
      localStorage.setItem(NAME_KEY, name);
    } catch (_) {
      /* الستوريدج مقفول — مش مشكلة */
    }

    el.joinBtn.disabled = true;
    el.joinBtn.textContent = "بنجهّز السيشن…";

    loadDaily()
      .then(function () {
        return fetch("/api/meeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: code,
            name: name,
            host: !!hostKey,
            hostKey: hostKey,
          }),
        });
      })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data.ok) {
            throw new Error(data.error || "مقدرناش نجهّز السيشن");
          }
          return data;
        });
      })
      .then(function (info) {
        return joinRoom(info, name, code);
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : "";
        if (msg === "blocked" || msg === "missing") {
          msg = "النت عندك بيمنع تحميل خدمة السيشن. جرّب شبكة تانية.";
        }
        fail(msg || "مقدرناش نفتح السيشن. حاول تاني.");
        cleanup();
      });
  });

  el.fallbackBack.addEventListener("click", function () {
    show("gate");
  });

  /* ---------- التجهيز الأولي ---------- */
  (function init() {
    var params = new URLSearchParams(location.search);
    el.roomCode.value = cleanRoom(params.get("room")) || DEFAULT_ROOM;

    try {
      var saved = localStorage.getItem(NAME_KEY);
      if (saved) el.displayName.value = saved;
    } catch (_) {
      /* عادي */
    }

    refreshShareLink();
    if (params.get("room")) el.hostBox.open = false;

    (el.displayName.value ? el.roomCode : el.displayName).focus();
  })();
})();
