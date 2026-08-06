/* ============================================================
   Bloom Kids — محرّك لعبة "أوجد المختلف"
   بيعتمد على js/odd-one-out-rounds.js (بيانات الجولات)

   الجولة الواحدة على خطوتين:
     ١) اختار الصورة المختلفة  →  ٢ نقطة (بتقل مع كل غلطة أو تلميح)
     ٢) اختار السبب            →  ١ نقطة
   الخطوة التانية مقصودة: اللعبة دي أصلاً بتعلّم التصنيف، واللي
   بيعرف الإجابة من غير ما يعرف القاعدة مخدش منها حاجة.

   مفيش عدّاد وقت هنا عن قصد — الاستعجال بيخرّب التفكير.
   ============================================================ */
(function () {
  "use strict";

  const SAVE_KEY = "bloomkids_odd_v1";
  const ROUND_MAX = ODD_PICK_POINTS + ODD_REASON_POINTS;

  /* ---------- عناصر الصفحة ---------- */
  const el = {
    grid: document.getElementById("oddGrid"),
    ask: document.getElementById("oddAsk"),
    roundName: document.getElementById("roundName"),
    roundPips: document.getElementById("roundPips"),
    scoreNow: document.getElementById("scoreNow"),
    pickValue: document.getElementById("pickValue"),
    hintBtn: document.getElementById("hintBtn"),
    hintCount: document.getElementById("hintCount"),
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

    whyOverlay: document.getElementById("whyOverlay"),
    oddImg: document.getElementById("oddImg"),
    whyStep: document.getElementById("whyStep"),
    whyTitle: document.getElementById("whyTitle"),
    reasonList: document.getElementById("reasonList"),
    ruleStep: document.getElementById("ruleStep"),
    ruleTitle: document.getElementById("ruleTitle"),
    ruleText: document.getElementById("ruleText"),
    roundStats: document.getElementById("roundStats"),
    nextRoundBtn: document.getElementById("nextRoundBtn"),
    retryRoundBtn: document.getElementById("retryRoundBtn"),
    roundLevelsBtn: document.getElementById("roundLevelsBtn"),
    endLevelsBtn: document.getElementById("endLevelsBtn"),

    endOverlay: document.getElementById("endOverlay"),
    endTitle: document.getElementById("endTitle"),
    endScore: document.getElementById("endScore"),
    endMax: document.getElementById("endMax"),
    endStars: document.getElementById("endStars"),
    endBest: document.getElementById("endBest"),
    nextStageBtn: document.getElementById("nextStageBtn"),
    playAgainBtn: document.getElementById("playAgainBtn"),
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
     المراحل

     الـ٣٠ جولة متقسّمة على ٥ مراحل × ٦ جولات. المرحلة هي وحدة
     اللعب: بعد ٦ جولات بيشوف نتيجة وبيقرّر يكمّل ولا لأ — بدل ما
     يفضل ماشي ٣٠ جولة من غير ما يحس بإنجاز.

     بنبني أرقام جولات كل مرحلة من ODD_ROUNDS نفسه عشان مفيش
     مصدرين للبيانات يتعارضوا. */
  const STAGES = ODD_STAGES.map((meta) => ({ ...meta, rounds: [] }));
  const STAGE_BY_ID = {};
  STAGES.forEach((s) => { STAGE_BY_ID[s.id] = s; });
  ODD_ROUNDS.forEach((round, i) => {
    if (STAGE_BY_ID[round.stage]) STAGE_BY_ID[round.stage].rounds.push(i);
  });

  function stageOf(roundIndex) {
    return STAGE_BY_ID[ODD_ROUNDS[roundIndex].stage] || STAGES[0];
  }
  function stageNumber(stage) {
    return STAGES.indexOf(stage) + 1;
  }
  function posInStage(roundIndex) {
    return stageOf(roundIndex).rounds.indexOf(roundIndex);
  }
  function isStageEnd(roundIndex) {
    return posInStage(roundIndex) === stageOf(roundIndex).rounds.length - 1;
  }

  /* ---------- حالة اللعبة ---------- */
  const state = {
    round: 0,
    phase: "pick",     // pick | why | done
    pickValue: ODD_PICK_POINTS,
    wrongTries: 0,
    roundGained: 0,
    runScore: 0,
    runMax: 0,
    hints: 3,
    started: false,
    soundOn: true,
  };

  /* ============================================================
     تخزين النتايج
     ============================================================ */
  function loadSave() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      /* stages اتضافت بعد ما اللعبة اتقسّمت مراحل — الحفظ القديم
         مفيهوش المفتاح ده، فبنعوّضه فاضي بدل ما يقع */
      return { rounds: raw.rounds || {}, stages: raw.stages || {}, best: raw.best || 0 };
    } catch (_) {
      return { rounds: {}, stages: {}, best: 0 };
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
    win: () => tone([523, 659, 784, 1047], 0.28),
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
    }, 1800);
  }

  function cardFor(id) {
    return el.grid.querySelector(`.odd-card[data-item="${id}"]`);
  }

  /* ============================================================
     رسم الجولة
     ============================================================ */
  function updateHud() {
    el.scoreNow.textContent = toArabic(state.runScore);
    el.pickValue.textContent = toArabic(state.pickValue);
    el.hintCount.textContent = toArabic(state.hints);
    el.hintBtn.disabled = state.hints <= 0 || state.phase !== "pick";
  }

  function loadRound(index) {
    const round = ODD_ROUNDS[index];
    state.round = index;
    state.phase = "pick";
    state.pickValue = ODD_PICK_POINTS;
    state.wrongTries = 0;
    state.roundGained = 0;
    state.started = true;
    el.confetti.innerHTML = "";

    el.ask.textContent = "مين المختلف؟ 🤔";

    /* الصور بتتخلط كل مرة عشان الطفل ميحفظش مكان الإجابة */
    el.grid.innerHTML = shuffle(round.items)
      .map((id) => {
        const item = ODD_ITEMS[id];
        return `
          <button type="button" class="odd-card" data-item="${id}">
            <span class="odd-card-media">
              <img src="${item.src}" alt="${item.label}" draggable="false">
            </span>
            <span class="odd-card-name">${item.label}</span>
          </button>`;
      })
      .join("");

    /* اسم المرحلة ونقطها بس — ٣٠ نقطة على الشاشة كانت بتلف سطرين */
    const stage = stageOf(index);
    const pos = posInStage(index);
    el.roundName.textContent =
      `${stage.emoji} ${stage.name} · جولة ${toArabic(pos + 1)}/${toArabic(stage.rounds.length)}`;
    el.roundPips.innerHTML = stage.rounds
      .map((_, i) => `<span class="pip ${i === pos ? "is-active" : ""} ${i < pos ? "is-done" : ""}"></span>`)
      .join("");

    updateHud();
  }

  function startRound(index) {
    hideOverlay(el.startOverlay);
    hideOverlay(el.whyOverlay);
    hideOverlay(el.endOverlay);
    loadRound(index);
  }

  /* بداية جولة جديدة من أول الجولة اللي اختارها — النقط بتتصفّر */
  function startRun(index) {
    state.runScore = 0;
    state.runMax = 0;
    state.hints = 3;
    warmStage(stageOf(index));
    startRound(index);
  }

  /* ============================================================
     الخطوة ١ — اختيار الصورة المختلفة
     ============================================================ */
  el.grid.addEventListener("click", (evt) => {
    const card = evt.target.closest(".odd-card");
    if (!card || card.disabled || state.phase !== "pick") return;

    const round = ODD_ROUNDS[state.round];
    if (card.dataset.item === round.odd) {
      markCard(card, "is-right", "✓");
      sfx.correct();
      /* التلاتة التانيين بيبهتوا عشان المجموعة تبان كمجموعة */
      el.grid.querySelectorAll(".odd-card").forEach((c) => {
        c.disabled = true;
        if (c !== card) c.classList.add("is-dim");
      });
      state.phase = "why";
      updateHud();
      window.setTimeout(openWhy, 700);
    } else {
      markCard(card, "is-wrong", "✕");
      card.disabled = true;
      state.wrongTries += 1;
      /* كل غلطة بتقلّل نقط الصورة — بس اللعب بيكمّل، مبنقفلش الجولة */
      state.pickValue = Math.max(0, state.pickValue - 1);
      sfx.wrong();
      updateHud();
      showToast("مش دي… بصّ إيه اللي بيجمع التلاتة التانيين 🤔", "no");
    }
  });

  function markCard(card, cls, glyph) {
    card.classList.add(cls);
    const media = card.querySelector(".odd-card-media");
    if (!media.querySelector(".odd-card-mark")) {
      media.insertAdjacentHTML(
        "beforeend",
        `<span class="odd-card-mark" aria-hidden="true">${glyph}</span>`
      );
    }
  }

  /* ============================================================
     الخطوة ٢ — ليه هي المختلفة؟
     ============================================================ */
  function openWhy() {
    const round = ODD_ROUNDS[state.round];
    const item = ODD_ITEMS[round.odd];

    el.oddImg.src = item.src;
    el.oddImg.alt = item.label;
    el.whyTitle.textContent = `ليه "${item.label}" هي المختلفة؟`;

    el.reasonList.innerHTML = shuffle(round.reasons)
      .map(
        (r) => `<button type="button" class="reason"
                        data-ok="${r.ok ? "1" : "0"}">${r.text}</button>`
      )
      .join("");

    el.whyStep.hidden = false;
    el.ruleStep.hidden = true;
    showOverlay(el.whyOverlay);
  }

  el.reasonList.addEventListener("click", (evt) => {
    const btn = evt.target.closest(".reason");
    if (!btn || btn.disabled || state.phase !== "why") return;

    const ok = btn.dataset.ok === "1";
    state.phase = "done";

    el.reasonList.querySelectorAll(".reason").forEach((b) => {
      b.disabled = true;
      /* بنوضّح السبب الصح دايمًا — حتى لو اختار غلط، عشان يتعلّم */
      if (b.dataset.ok === "1") b.classList.add("is-right");
      else if (b === btn) b.classList.add("is-wrong");
    });

    if (ok) sfx.correct();
    else sfx.wrong();

    window.setTimeout(() => finishRound(ok), ok ? 700 : 1400);
  });

  function finishRound(reasonOk) {
    const gained = state.pickValue + (reasonOk ? ODD_REASON_POINTS : 0);
    state.roundGained = gained;
    state.runScore += gained;
    state.runMax += ROUND_MAX;
    updateHud();

    const round = ODD_ROUNDS[state.round];
    const save = loadSave();
    if (gained > (save.rounds[round.id] || 0)) {
      save.rounds[round.id] = gained;
      writeSave(save);
    }

    const isLast = isStageEnd(state.round);
    el.ruleTitle.textContent =
      gained === ROUND_MAX ? "🤩 ممتاز! عرفتها وعرفت ليه" :
      reasonOk ? "🎉 برافو!" : "👏 عرفت المختلفة — والسبب أهو";
    el.ruleText.textContent = round.rule;
    el.roundStats.innerHTML = `
      <span class="stat-chip"><b dir="ltr">+${toArabic(gained)}</b> نقطة</span>
      <span class="stat-chip"><b>${toArabic(state.runScore)}</b> المجموع</span>
      <span class="stat-chip"><b>${toArabic(state.wrongTries)}</b> محاولة غلط</span>`;

    el.nextRoundBtn.textContent = isLast ? "🏆 شوف نتيجة المرحلة" : "الجولة الجاية ▶";

    el.whyStep.hidden = true;
    el.ruleStep.hidden = false;
    if (gained === ROUND_MAX && !reduceMotion) fireConfetti(22);
  }

  /* ============================================================
     التلميح — بيشيل صورة من التلاتة اللي بينهم حاجة مشتركة
     ============================================================ */
  el.hintBtn.addEventListener("click", () => {
    if (state.phase !== "pick" || state.hints <= 0) return;
    const round = ODD_ROUNDS[state.round];
    const victims = Array.from(el.grid.querySelectorAll(".odd-card")).filter(
      (c) => !c.disabled && c.dataset.item !== round.odd
    );
    if (!victims.length) {
      showToast("مفيش صور تتشال — الإجابة قدامك! 😄", "hint");
      return;
    }

    const pick = victims[Math.floor(Math.random() * victims.length)];
    pick.classList.add("is-out");
    pick.disabled = true;
    state.hints -= 1;
    state.pickValue = Math.max(0, state.pickValue - 1);
    sfx.hint();
    updateHud();
    showToast(`🔎 شلنا "${ODD_ITEMS[pick.dataset.item].label}" — النقط قلّت واحدة`, "hint");
  });

  /* ============================================================
     اختيار الجولة
     ============================================================ */
  function stageDoneCount(stage, save) {
    return stage.rounds.filter((i) => (save.rounds[ODD_ROUNDS[i].id] || 0) > 0).length;
  }

  function renderRoundGrid() {
    const save = loadSave();
    /* المرحلة المفتوحة: اللي بيلعبها دلوقتي، وإلا أول مرحلة مخلصهاش.
       لو فتحنا الخمسة مع بعض الشاشة بتبقى ٣٠ كارت ولازم يسكرول كتير */
    const openId = state.started ? stageOf(state.round).id : nextUnfinishedStage().id;

    el.roundGrid.innerHTML = STAGES.map((stage, sIdx) => {
      const done = stageDoneCount(stage, save);
      const total = stage.rounds.length;
      const finished = done === total;
      const best = save.stages[stage.id] || 0;
      const maxScore = total * ROUND_MAX;

      const cards = stage.rounds.map((i) => {
        const round = ODD_ROUNDS[i];
        const rBest = save.rounds[round.id] || 0;
        const played = rBest > 0;
        const isCurrent = state.started && i === state.round;

        /* مهم: مانكشفش القاعدة ولا الصور هنا — ده هيحرق الجولة */
        const meta = played
          ? `أحسن نتيجة <b dir="ltr">${toArabic(rBest)}/${toArabic(ROUND_MAX)}</b>`
          : "لسه متجرّبتش";

        return `
          <button type="button" class="level-card ${isCurrent ? "is-current" : ""}"
                  data-round="${i}">
            <span class="level-card-emoji" aria-hidden="true">${played ? "🧠" : "❓"}</span>
            <span class="level-card-body">
              <span class="level-card-title">جولة رقم ${toArabic(posInStage(i) + 1)}</span>
              <span class="level-card-meta">${meta}</span>
            </span>
            ${played ? `<span class="level-card-done" title="خلّصتها">✓</span>` : ""}
          </button>`;
      }).join("");

      return `
        <details class="stage-block ${finished ? "is-done" : ""}"
                 ${stage.id === openId ? "open" : ""}>
          <summary class="stage-head">
            <span class="stage-emoji" aria-hidden="true">${stage.emoji}</span>
            <span class="stage-info">
              <b>المرحلة ${toArabic(sIdx + 1)} · ${stage.name}</b>
              <small>${best ? `أحسن نتيجة <span dir="ltr">${toArabic(best)}/${toArabic(maxScore)}</span>` : stage.tip}</small>
            </span>
            <span class="stage-progress" dir="ltr">${toArabic(done)}/${toArabic(total)}</span>
            <button type="button" class="btn btn-teal btn-sm stage-play"
                    data-stage="${sIdx}">▶ العب</button>
          </summary>
          <div class="level-grid">${cards}</div>
        </details>`;
    }).join("");
  }

  /* أول مرحلة لسه مخلصتش — عشان زرار "كمّل" يوديه على المكان الصح */
  function nextUnfinishedStage() {
    const save = loadSave();
    return STAGES.find((s) => stageDoneCount(s, save) < s.rounds.length) || STAGES[0];
  }

  function openRounds() {
    renderRoundGrid();

    el.howList.hidden = state.started;
    el.roundsTitle.textContent = state.started ? "اختار مرحلة تانية 👇" : "اختار المرحلة 👇";
    el.playAllBtn.textContent = state.started ? "▶ كمّل من حيث وقفت" : "▶ ابدأ من أول مرحلة";
    el.closeRoundsBtn.hidden = !state.started;

    hideOverlay(el.whyOverlay);
    hideOverlay(el.endOverlay);
    showOverlay(el.startOverlay);
  }

  el.roundGrid.addEventListener("click", (evt) => {
    const play = evt.target.closest(".stage-play");
    if (play) {
      /* الزرار جوّه summary، فالضغطة كانت هتفتح/تقفل المرحلة كمان */
      evt.preventDefault();
      startRun(STAGES[Number(play.dataset.stage)].rounds[0]);
      return;
    }
    const card = evt.target.closest(".level-card");
    if (!card) return;
    startRun(Number(card.dataset.round));
  });

  el.playAllBtn.addEventListener("click", () => {
    startRun(state.started ? nextUnfinishedStage().rounds[0] : STAGES[0].rounds[0]);
  });
  el.roundsBtn.addEventListener("click", openRounds);
  el.roundLevelsBtn.addEventListener("click", openRounds);
  el.endLevelsBtn.addEventListener("click", openRounds);

  /* رجوع للجولة اللي كان بيلعبها */
  el.closeRoundsBtn.addEventListener("click", () => {
    hideOverlay(el.startOverlay);
    /* لو كان خلّص الجولة، نرجّعه لشاشة القاعدة مش للشبكة */
    if (state.phase === "done") showOverlay(el.whyOverlay);
  });

  /* ============================================================
     التنقّل بين الجولات
     ============================================================ */
  el.nextRoundBtn.addEventListener("click", () => {
    if (isStageEnd(state.round)) {
      endGame();
      return;
    }
    hideOverlay(el.whyOverlay);
    /* جولات المرحلة متجاورة في الأراي، فاللي بعدها = +١ */
    startRound(state.round + 1);
  });

  el.retryRoundBtn.addEventListener("click", () => {
    /* الإعادة بتشيل نتيجة المحاولة اللي فاتت، عشان الجولة الواحدة
       متتحسبش مرتين في المجموع */
    state.runMax = Math.max(0, state.runMax - ROUND_MAX);
    state.runScore = Math.max(0, state.runScore - state.roundGained);
    state.roundGained = 0;
    hideOverlay(el.whyOverlay);
    startRound(state.round);
  });

  /* "العب تاني" = إعادة نفس المرحلة، مش الرجوع لأول اللعبة */
  el.playAgainBtn.addEventListener("click", () => startRun(stageOf(state.round).rounds[0]));

  el.nextStageBtn.addEventListener("click", () => {
    const next = STAGES[stageNumber(stageOf(state.round))];
    if (next) startRun(next.rounds[0]);
  });

  /* ============================================================
     نهاية المرحلة
     ============================================================ */
  function endGame() {
    hideOverlay(el.whyOverlay);
    sfx.win();

    const stage = stageOf(state.round);
    const next = STAGES[stageNumber(stage)];
    const max = state.runMax || stage.rounds.length * ROUND_MAX;
    const pct = max ? state.runScore / max : 0;
    const stars = pct >= 0.85 ? 3 : pct >= 0.55 ? 2 : pct > 0 ? 1 : 0;

    el.endTitle.textContent =
      stars === 3 ? `🏆 عقل مرتّب! خلّصت "${stage.name}"` :
      stars === 2 ? `🎉 شغل حلو في "${stage.name}"!` : `👏 خلّصت مرحلة "${stage.name}"`;
    el.endScore.textContent = toArabic(state.runScore);
    el.endMax.textContent = toArabic(max);
    el.endStars.textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);

    /* النتيجة بتتحفظ لكل مرحلة لوحدها — المقارنة بين مرحلتين
       مختلفتين مالهاش معنى */
    const save = loadSave();
    const prev = save.stages[stage.id] || 0;
    const isRecord = state.runScore > prev;
    if (isRecord) {
      save.stages[stage.id] = state.runScore;
      if (state.runScore > save.best) save.best = state.runScore;
      writeSave(save);
    }
    el.endBest.textContent = isRecord
      ? "🏆 رقم قياسي جديد في المرحلة دي!"
      : `أحسن نتيجة ليك في المرحلة دي: ${toArabic(prev)}`;

    el.nextStageBtn.hidden = !next;
    if (next) el.nextStageBtn.textContent = `${next.emoji} المرحلة الجاية: ${next.name} ▶`;

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
     أزرار عامة
     ============================================================ */
  el.soundBtn.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    el.soundBtn.setAttribute("aria-pressed", String(state.soundOn));
    el.soundBtn.textContent = state.soundOn ? "🔊" : "🔇";
    el.soundBtn.title = state.soundOn ? "اقفل الصوت" : "شغّل الصوت";
  });

  /* تحميل صور المرحلة في الخلفية.
     الكتالوج فيه أكتر من ٥٠ صورة — تحميلهم كلهم على الموبايل
     بيتعب الشبكة من غير داعي، فبنحمّل صور المرحلة اللي هيلعبها بس. */
  const warmed = {};
  function warmStage(stage) {
    if (!stage || warmed[stage.id]) return;
    warmed[stage.id] = true;
    stage.rounds.forEach((i) => {
      ODD_ROUNDS[i].items.forEach((id) => {
        const img = new Image();
        img.src = ODD_ITEMS[id].src;
      });
    });
  }
  function warmAssets() {
    warmStage(nextUnfinishedStage());
  }
  if (document.readyState === "complete") warmAssets();
  else window.addEventListener("load", warmAssets);

  /* شاشة الاختيار ظاهرة من الأول */
  openRounds();
})();
