/* ============================================================
   Bloom Kids — سيشن مباشرة

   الاجتماع نفسه شغّال بـ Jitsi Meet (مفتوح المصدر ومجاني) جوه
   الصفحة، بس شريط جيتسي متخفي بالكامل وإحنا بنرسم أزرارنا:
     • ٤ أزرار كبيرة بالعربي بدل شريط فيه أيقونات كتير إنجليزي
     • مفيش كاميرا خالص، ومفيش شات
     • ألوان واضحة للطفل: الميك أحمر يعني مقفول وأخضر يعني مفتوح

   ملحوظة: أول واحد يفتح الأوضة (المُدرّس) لازم يسجّل دخول عند
   جيتسي مرة واحدة. الأطفال بيدخلوا باللينك على طول من غير أي
   تسجيل — ودي كمان حماية كويسة، لأن مفيش سيشن بتبدأ من غيرك.
   ============================================================ */
(function () {
  "use strict";

  var JITSI_DOMAIN = "meet.jit.si";
  var API_SRC = "https://meet.jit.si/external_api.js";

  /* البادئة دي بتمنع إننا نقع بالصدفة في أوضة حد تاني على نفس
     السيرفر العام — اسم الأوضة الحقيقي بيبقى BloomKids-<الكود> */
  var ROOM_PREFIX = "BloomKids-";
  var DEFAULT_ROOM = "bloom-1";
  var NAME_KEY = "bloomkids_meet_name";

  var el = {
    gate: document.getElementById("gate"),
    form: document.getElementById("gateForm"),
    name: document.getElementById("displayName"),
    room: document.getElementById("roomCode"),
    error: document.getElementById("gateError"),
    joinBtn: document.getElementById("joinBtn"),

    stage: document.getElementById("stage"),
    roomLabel: document.getElementById("roomLabel"),
    peopleCount: document.getElementById("peopleCount"),
    status: document.getElementById("meetStatus"),
    frame: document.getElementById("meet"),

    micBtn: document.getElementById("micBtn"),
    micIcon: document.getElementById("micIcon"),
    micText: document.getElementById("micText"),
    handBtn: document.getElementById("handBtn"),
    handText: document.getElementById("handText"),
    shareBtn: document.getElementById("shareBtn"),
    shareText: document.getElementById("shareText"),
    hangupBtn: document.getElementById("hangupBtn"),

    hostBox: document.getElementById("hostBox"),
    hostBtn: document.getElementById("hostBtn"),
    shareLink: document.getElementById("shareLink"),
    copyBtn: document.getElementById("copyBtn"),

    fallback: document.getElementById("fallback"),
    fallbackMsg: document.getElementById("fallbackMsg"),
    fallbackLink: document.getElementById("fallbackLink"),
    fallbackBack: document.getElementById("fallbackBack"),
  };

  var api = null;
  var handUp = false;

  /* ---------- مساعدات ---------- */

  /* الكود بيتحوّل لحروف وأرقام وشرطات بس — اسم أوضة فيه مسافات
     أو رموز بيتكسر في اللينك */
  function cleanRoom(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function showError(msg) {
    el.error.textContent = msg;
    el.error.hidden = false;
  }

  function show(section) {
    el.gate.hidden = section !== "gate";
    el.stage.hidden = section !== "stage";
    el.fallback.hidden = section !== "fallback";
  }

  var statusTimer = null;
  function say(msg, keep) {
    window.clearTimeout(statusTimer);
    if (!msg) {
      el.status.hidden = true;
      return;
    }
    el.status.textContent = msg;
    el.status.hidden = false;
    if (!keep) {
      statusTimer = window.setTimeout(function () {
        el.status.hidden = true;
      }, 3500);
    }
  }

  /* ---------- تحميل مكتبة جيتسي عند الحاجة ---------- */
  var apiLoader = null;
  function loadJitsi() {
    if (window.JitsiMeetExternalAPI) return Promise.resolve();
    if (apiLoader) return apiLoader;

    apiLoader = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = API_SRC;
      s.async = true;
      s.onload = function () {
        if (window.JitsiMeetExternalAPI) resolve();
        else reject(new Error("api-missing"));
      };
      s.onerror = function () {
        reject(new Error("api-blocked"));
      };
      document.head.appendChild(s);
    });
    return apiLoader;
  }

  /* ---------- تحديث شكل الأزرار ---------- */
  function setMic(muted) {
    el.micBtn.setAttribute("aria-pressed", muted ? "false" : "true");
    el.micIcon.textContent = muted ? "🔇" : "🎤";
    el.micText.textContent = muted ? "افتح الميك" : "اقفل الميك";
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

  function setCount(n) {
    if (!n || n < 1) {
      el.peopleCount.hidden = true;
      return;
    }
    el.peopleCount.textContent = n === 1 ? "👤 لوحدك دلوقتي" : "👥 " + n + " في السيشن";
    el.peopleCount.hidden = false;
  }

  function refreshCount() {
    try {
      setCount(api.getNumberOfParticipants());
    } catch (_) {
      /* لو المكتبة لسه بتجهّز، الرقم هيتحدّث في أول حدث جاي */
    }
  }

  /* ---------- فتح الأوضة ---------- */
  function join(room, name) {
    var fullRoom = ROOM_PREFIX + room;

    el.roomLabel.textContent = room;
    el.fallbackLink.href = "https://" + JITSI_DOMAIN + "/" + encodeURIComponent(fullRoom);
    show("stage");
    setMic(true);
    setHand(false);
    setShare(false);
    setCount(0);
    say("بنوصّلك بالسيشن…", true);

    /* لو عدّت ١٢ ثانية ومدخلناش، غالبًا المدرّس لسه مفتحش الأوضة */
    var waitTimer = window.setTimeout(function () {
      say("مستني المدرّس يفتح السيشن… سيب الصفحة مفتوحة 🙂", true);
    }, 12000);

    api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
      roomName: fullRoom,
      parentNode: el.frame,
      userInfo: { displayName: name },
      lang: "ar",

      configOverwrite: {
        // ===== مفيش كاميرا =====
        startWithVideoMuted: true,
        disableSelfView: true,

        // ===== الصوت =====
        startWithAudioMuted: true,   // بيدخل ساكت، يفتح الميك لما يحب

        // ===== شريط جيتسي متخفي بالكامل =====
        // إحنا بنرسم أزرارنا في الصفحة، فمفيش داعي لشريطه
        toolbarButtons: [],

        // ===== تنضيف الواجهة للأطفال =====
        disableReactions: true,        // مفيش إيموجي طايرة تشتت
        disableChat: true,             // مفيش شات
        disablePolls: true,
        hideConferenceSubject: true,
        hideConferenceTimer: true,
        disableProfile: true,
        disableInviteFunctions: true,
        disableThirdPartyRequests: true,
        enableWelcomePage: false,
        prejoinConfig: { enabled: false },
        disableDeepLinking: true,      // ميحاولش يفتح تطبيق الموبايل
        notifications: []              // مفيش إشعارات إنجليزي فوق
      },

      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [],           // نفس الحاجة للنسخ الأقدم
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        MOBILE_APP_PROMO: false,
        HIDE_INVITE_MORE_HEADER: true,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        SHOW_CHROME_EXTENSION_BANNER: false
      }
    });

    /* ---- ربط الأزرار بحالة الاجتماع الحقيقية ----
       بنسمع للأحداث بدل ما نفترض، عشان لو الحالة اتغيرت من برّه
       (المُدرّس كتّم الكل مثلاً) الأزرار تفضل صح */
    api.addListener("videoConferenceJoined", function () {
      window.clearTimeout(waitTimer);
      say("");
      refreshCount();
      try {
        api.isAudioMuted().then(setMic);
      } catch (_) {
        setMic(true);
      }
    });

    api.addListener("audioMuteStatusChanged", function (e) {
      setMic(!!e.muted);
    });

    api.addListener("screenSharingStatusChanged", function (e) {
      setShare(!!e.on);
    });

    api.addListener("raiseHandUpdated", function () {
      // الحدث بيجي لكل المشاركين، فبنحدّث العدّاد بس
      refreshCount();
    });

    api.addListener("participantJoined", refreshCount);
    api.addListener("participantLeft", refreshCount);

    api.addListener("micError", function () {
      say("مش لاقيين الميك — اسمح للموقع باستخدام المايك من المتصفح 🎤", true);
    });

    api.addListener("errorOccurred", function (e) {
      if (e && e.isFatal) say("حصلت مشكلة في الاتصال… جرّب تخرج وتدخل تاني.", true);
    });

    // اللاعب قفل المكالمة أو اتقفلت — نرجّعه لشاشة الدخول
    api.addListener("readyToClose", leave);
  }

  function leave() {
    if (api) {
      try {
        api.dispose();
      } catch (_) {
        /* لو المكتبة اتقفلت خلاص، مش مشكلة */
      }
      api = null;
    }
    el.frame.innerHTML = "";
    say("");
    show("gate");
    el.joinBtn.disabled = false;
    el.joinBtn.textContent = "🎤 ادخل السيشن";
  }

  /* ---------- الأزرار ---------- */
  function command(name) {
    if (!api) return;
    try {
      api.executeCommand(name);
    } catch (_) {
      say("الزرار ده مش شغال دلوقتي، جرّب تاني بعد ثانية.");
    }
  }

  el.micBtn.addEventListener("click", function () {
    command("toggleAudio");
  });

  el.handBtn.addEventListener("click", function () {
    command("toggleRaiseHand");
    setHand(!handUp);
    say(handUp ? "إيدك مرفوعة ✋ استنى المدرّس ينده عليك" : "نزّلت إيدك");
  });

  el.shareBtn.addEventListener("click", function () {
    command("toggleShareScreen");
  });

  el.hangupBtn.addEventListener("click", function () {
    command("hangup");
    // لو جيتسي مردش لأي سبب، نخرج بنفسنا بعد لحظة
    window.setTimeout(function () {
      if (api) leave();
    }, 1200);
  });

  /* ---------- الدخول ---------- */
  el.form.addEventListener("submit", function (evt) {
    evt.preventDefault();
    el.error.hidden = true;

    var name = el.name.value.trim();
    var room = cleanRoom(el.room.value);

    if (name.length < 2) {
      showError("اكتب اسمك الأول عشان زمايلك يعرفوك 🙂");
      el.name.focus();
      return;
    }
    if (!room) {
      showError("اكتب كود السيشن (حروف وأرقام إنجليزي).");
      el.room.focus();
      return;
    }

    try {
      localStorage.setItem(NAME_KEY, name);
    } catch (_) {
      /* لو الستوريدج مقفول، الاسم مش هيتفتكر بس كله شغال */
    }

    el.joinBtn.disabled = true;
    el.joinBtn.textContent = "بنجهّز السيشن…";

    loadJitsi()
      .then(function () {
        join(room, name);
      })
      .catch(function () {
        // لو المكتبة مقدرتش تتحمّل (نت بيمنعها مثلاً) نديله لينك مباشر
        el.fallbackLink.href =
          "https://" + JITSI_DOMAIN + "/" + encodeURIComponent(ROOM_PREFIX + room);
        el.fallbackMsg.textContent =
          "يظهر إن النت عندك بيمنع الخدمة. اضغط الزرار ده عشان تفتح السيشن في تاب لوحدها.";
        show("fallback");
        el.joinBtn.disabled = false;
        el.joinBtn.textContent = "🎤 ادخل السيشن";
      });
  });

  el.fallbackBack.addEventListener("click", function () {
    show("gate");
  });

  /* ============================================================
     ركن المدرّس

     جيتسي بيطلب تسجيل دخول من أول واحد يفتح الأوضة، وتسجيل
     الدخول ده مش بيشتغل جوه iframe (المتصفح بيمنع نافذة جوجل).
     عشان كده المدرّس بيفتح الأوضة في تاب لوحدها عند جيتسي —
     هناك بيسجّل دخول عادي ويبقى هو الهوست. الأطفال بيدخلوا من
     صفحتنا على طول من غير أي تسجيل.
     ============================================================ */
  function roomUrls() {
    var code = cleanRoom(el.room.value) || DEFAULT_ROOM;
    return {
      code: code,
      host: "https://" + JITSI_DOMAIN + "/" + encodeURIComponent(ROOM_PREFIX + code),
      kids: location.origin + location.pathname + "?room=" + encodeURIComponent(code),
    };
  }

  function refreshShareLink() {
    el.shareLink.value = roomUrls().kids;
  }

  el.room.addEventListener("input", refreshShareLink);

  el.hostBtn.addEventListener("click", function () {
    window.open(roomUrls().host, "_blank", "noopener");
  });

  function copyLabel(text, ms) {
    el.copyBtn.textContent = text;
    window.setTimeout(function () {
      el.copyBtn.textContent = "📋 انسخ اللينك";
    }, ms);
  }

  el.copyBtn.addEventListener("click", function () {
    /* بنحدّد اللينك في كل الأحوال — كده حتى لو النسخ التلقائي
       اتمنع (مفيش https أو المتصفح رافض)، اللينك جاهز لـ Ctrl+C */
    el.shareLink.focus();
    el.shareLink.select();

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(roomUrls().kids).then(
        function () {
          copyLabel("✅ اتنسخ!", 1800);
        },
        function () {
          copyLabel("انسخه بإيدك (Ctrl+C)", 2600);
        }
      );
    } else {
      copyLabel("انسخه بإيدك (Ctrl+C)", 2600);
    }
  });

  /* ---------- التجهيز الأولي ---------- */
  (function init() {
    var params = new URLSearchParams(location.search);
    el.room.value = cleanRoom(params.get("room")) || DEFAULT_ROOM;

    try {
      var saved = localStorage.getItem(NAME_KEY);
      if (saved) el.name.value = saved;
    } catch (_) {
      /* عادي */
    }

    refreshShareLink();

    /* لو اللينك جاي بكود جاهز، يبقى ده طفل داخل السيشن —
       نقفل ركن المدرّس عشان الشاشة تفضل بسيطة قدامه */
    if (params.get("room")) el.hostBox.open = false;

    (el.name.value ? el.room : el.name).focus();
  })();
})();
