/* ============================================================
   Bloom Kids — سيشن مباشرة (LiveKit)

   ليه LiveKit؟
     • Jitsi العام بيطلب تسجيل دخول بجوجل من أول واحد يفتح
       الأوضة، والتسجيل ده مش بيشتغل جوه iframe.
     • Daily بيرفض أي مكالمة لحد ما تضيف كارت في الحساب.
     • LiveKit شغال من غير كارت خالص، وسيرفره SFU يعني الصوت
       أنضف والجهاز بيتعب أقل من الاتصال المباشر.

   الواجهة كلها بتاعتنا عشان تبقى عربي وبسيطة للأطفال:
   كروت كبيرة، اللي بيتكلم إطاره أخضر، ورفع الإيد شارة صفراء.
   ============================================================ */
(function () {
  "use strict";

  var LK_SRC = "https://cdn.jsdelivr.net/npm/livekit-client@2.21.0/dist/livekit-client.umd.min.js";
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

  var room = null;
  var handUp = false;
  var hands = {};        // identity -> true
  var speaking = {};     // identity -> true
  var audioEls = {};     // identity -> <audio>
  var isHost = false;

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

  /* بنقرا سبب الغلطة من كذا شكل، عشان ميظهرش للمستخدم رسالة
     عامة متنفعش نتصرف بيها */
  function readError(err) {
    if (!err) return { code: "", text: "" };
    var code = err.message || err.reason || err.errorMsg || String(err);

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
      return { code: code, text: "دقايق السيشنز خلصت الشهر ده. كلّم المسؤول." };
    }
    if (/network|connect|timeout|ws|websocket/i.test(code)) {
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- تحميل مكتبة LiveKit ---------- */
  var loader = null;
  function loadLiveKit() {
    if (window.LivekitClient) return Promise.resolve();
    if (loader) return loader;

    loader = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = LK_SRC;
      s.async = true;
      s.onload = function () {
        window.LivekitClient ? resolve() : reject(new Error("missing"));
      };
      s.onerror = function () {
        reject(new Error("blocked"));
      };
      document.head.appendChild(s);
    });
    return loader;
  }

  /* بنبدأ التحميل من دلوقتي عشان الدخول يبقى فوري */
  loadLiveKit().catch(function () {
    /* هنتعامل مع الغلطة وقت الدخول */
  });

  /* ============================================================
     رسم المشاركين
     ============================================================ */
  function everyone() {
    if (!room) return [];
    var list = [room.localParticipant];
    room.remoteParticipants.forEach(function (p) {
      list.push(p);
    });
    return list;
  }

  function renderPeople() {
    if (!room) return;

    var list = everyone();
    el.people.innerHTML = list
      .map(function (p) {
        var id = p.identity;
        var isMe = p === room.localParticipant;
        var name = p.name || id || "ضيف";
        var talking = !!speaking[id];
        var micLive = isMe ? !!room.localParticipant.isMicrophoneEnabled : !isMicMuted(p);

        return (
          '<div class="person' + (talking ? " is-talking" : "") + '">' +
          (hands[id] ? '<span class="person-hand" title="رافع إيده">✋</span>' : "") +
          '<div class="person-face" style="background:' + faceColor(name + id) + '">' +
          escapeHtml(initial(name)) +
          "</div>" +
          '<div class="person-name">' + escapeHtml(name) + (isMe ? " (أنت)" : "") + "</div>" +
          '<div class="person-state">' + (micLive ? "🎤 الميك مفتوح" : "🔇 ساكت") + "</div>" +
          "</div>"
        );
      })
      .join("");

    setCount(list.length);
  }

  /* المشارك البعيد: بنشوف نشر الصوت بتاعه مكتوم ولا لأ */
  function isMicMuted(p) {
    var pubs = p.audioTrackPublications;
    if (!pubs || !pubs.size) return true;
    var muted = true;
    pubs.forEach(function (pub) {
      if (!pub.isMuted) muted = false;
    });
    return muted;
  }

  function setCount(n) {
    if (!n) {
      el.peopleCount.hidden = true;
      return;
    }
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
    var LK = window.LivekitClient;
    var RoomEvent = LK.RoomEvent;

    room = new LK.Room({
      adaptiveStream: true,
      dynacast: true,
      // مفيش كاميرا خالص، فمش محتاجين أي إعدادات فيديو
      publishDefaults: { simulcast: false },
    });

    room
      .on(RoomEvent.Connected, function () {
        say("");
        setMic(false);
        renderPeople();
      })
      .on(RoomEvent.ParticipantConnected, renderPeople)
      .on(RoomEvent.ParticipantDisconnected, function (p) {
        delete hands[p.identity];
        delete speaking[p.identity];
        var node = audioEls[p.identity];
        if (node) {
          node.remove();
          delete audioEls[p.identity];
        }
        renderPeople();
      })

      /* الصوت: لازم نربط كل تراك بعنصر <audio> عشان يتسمع */
      .on(RoomEvent.TrackSubscribed, function (track, pub, participant) {
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
      .on(RoomEvent.TrackUnsubscribed, function (track, pub, participant) {
        track.detach().forEach(function (n) {
          n.remove();
        });
        if (track.kind === "audio") delete audioEls[participant.identity];
        else if (isScreenPub(pub)) hideShare();
        renderPeople();
      })

      .on(RoomEvent.ActiveSpeakersChanged, function (speakers) {
        speaking = {};
        (speakers || []).forEach(function (p) {
          speaking[p.identity] = true;
        });
        renderPeople();
      })

      .on(RoomEvent.TrackMuted, renderPeople)
      .on(RoomEvent.TrackUnmuted, renderPeople)

      .on(RoomEvent.LocalTrackPublished, function (pub) {
        if (isScreenPub(pub)) {
          setShare(true);
          // بنوري نفسنا إن المشاركة شغالة، من غير ما نعرض شاشتنا لنفسنا
          el.shareTag.textContent = "🖥️ انت بتشارك شاشتك";
          el.shareStage.hidden = false;
          el.stage.classList.add("is-sharing");
          if (pub.track) pub.track.attach(el.shareVideo);
        } else {
          setMic(true);
        }
        renderPeople();
      })
      .on(RoomEvent.LocalTrackUnpublished, function (pub) {
        if (isScreenPub(pub)) {
          setShare(false);
          hideShare();
        } else {
          setMic(false);
        }
        renderPeople();
      })

      .on(RoomEvent.DataReceived, function (payload, participant) {
        var msg;
        try {
          msg = JSON.parse(new TextDecoder().decode(payload));
        } catch (_) {
          return;
        }
        if (!msg || msg.kind !== "hand" || !participant) return;
        if (msg.up) hands[participant.identity] = true;
        else delete hands[participant.identity];
        renderPeople();
      })

      .on(RoomEvent.Disconnected, function () {
        cleanup();
        show("gate");
      });

    el.roomLabel.textContent = code;
    isHost = !!info.isHost;
    show("stage");
    say("بنوصّلك بالسيشن…", true);

    return room.connect(info.url, info.token).then(function () {
      // بيدخل ساكت — يفتح الميك لما يحب
      return room.localParticipant.setMicrophoneEnabled(false);
    });
  }

  function isScreenPub(pub) {
    if (!pub) return false;
    var src = pub.source;
    return src === "screen_share" || src === "screen_share_audio" ||
      (window.LivekitClient && src === window.LivekitClient.Track.Source.ScreenShare);
  }

  function hideShare() {
    el.shareStage.hidden = true;
    el.shareVideo.srcObject = null;
    el.stage.classList.remove("is-sharing");
  }

  function cleanup() {
    Object.keys(audioEls).forEach(function (k) {
      audioEls[k].remove();
    });
    audioEls = {};
    hands = {};
    speaking = {};
    handUp = false;
    isHost = false;
    el.people.innerHTML = "";
    hideShare();
    setCount(0);
    setHand(false);
    setShare(false);
    say("");

    if (room) {
      try {
        room.disconnect();
      } catch (_) {
        /* خلاص اتقفل */
      }
      room = null;
    }
    el.joinBtn.disabled = false;
    el.joinBtn.textContent = "🎤 ادخل السيشن";
  }

  /* ---------- الأزرار ---------- */
  el.micBtn.addEventListener("click", function () {
    if (!room) return;
    var lp = room.localParticipant;
    lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled).catch(function (err) {
      var info = readError(err);
      say(info.text || "مش قادرين نفتح الميك.", true);
    });
  });

  el.handBtn.addEventListener("click", function () {
    if (!room) return;
    setHand(!handUp);

    var me = room.localParticipant.identity;
    if (handUp) hands[me] = true;
    else delete hands[me];

    try {
      room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ kind: "hand", up: handUp })),
        { reliable: true }
      );
    } catch (_) {
      /* الرسالة مش ضرورية للسيشن نفسها */
    }
    renderPeople();
    say(handUp ? "إيدك مرفوعة ✋ استنى المدرّس ينده عليك" : "نزّلت إيدك");
  });

  el.shareBtn.addEventListener("click", function () {
    if (!room) return;
    var lp = room.localParticipant;
    lp.setScreenShareEnabled(!lp.isScreenShareEnabled).catch(function (err) {
      var info = readError(err);
      say(info.text || "مشاركة الشاشة مش شغالة على الجهاز ده.", true);
    });
  });

  el.hangupBtn.addEventListener("click", function () {
    if (room) room.disconnect();
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

    loadLiveKit()
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
            /* رسايل السيرفر بتاعنا عربي ومفهومة أصلاً — بنعلّمها
               عشان تتعرض زي ما هي من غير ما نلفّها في كلام تاني */
            var e = new Error(data.error || "مقدرناش نجهّز السيشن");
            e.fromApi = true;
            throw e;
          }
          return data;
        });
      })
      .then(function (info) {
        return joinRoom(info, name, code);
      })
      .catch(function (err) {
        if (err && err.fromApi) {
          fail(err.message);
          cleanup();
          return;
        }

        var info = readError(err);
        if (info.code === "blocked" || info.code === "missing") {
          fail("النت عندك بيمنع تحميل خدمة السيشن. جرّب شبكة تانية.");
        } else if (info.text) {
          fail(info.text);
        } else {
          fail(
            "مقدرناش نفتح السيشن." +
              (info.code ? " التفاصيل: " + info.code : " حاول تاني.")
          );
        }
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
