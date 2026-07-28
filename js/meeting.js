/* ============================================================
   Bloom Kids — سيشن مباشرة

   الاجتماع نفسه شغّال بـ Jitsi Meet (مفتوح المصدر ومجاني) جوه
   الصفحة، بس بإعدادات مخصوصة:
     • مفيش كاميرا خالص — زرار الكاميرا مشال من الشريط
       والفيديو بيبدأ مقفول، فمحدش يقدر يفتحها أصلاً.
     • شير سكرين ورفع الإيد والشات شغّالين.
     • الشريط فيه اللي محتاجينه بس، عشان يبقى بسيط على الأطفال.

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
    leaveBtn: document.getElementById("leaveBtn"),
    frame: document.getElementById("meet"),
    fallback: document.getElementById("fallback"),
    fallbackMsg: document.getElementById("fallbackMsg"),
    fallbackLink: document.getElementById("fallbackLink"),
    fallbackBack: document.getElementById("fallbackBack"),
  };

  var api = null;

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

  function clearError() {
    el.error.hidden = true;
  }

  function show(section) {
    el.gate.hidden = section !== "gate";
    el.stage.hidden = section !== "stage";
    el.fallback.hidden = section !== "fallback";
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

  /* ---------- فتح الأوضة ---------- */
  function join(room, name) {
    var fullRoom = ROOM_PREFIX + room;

    el.roomLabel.textContent = room;
    el.fallbackLink.href = "https://" + JITSI_DOMAIN + "/" + encodeURIComponent(fullRoom);
    show("stage");

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
        disableAP: false,

        // ===== الشريط: اللي محتاجينه بس =====
        // مفيش "camera" ولا "toggle-camera" هنا، يعني الزرار
        // نفسه مش موجود ومحدش يقدر يفتح كاميرا
        toolbarButtons: [
          "microphone",
          "desktop",
          "raisehand",
          "chat",
          "participants-pane",
          "security",   // للمُدرّس: يقدر يحط باسورد أو يفعّل قاعة انتظار
          "settings",
          "hangup"
        ],

        prejoinConfig: { enabled: false },
        disableDeepLinking: true,     // ميحاولش يفتح تطبيق الموبايل
        disableInviteFunctions: true,
        disableThirdPartyRequests: true,
        enableWelcomePage: false,
        readOnlyName: false
      },

      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        MOBILE_APP_PROMO: false,
        HIDE_INVITE_MORE_HEADER: true,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        TOOLBAR_ALWAYS_VISIBLE: true
      }
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
    show("gate");
    el.joinBtn.disabled = false;
    el.joinBtn.textContent = "🎤 ادخل السيشن";
  }

  /* ---------- الدخول ---------- */
  el.form.addEventListener("submit", function (evt) {
    evt.preventDefault();
    clearError();

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

  el.leaveBtn.addEventListener("click", leave);
  el.fallbackBack.addEventListener("click", function () {
    show("gate");
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

    (el.name.value ? el.room : el.name).focus();
  })();
})();
