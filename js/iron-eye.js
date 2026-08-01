/* ============================================================
   Bloom Kids — محرّك لعبة "العين الحديدية"
   بيعتمد على js/iron-eye-scenes.js (بيانات الصور ومستويات الزوم)

   إزاي بتشتغل؟
     الصورة بتتحط جوه برواز بـ overflow:hidden، وبنعمل لها
     transform: scale() من نقطة محددة (transform-origin) هي التفصيلة
     اللي عايزين نبدأ عندها. الزوم بيبدأ عالي جداً (١٣×) وبيقل على
     خطوات لحد ما يوصل ١× = الصورة كلها. كل ما اللاعب يعرفها بدري،
     ياخد نقط أكتر.
   ============================================================ */
(function () {
  "use strict";

  const SAVE_KEY = "bloomkids_eye_v1";

  /* ---------- عناصر الصفحة ---------- */
  const el = {
    stage: document.querySelector(".eye-stage"),
    frame: document.getElementById("eyeFrame"),
    img: document.getElementById("eyeImg"),
    flash: document.getElementById("eyeFlash"),
    ask: document.getElementById("eyeAsk"),
    choiceGrid: document.getElementById("choiceGrid"),
    clarityBars: document.getElementById("clarityBars"),
    roundName: document.getElementById("roundName"),
    roundPips: document.getElementById("roundPips"),
    scoreNow: document.getElementById("scoreNow"),
    stepPoints: document.getElementById("stepPoints"),
    stepTimer: document.getElementById("stepTimer"),
    stepBar: document.getElementById("stepBar"),
    hintBtn: document.getElementById("hintBtn"),
    hintCount: document.getElementById("hintCount"),
    revealBtn: document.getElementById("revealBtn"),
    roundsBtn: document.getElementById("roundsBtn"),
    soundBtn: document.getElementById("soundBtn"),
    toast: document.getElementById("toast"),
    confetti: document.getElementById("confetti"),

    startOverlay: document.getElementById("startOverlay"),
    howList: document.getElementById("howList"),
    roundsTitle: document.getElementById("roundsTitle"),
    roundGrid: document.getElementById("roundGrid"),
    playAllBtn: document.getElementById("playAllBtn"),
    closeRoundsBtn: document.getElementById("closeRoundsBtn"),

    roundOverlay: document.getElementById("roundOverlay"),
    revealImg: document.getElementById("revealImg"),
    roundTitle: document.getElementById("roundTitle"),
    roundAnswer: document.getElementById("roundAnswer"),
    roundStats: document.getElementById("roundStats"),
    roundFact: document.getElementById("roundFact"),
    nextRoundBtn: document.getElementById("nextRoundBtn"),
    retryRoundBtn: document.getElementById("retryRoundBtn"),
    roundLevelsBtn: document.getElementById("roundLevelsBtn"),

    endOverlay: document.getElementById("endOverlay"),
    endTitle: document.getElementById("endTitle"),
    endScore: document.getElementById("endScore"),
    endMax: document.getElementById("endMax"),
    endStars: document.getElementById("endStars"),
    endBest: document.getElementById("endBest"),
    playAgainBtn: document.getElementById("playAgainBtn"),
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LAST_STEP = EYE_STEPS.length - 1;

  /* ---------- حالة اللعبة ---------- */
  const state = {
    round: 0,         // رقم الصورة الحالية في EYE_SCENES
    step: 0,          // مستوى الوضوح الحالي
    runScore: 0,      // نقط الجولة الحالية كلها
    runMax: 0,        // أقصى نقط ممكنة في اللي اتلعب لحد دلوقتي
    hints: 3,
    hintPenalty: 0,   // كل تلميح بيقلّل نقط الصورة دي واحدة
    wrongTries: 0,
    seconds: EYE_STEP_SECONDS,
    tickId: null,
    running: false,
    started: false,
    answered: false,
    soundOn: true,
  };

  /* ============================================================
     تخزين النتايج
     ============================================================ */
  function loadSave() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      return { rounds: raw.rounds || {}, best: raw.best || 0 };
    } catch (_) {
      return { rounds: {}, best: 0 };
    }
  }
  function writeSave(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (_) {
      /* لو الستوريدج مقفول، اللعبة تكمل عادي من غير حفظ */
    }
  }

  /* ============================================================
     الصوت — نغمات بسيطة من غير أي ملفات
     ============================================================ */
  let audioCtx = null;
  function tone(freqs, duration, type) {
    if (!state.soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      freqs.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const t0 = audioCtx.currentTime + i * 0.09;
        osc.type = type || "sine";
        osc.frequency.setValueAtTime(f, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.02);
      });
    } catch (_) {
      /* لو المتصفح مش سامح بالصوت، اللعبة تكمل عادي */
    }
  }
  const sfx = {
    correct: () => tone([660, 880, 1180], 0.18),
    wrong: () => tone([200, 150], 0.16, "square"),
    hint: () => tone([880, 660], 0.12, "triangle"),
    zoom: () => tone([420, 520], 0.1, "triangle"),
    win: () => tone([523, 659, 784, 1047], 0.28),
    lose: () => tone([392, 330, 262], 0.26, "triangle"),
  };

  /* ============================================================
     أدوات صغيرة
     ============================================================ */
  function toArabic(n) {
    return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  }

  function shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function showOverlay(node) {
    node.hidden = false;
    window.requestAnimationFrame(() => node.classList.add("is-show"));
  }
  function hideOverlay(node) {
    node.classList.remove("is-show");
    window.setTimeout(() => {
      node.hidden = true;
    }, 320);
  }

  let toastId = null;
  function showToast(msg, kind) {
    el.toast.textContent = msg;
    el.toast.className = `toast is-show toast-${kind}`;
    window.clearTimeout(toastId);
    toastId = window.setTimeout(() => {
      el.toast.className = "toast";
    }, 1700);
  }

  /* نقط الصورة دي لو عرفها دلوقتي — مستوى الوضوح ناقص التلميحات */
  function pointsNow() {
    return Math.max(1, EYE_STEPS[state.step].points - state.hintPenalty);
  }

  /* ============================================================
     مقاس البرواز

     البرواز لازم يبقى مربّع وياخد أكبر مساحة فاضية على الشاشة. جرّبنا
     نحسبها بـ CSS بـ (ارتفاع الشاشة ناقص باقي العناصر)، بس الرقم ده
     بيختلف من شاشة للتانية — على موبايل ضيق شريط المعلومات بينزل
     سطرين والاختيارات كمان، فالحساب الثابت كان بيقص آخر الصفحة.
     فبنقيس المساحة الفعلية بدل ما نخمّنها.

     مفيش خطر لفّة لا نهائية هنا: المسرح flex:1، يعني مقاسه جاي من
     الصفحة مش من البرواز اللي جوّه. */
  function sizeFrame() {
    if (!el.stage) return;
    const box = el.stage.getBoundingClientRect();
    const max = parseFloat(
      getComputedStyle(document.body).getPropertyValue("--eye-max")
    ) || 560;
    const size = Math.max(160, Math.min(box.height, box.width, max));
    el.frame.style.setProperty("--eye-size", `${Math.floor(size)}px`);
  }

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(sizeFrame).observe(el.stage);
  } else {
    window.addEventListener("resize", sizeFrame);
    window.addEventListener("orientationchange", sizeFrame);
  }
  sizeFrame();

  /* ============================================================
     الزوم
     ============================================================ */
  function applyZoom(animate) {
    const zoom = EYE_STEPS[state.step].zoom;
    if (!animate) {
      /* أول ما نفتح صورة جديدة مش عايزين الزوم "يطير" من قيمة
         الصورة اللي فاتت — بنطفي الأنيميشن للحظة واحدة */
      el.img.style.transition = "none";
      el.img.style.setProperty("--zoom", zoom);
      void el.img.offsetWidth;
      el.img.style.transition = "";
      return;
    }
    el.img.style.setProperty("--zoom", zoom);
  }

  function renderClarity() {
    el.clarityBars.innerHTML = EYE_STEPS.map(
      (_, i) => `<i class="${i <= state.step ? "is-on" : ""}"></i>`
    ).join("");
  }

  function flash() {
    if (reduceMotion) return;
    el.flash.classList.remove("is-on");
    void el.flash.offsetWidth;
    el.flash.classList.add("is-on");
  }

  /* الوضوح بيزيد خطوة — سواء بالوقت أو بزرار "وضّح أكتر" أو كعقوبة
     على إجابة غلط. لو مفيش خطوات تانية، الجولة تخلص */
  function advanceStep(reason) {
    if (!state.running || state.answered) return;

    if (state.step >= LAST_STEP) {
      failRound(reason === "wrong" ? "wrong" : "time");
      return;
    }

    state.step += 1;
    applyZoom(true);
    renderClarity();
    flash();
    sfx.zoom();
    resetStepClock();
    updateHud();
  }

  /* ============================================================
     ساعة المستوى
     ============================================================ */
  function resetStepClock() {
    state.seconds = EYE_STEP_SECONDS;
    paintClock();
  }

  function paintClock() {
    el.stepTimer.textContent = toArabic(state.seconds);
    el.stepBar.style.width = `${(state.seconds / EYE_STEP_SECONDS) * 100}%`;
  }

  function startClock() {
    window.clearInterval(state.tickId);
    state.tickId = window.setInterval(() => {
      if (!state.running || state.answered) return;
      state.seconds -= 1;
      paintClock();
      if (state.seconds <= 0) advanceStep("time");
    }, 1000);
  }

  function stopClock() {
    window.clearInterval(state.tickId);
  }

  /* ============================================================
     رسم الجولة
     ============================================================ */
  function updateHud() {
    el.scoreNow.textContent = toArabic(state.runScore);
    el.stepPoints.textContent = toArabic(pointsNow());
    el.hintCount.textContent = toArabic(state.hints);
    el.hintBtn.disabled = state.hints <= 0 || state.answered;
    el.revealBtn.disabled = state.answered || state.step >= LAST_STEP;
  }

  function loadRound(index) {
    const scene = EYE_SCENES[index];
    state.round = index;
    state.step = 0;
    state.hintPenalty = 0;
    state.wrongTries = 0;
    state.answered = false;
    state.started = true;
    el.confetti.innerHTML = "";

    el.img.src = scene.src;
    el.img.alt = "صورة مكبّرة — خمّن هي إيه";
    el.img.style.setProperty("--fx", `${scene.focus.x}%`);
    el.img.style.setProperty("--fy", `${scene.focus.y}%`);
    applyZoom(false);

    el.roundName.textContent = `👁️ صورة ${toArabic(index + 1)}`;
    el.roundPips.innerHTML = EYE_SCENES.map(
      (_, i) => `<span class="pip ${i === index ? "is-active" : ""} ${i < index ? "is-done" : ""}"></span>`
    ).join("");

    el.ask.textContent = "إيه ده؟ 🤔";
    /* الاختيارات بتتخلط كل مرة، عشان الطفل ميحفظش مكان الإجابة */
    el.choiceGrid.innerHTML = shuffle(scene.choices)
      .map(
        (c, i) => `<button type="button" class="choice" data-answer="${c}"
                           aria-keyshortcuts="${i + 1}">${c}</button>`
      )
      .join("");

    renderClarity();
    resetStepClock();
    updateHud();
  }

  function startRound(index) {
    hideOverlay(el.startOverlay);
    hideOverlay(el.roundOverlay);
    hideOverlay(el.endOverlay);
    state.running = true;
    loadRound(index);
    startClock();
  }

  /* بداية جولة جديدة من أول الصورة اللي اختارها — النقط بتتصفّر */
  function startRun(index) {
    state.runScore = 0;
    state.runMax = 0;
    state.hints = 3;
    startRound(index);
  }

  /* ============================================================
     الإجابة
     ============================================================ */
  el.choiceGrid.addEventListener("click", (evt) => {
    const btn = evt.target.closest(".choice");
    if (!btn || btn.disabled || !state.running || state.answered) return;

    const scene = EYE_SCENES[state.round];
    if (btn.dataset.answer === scene.answer) {
      winRound(btn);
    } else {
      btn.classList.add("is-wrong");
      btn.disabled = true;
      state.wrongTries += 1;
      sfx.wrong();
      showToast("مش دي… بصّ تاني 👀", "no");
      /* عقوبة الغلط: الصورة بتوضح خطوة، فالنقط بتقل */
      advanceStep("wrong");
    }
  });

  function lockChoices(revealAnswer) {
    const scene = EYE_SCENES[state.round];
    el.choiceGrid.querySelectorAll(".choice").forEach((b) => {
      b.disabled = true;
      if (revealAnswer && b.dataset.answer === scene.answer) {
        b.classList.remove("is-out");
        b.classList.add("is-right");
      }
    });
  }

  function winRound(btn) {
    const gained = pointsNow();
    state.answered = true;
    state.running = false;
    stopClock();
    sfx.correct();

    btn.classList.add("is-right");
    lockChoices(false);

    state.runScore += gained;
    state.runMax += EYE_STEPS[0].points;
    state.roundGained = gained;
    updateHud();

    const scene = EYE_SCENES[state.round];
    const save = loadSave();
    const prev = save.rounds[scene.id] || 0;
    if (gained > prev) {
      save.rounds[scene.id] = gained;
      writeSave(save);
    }

    /* نفتح الصورة كلها الأول عشان الطفل يشوف كان بيبصّ على إيه */
    revealWhole();
    if (gained >= 4 && !reduceMotion) fireConfetti(22);

    window.setTimeout(() => finishRound(true, gained), 1250);
  }

  function failRound(reason) {
    state.answered = true;
    state.running = false;
    stopClock();
    sfx.lose();
    lockChoices(true);
    state.runMax += EYE_STEPS[0].points;
    state.roundGained = 0;
    updateHud();
    revealWhole();
    window.setTimeout(() => finishRound(false, 0, reason), 1250);
  }

  function revealWhole() {
    state.step = LAST_STEP;
    applyZoom(true);
    renderClarity();
    el.stepBar.style.width = "0%";
  }

  function finishRound(won, gained, reason) {
    const scene = EYE_SCENES[state.round];
    const isLast = state.round === EYE_SCENES.length - 1;

    el.revealImg.src = scene.src;
    el.revealImg.alt = scene.answer;

    if (won) {
      el.roundTitle.textContent = gained === 5 ? "🤩 عين حديدية فعلاً!" : "🎉 برافو!";
    } else {
      el.roundTitle.textContent = reason === "wrong" ? "😅 قربت!" : "⏰ خلص الوقت!";
    }

    el.roundAnswer.textContent = `${scene.emoji} ${scene.answer}`;
    /* dir="ltr" على علامة الزائد عشان متتقلبش لناحية الرقم الغلط في RTL */
    el.roundStats.innerHTML = `
      <span class="stat-chip"><b dir="ltr">+${toArabic(gained)}</b> نقطة</span>
      <span class="stat-chip"><b>${toArabic(state.runScore)}</b> المجموع</span>
      <span class="stat-chip"><b>${toArabic(state.wrongTries)}</b> محاولة غلط</span>`;
    el.roundFact.textContent = `💡 ${scene.fact}`;

    /* آخر صورة: نفس الزرار بيودّي لشاشة النتيجة بدل "الصورة الجاية" */
    el.nextRoundBtn.textContent = isLast ? "🏆 شوف نتيجتك" : "الصورة الجاية ▶";
    showOverlay(el.roundOverlay);
  }

  /* ============================================================
     التلميح — بيشيل اختيار غلط، وبيكلّف نقطة
     ============================================================ */
  el.hintBtn.addEventListener("click", () => {
    if (!state.running || state.answered || state.hints <= 0) return;
    const scene = EYE_SCENES[state.round];
    const victims = Array.from(el.choiceGrid.querySelectorAll(".choice")).filter(
      (b) => !b.disabled && b.dataset.answer !== scene.answer
    );
    if (!victims.length) {
      showToast("مفيش اختيارات تتشال — الإجابة قدامك! 😄", "hint");
      return;
    }

    const pick = victims[Math.floor(Math.random() * victims.length)];
    pick.classList.add("is-out");
    pick.disabled = true;
    state.hints -= 1;
    state.hintPenalty += 1;
    sfx.hint();
    updateHud();
    showToast(`🔎 شلنا "${pick.dataset.answer}" — النقط قلّت واحدة`, "hint");
  });

  /* زرار "وضّح أكتر" — للي مش عايز يستنى الوقت */
  el.revealBtn.addEventListener("click", () => {
    if (!state.running || state.answered) return;
    advanceStep("manual");
  });

  /* ============================================================
     اختيار الصورة
     ============================================================ */
  function renderRoundGrid() {
    const save = loadSave();

    el.roundGrid.innerHTML = EYE_SCENES.map((scene, i) => {
      const best = save.rounds[scene.id] || 0;
      const done = best > 0;
      const isCurrent = state.started && i === state.round;

      /* مهم: مانكشفش اسم الصورة لو الطفل لسه معرفهاش — ده هيحرق اللعبة */
      const face = done ? scene.emoji : "❓";
      const title = done ? `${toArabic(i + 1)}. ${scene.answer}` : `صورة رقم ${toArabic(i + 1)}`;
      const meta = done ? `أحسن نتيجة <b dir="ltr">${toArabic(best)}/٥</b>` : "لسه متجرّبتش";

      return `
        <button type="button" class="level-card ${isCurrent ? "is-current" : ""}"
                data-round="${i}">
          <span class="level-card-emoji" aria-hidden="true">${face}</span>
          <span class="level-card-body">
            <span class="level-card-title">${title}</span>
            <span class="level-card-meta">${meta}</span>
          </span>
          ${done ? `<span class="level-card-done" title="عرفتها">✓</span>` : ""}
        </button>`;
    }).join("");
  }

  function openRounds() {
    stopClock();
    state.running = false;
    renderRoundGrid();

    el.howList.hidden = state.started;
    el.roundsTitle.textContent = state.started ? "اختار صورة تانية 👇" : "اختار الصورة 👇";
    el.playAllBtn.textContent = state.started ? "▶ ابدأ من الأول" : "▶ العب الأربعة ورا بعض";
    el.closeRoundsBtn.hidden = !state.started;

    hideOverlay(el.roundOverlay);
    hideOverlay(el.endOverlay);
    showOverlay(el.startOverlay);
  }

  el.roundGrid.addEventListener("click", (evt) => {
    const card = evt.target.closest(".level-card");
    if (!card) return;
    startRun(Number(card.dataset.round));
  });

  el.playAllBtn.addEventListener("click", () => startRun(0));
  el.roundsBtn.addEventListener("click", openRounds);
  el.roundLevelsBtn.addEventListener("click", openRounds);

  /* رجوع للصورة اللي كان بيلعبها — الوقت بيكمّل من مكانه */
  el.closeRoundsBtn.addEventListener("click", () => {
    hideOverlay(el.startOverlay);
    if (state.answered) {
      showOverlay(el.roundOverlay);
      return;
    }
    state.running = true;
    startClock();
  });

  /* ============================================================
     التنقّل بين الجولات
     ============================================================ */
  el.nextRoundBtn.addEventListener("click", () => {
    const next = state.round + 1;
    if (next >= EYE_SCENES.length) {
      endGame();
      return;
    }
    hideOverlay(el.roundOverlay);
    startRound(next);
  });

  el.retryRoundBtn.addEventListener("click", () => {
    /* الإعادة بتشيل نتيجة المحاولة اللي فاتت، عشان الصورة الواحدة
       متتحسبش مرتين في المجموع */
    state.runMax = Math.max(0, state.runMax - EYE_STEPS[0].points);
    state.runScore = Math.max(0, state.runScore - (state.roundGained || 0));
    state.roundGained = 0;
    hideOverlay(el.roundOverlay);
    startRound(state.round);
  });

  el.playAgainBtn.addEventListener("click", () => startRun(0));

  /* ============================================================
     نهاية اللعبة
     ============================================================ */
  function endGame() {
    hideOverlay(el.roundOverlay);
    sfx.win();

    const max = state.runMax || EYE_SCENES.length * EYE_STEPS[0].points;
    const pct = max ? state.runScore / max : 0;
    const stars = pct >= 0.85 ? 3 : pct >= 0.55 ? 2 : pct > 0 ? 1 : 0;

    el.endTitle.textContent =
      stars === 3 ? "🏆 عين حديدية أصلية!" : stars === 2 ? "🎉 شغل حلو!" : "👏 خلّصت اللعبة!";
    el.endScore.textContent = toArabic(state.runScore);
    el.endMax.textContent = toArabic(max);
    el.endStars.textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);

    const save = loadSave();
    const isRecord = state.runScore > save.best;
    if (isRecord) {
      save.best = state.runScore;
      writeSave(save);
    }
    el.endBest.textContent = isRecord
      ? "🏆 رقم قياسي جديد!"
      : `أحسن نتيجة ليك: ${toArabic(save.best)}`;

    showOverlay(el.endOverlay);
    if (!reduceMotion) fireConfetti(46);
  }

  function fireConfetti(count) {
    const colors = ["#ef5f7c", "#23a89f", "#f6a92c", "#6a4fb6", "#7dc242"];
    el.confetti.innerHTML = Array.from({ length: count }, () => {
      const c = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 0.7;
      const dur = 1.9 + Math.random() * 1.3;
      const size = 7 + Math.random() * 8;
      const rot = Math.random() * 360;
      return `<i style="left:${left}%;background:${c};width:${size}px;height:${size * 1.5}px;
        animation-delay:${delay}s;animation-duration:${dur}s;transform:rotate(${rot}deg)"></i>`;
    }).join("");
    window.setTimeout(() => {
      el.confetti.innerHTML = "";
    }, 3600);
  }

  /* ============================================================
     الأزرار العامة ولوحة المفاتيح
     ============================================================ */
  el.soundBtn.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    el.soundBtn.setAttribute("aria-pressed", String(state.soundOn));
    el.soundBtn.textContent = state.soundOn ? "🔊" : "🔇";
    el.soundBtn.title = state.soundOn ? "اقفل الصوت" : "شغّل الصوت";
  });

  /* الأرقام ١-٤ بتختار، والمسافة بتوضّح أكتر — مفيدة لما اللعبة
     تكون معروضة على شاشة كبيرة في السيشن */
  document.addEventListener("keydown", (evt) => {
    if (!state.running || state.answered) return;
    if (evt.key === " ") {
      evt.preventDefault();
      advanceStep("manual");
      return;
    }
    const n = Number(evt.key);
    if (n >= 1 && n <= 4) {
      const btn = el.choiceGrid.querySelectorAll(".choice")[n - 1];
      if (btn && !btn.disabled) btn.click();
    }
  });

  /* اللعبة توقف لما الطفل يسيب الصفحة، وتكمّل لما يرجع */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopClock();
    else if (state.running && !state.answered) startClock();
  });

  /* تحميل الصور في الخلفية بعد ما الصفحة تخلص */
  function warmAssets() {
    EYE_SCENES.forEach((scene) => {
      const img = new Image();
      img.src = scene.src;
    });
  }
  if (document.readyState === "complete") warmAssets();
  else window.addEventListener("load", warmAssets);

  /* شاشة الاختيار ظاهرة من الأول */
  openRounds();
})();
