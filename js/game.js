/* ============================================================
   Bloom Kids — محرّك لعبة "اكتشف الفروق"
   بيعتمد على js/game-scenes.js (بيانات المراحل)
   ============================================================ */
(function () {
  "use strict";

  const BEST_KEY = "bloomkids_diff_best_v1";

  /* أقل مساحة ضغط لأي فرق (بوحدات الـ viewBox). في مراحل الصور فيه
     فروق صغيرة زي المصاصة والنجمة، ودايرتها الحقيقية أصغر من إن
     صباع على الموبايل يصيبها — فبنوسّع منطقة الضغط من غير ما
     نكبّر الدايرة اللي بتترسم. لو اتنين قريبين، الأقرب بيكسب. */
  const MIN_HIT = 22;

  /* عدد التلميحات بيزيد مع عدد الفروق — مرحلة فيها ٩ فروق
     مش زي واحدة فيها ٥ */
  function hintsFor(scene) {
    if (typeof scene.hints === "number") return scene.hints;
    return Math.min(5, Math.max(3, Math.ceil(scene.diffs.length / 2)));
  }

  /* ---------- عناصر الصفحة ---------- */
  const el = {
    boards: document.getElementById("boards"),
    svgA: null,
    svgB: null,
    levelName: document.getElementById("levelName"),
    levelPips: document.getElementById("levelPips"),
    foundCount: document.getElementById("foundCount"),
    totalCount: document.getElementById("totalCount"),
    timer: document.getElementById("timer"),
    misses: document.getElementById("misses"),
    hintCount: document.getElementById("hintCount"),
    hintBtn: document.getElementById("hintBtn"),
    restartBtn: document.getElementById("restartBtn"),
    soundBtn: document.getElementById("soundBtn"),
    progressBar: document.getElementById("progressBar"),
    toast: document.getElementById("toast"),
    startOverlay: document.getElementById("startOverlay"),
    levelGrid: document.getElementById("levelGrid"),
    levelsTitle: document.getElementById("levelsTitle"),
    howList: document.getElementById("howList"),
    levelsBtn: document.getElementById("levelsBtn"),
    closeLevelsBtn: document.getElementById("closeLevelsBtn"),
    winLevelsBtn: document.getElementById("winLevelsBtn"),
    winOverlay: document.getElementById("winOverlay"),
    winTitle: document.getElementById("winTitle"),
    winStats: document.getElementById("winStats"),
    winBest: document.getElementById("winBest"),
    nextBtn: document.getElementById("nextBtn"),
    replayBtn: document.getElementById("replayBtn"),
    confetti: document.getElementById("confetti"),
    sceneHint: document.getElementById("sceneHint"),
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* إظهار/إخفاء الطبقات — بنشيل hidden الأول عشان الأنيميشن يشتغل،
     وبنرجّعها بعد ما الشفافية تخلص عشان الطبقة متبلعش ضغطات اللاعب */
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

  /* ---------- حالة اللعبة ---------- */
  const state = {
    level: 0,
    found: new Set(),
    misses: 0,
    hints: 3,
    hintsMax: 3,
    seconds: 0,
    timerId: null,
    running: false,
    soundOn: true,
    started: false, // في مرحلة شغّالة ولا لسه محدش بدأ؟
  };

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
     رسم المرحلة
     ============================================================ */
  function buildSvg(scene, variant) {
    const box = scene.viewBox;
    const [, , w, h] = box.split(/\s+/).map(Number);
    const src = variant === "a" ? scene.imgA : scene.imgB;

    /* الصورة جوه الـ SVG مش <img> عادية، عشان علامات الفروق
       تتحط بنفس إحداثيات الـ viewBox من غير أي حسابات زيادة */
    return `
      <svg viewBox="${box}" class="scene" role="img"
           aria-label="صورة ${variant === "a" ? "أولى" : "تانية"} — دوّر على الفروق">
        <g class="scene-art">
          <image href="${src}" x="0" y="0" width="${w}" height="${h}"
                 preserveAspectRatio="none"/>
        </g>
        <g class="scene-fx"></g>
      </svg>`;
  }

  function loadLevel(index) {
    const scene = SCENES[index];
    state.level = index;
    state.started = true;
    state.found = new Set();
    state.misses = 0;
    state.hintsMax = hintsFor(scene);
    state.hints = state.hintsMax;
    state.seconds = 0;
    el.confetti.innerHTML = ""; // منظّفش كونفيتي المرحلة اللي فاتت فوق المرحلة الجديدة

    el.boards.innerHTML = `
      <figure class="board">
        <figcaption class="board-tag">الصورة الأولى</figcaption>
        ${buildSvg(scene, "a")}
      </figure>
      <figure class="board">
        <figcaption class="board-tag board-tag-alt">الصورة التانية</figcaption>
        ${buildSvg(scene, "b")}
      </figure>`;

    const svgs = el.boards.querySelectorAll("svg.scene");
    el.svgA = svgs[0];
    el.svgB = svgs[1];
    svgs.forEach((svg) => svg.addEventListener("click", onBoardClick));

    el.levelName.textContent = `${scene.emoji} ${scene.title}`;
    el.sceneHint.textContent = scene.hint;
    el.totalCount.textContent = toArabic(scene.diffs.length);
    el.levelPips.innerHTML = SCENES.map(
      (_, i) => `<span class="pip ${i === index ? "is-active" : ""} ${i < index ? "is-done" : ""}"></span>`
    ).join("");

    updateHud();
    startTimer();
  }

  /* ============================================================
     التعامل مع الضغط
     ============================================================ */
  function svgPoint(svg, evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: -999, y: -999 };
    return pt.matrixTransform(ctm.inverse());
  }

  function onBoardClick(evt) {
    if (!state.running) return;
    const svg = evt.currentTarget;
    const p = svgPoint(svg, evt);
    const scene = SCENES[state.level];

    /* ندوّر على أقرب فرق لسه متلقاش.
       منطقة الضغط = الأكبر بين دايرة الفرق و MIN_HIT، عشان الفروق
       الصغيرة تفضل قابلة للضغط بالصباع. ولأننا بنختار الأقرب،
       فرقين متلاصقين مش هيتلخبطوا في بعض. */
    let hit = null;
    let bestDist = Infinity;
    scene.diffs.forEach((d) => {
      if (state.found.has(d.id)) return;
      const dist = Math.hypot(p.x - d.x, p.y - d.y);
      if (dist <= Math.max(d.r, MIN_HIT) && dist < bestDist) {
        bestDist = dist;
        hit = d;
      }
    });

    if (hit) {
      registerFound(hit);
    } else {
      registerMiss(svg, p);
    }
  }

  /* ---------- إجابة صح ---------- */
  function registerFound(diff) {
    state.found.add(diff.id);
    sfx.correct();

    [el.svgA, el.svgB].forEach((svg) => {
      const fx = svg.querySelector(".scene-fx");
      fx.insertAdjacentHTML("beforeend", markerMarkup(diff));
    });

    showToast(`👏 لقيتها: ${diff.label}`, "ok");
    updateHud();

    const scene = SCENES[state.level];
    if (state.found.size === scene.diffs.length) {
      window.setTimeout(winLevel, 620);
    }
  }

  function markerMarkup(d) {
    const circ = 2 * Math.PI * d.r;
    const sparks = reduceMotion
      ? ""
      : Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI * 2 / 6) * i - Math.PI / 2;
          const dx = Math.cos(a) * (d.r + 20);
          const dy = Math.sin(a) * (d.r + 20);
          return `<circle class="spark" cx="${d.x}" cy="${d.y}" r="4.5"
            style="--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;animation-delay:${i * 35}ms"/>`;
        }).join("");

    // الشارة على حرف الدايرة (فوق-يمين) عشان الفرق نفسه يفضل باين
    const bx = d.x + d.r * 0.72;
    const by = d.y - d.r * 0.72;

    return `<g class="marker" style="transform-origin:${d.x}px ${d.y}px">
      <circle class="marker-halo" cx="${d.x}" cy="${d.y}" r="${d.r}"/>
      <circle class="marker-ring" cx="${d.x}" cy="${d.y}" r="${d.r}"
        style="stroke-dasharray:${circ.toFixed(1)};stroke-dashoffset:${circ.toFixed(1)}"/>
      <g class="marker-tick" style="transform-origin:${bx.toFixed(1)}px ${by.toFixed(1)}px">
        <circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="11"
          fill="#5aa832" stroke="#ffffff" stroke-width="2.5"/>
        <path d="M${(bx - 4.8).toFixed(1)} ${by.toFixed(1)}
                 l3.2 3.6 l6.4 -7.2"/>
      </g>
      ${sparks}
    </g>`;
  }

  /* ---------- إجابة غلط ---------- */
  function registerMiss(svg, p) {
    state.misses += 1;
    sfx.wrong();
    updateHud();

    const fx = svg.querySelector(".scene-fx");
    const node = document.createElementNS("http://www.w3.org/2000/svg", "g");
    node.setAttribute("class", "miss");
    node.setAttribute("style", `transform-origin:${p.x}px ${p.y}px`);
    node.innerHTML = `
      <circle class="miss-ring" cx="${p.x}" cy="${p.y}" r="22"/>
      <path class="miss-x" d="M${p.x - 9} ${p.y - 9}L${p.x + 9} ${p.y + 9}
        M${p.x + 9} ${p.y - 9}L${p.x - 9} ${p.y + 9}"/>`;
    fx.appendChild(node);
    window.setTimeout(() => node.remove(), 700);

    const board = svg.closest(".board");
    board.classList.remove("is-wrong");
    void board.offsetWidth; // إعادة تشغيل الأنيميشن
    board.classList.add("is-wrong");
    window.setTimeout(() => board.classList.remove("is-wrong"), 480);

    showToast("مش هنا… حاول تاني 💪", "no");
  }

  /* ---------- تلميح ---------- */
  function useHint() {
    if (!state.running || state.hints <= 0) return;
    const scene = SCENES[state.level];
    const remaining = scene.diffs.filter((d) => !state.found.has(d.id));
    if (!remaining.length) return;

    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    state.hints -= 1;
    sfx.hint();
    updateHud();

    [el.svgA, el.svgB].forEach((svg) => {
      const fx = svg.querySelector(".scene-fx");
      const node = document.createElementNS("http://www.w3.org/2000/svg", "g");
      node.setAttribute("class", "hint");
      node.innerHTML = `<circle class="hint-ring" cx="${pick.x}" cy="${pick.y}" r="${pick.r + 6}"/>`;
      fx.appendChild(node);
      window.setTimeout(() => node.remove(), 2600);
    });

    showToast("🔎 بصّ في الدايرة دي كده!", "hint");
  }

  /* ============================================================
     الواجهة (HUD)
     ============================================================ */
  function toArabic(n) {
    return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${toArabic(String(m).padStart(2, "0"))}:${toArabic(String(r).padStart(2, "0"))}`;
  }

  function updateHud() {
    const scene = SCENES[state.level];
    el.foundCount.textContent = toArabic(state.found.size);
    el.misses.textContent = toArabic(state.misses);
    el.hintCount.textContent = toArabic(state.hints);
    el.hintBtn.disabled = state.hints <= 0;
    const pct = (state.found.size / scene.diffs.length) * 100;
    el.progressBar.style.width = `${pct}%`;
  }

  let toastId = null;
  function showToast(msg, kind) {
    el.toast.textContent = msg;
    el.toast.className = `toast is-show toast-${kind}`;
    window.clearTimeout(toastId);
    toastId = window.setTimeout(() => {
      el.toast.className = "toast";
    }, 1600);
  }

  /* runTimer بتكمّل من الوقت الحالي — بنستخدمها لما اللاعب يرجع
     من شاشة المراحل، عشان الوقت ميتصفّرش عليه */
  function runTimer() {
    window.clearInterval(state.timerId);
    state.timerId = window.setInterval(() => {
      state.seconds += 1;
      el.timer.textContent = fmtTime(state.seconds);
    }, 1000);
  }

  function startTimer() {
    state.seconds = 0;
    el.timer.textContent = fmtTime(0);
    runTimer();
  }

  function pauseTimer() {
    window.clearInterval(state.timerId);
  }

  /* ============================================================
     نهاية المرحلة
     ============================================================ */
  function bestTimes() {
    try {
      return JSON.parse(localStorage.getItem(BEST_KEY) || "{}");
    } catch (_) {
      return {};
    }
  }

  function winLevel() {
    state.running = false;
    window.clearInterval(state.timerId);
    sfx.win();

    const scene = SCENES[state.level];
    const isLast = state.level === SCENES.length - 1;

    // أحسن وقت
    const best = bestTimes();
    const prev = best[scene.id];
    const isRecord = !prev || state.seconds < prev;
    if (isRecord) {
      best[scene.id] = state.seconds;
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(best));
      } catch (_) {
        /* لو الستوريدج مقفول، مش مشكلة */
      }
    }

    // "خلّصت كل المراحل" تتقال لما يكون فعلاً خلّص كل المراحل —
    // مش لما يوصل لآخر واحدة، لأنه ممكن يكون نطّ عليها من شاشة الاختيار
    const allDone = SCENES.every((s) => typeof best[s.id] === "number");
    el.winTitle.textContent = allDone ? "🎉 برافو! خلّصت كل المراحل" : "🎉 برافو! لقيت كل الفروق";
    el.winStats.innerHTML = `
      <span class="stat-chip"><b>${fmtTime(state.seconds)}</b> الوقت</span>
      <span class="stat-chip"><b>${toArabic(state.misses)}</b> محاولة غلط</span>
      <span class="stat-chip"><b>${toArabic(state.hintsMax - state.hints)}</b> تلميح</span>`;
    el.winBest.textContent = isRecord
      ? "🏆 رقم قياسي جديد!"
      : `أحسن وقت ليك: ${fmtTime(best[scene.id])}`;

    el.nextBtn.hidden = isLast;
    showOverlay(el.winOverlay);
    if (!reduceMotion) fireConfetti();
  }

  function fireConfetti() {
    const colors = ["#ef5f7c", "#23a89f", "#f6a92c", "#6a4fb6", "#7dc242"];
    el.confetti.innerHTML = Array.from({ length: 46 }, () => {
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
     اختيار المرحلة — كل المراحل مفتوحة من الأول
     ============================================================ */
  function renderLevelGrid() {
    const best = bestTimes();

    el.levelGrid.innerHTML = SCENES.map((scene, i) => {
      const done = typeof best[scene.id] === "number";
      const isCurrent = state.started && i === state.level;
      const meta = done
        ? `أحسن وقت <b dir="ltr">${fmtTime(best[scene.id])}</b>`
        : `${toArabic(scene.diffs.length)} فروق`;

      return `
        <button type="button" class="level-card ${isCurrent ? "is-current" : ""}"
                data-level="${i}">
          <span class="level-card-emoji" aria-hidden="true">${scene.emoji}</span>
          <span class="level-card-body">
            <span class="level-card-title">${toArabic(i + 1)}. ${scene.title}</span>
            <span class="level-card-meta">${meta}</span>
          </span>
          ${done ? `<span class="level-card-done" title="خلّصتها">✓</span>` : ""}
        </button>`;
    }).join("");
  }

  function openLevels() {
    pauseTimer();
    state.running = false;
    renderLevelGrid();

    // أول مرة بس بنوريه شرح اللعبة؛ بعد كده الشاشة تبقى قايمة مراحل بس
    el.howList.hidden = state.started;
    el.levelsTitle.textContent = state.started ? "اختار مرحلة تانية 👇" : "اختار المرحلة 👇";
    el.closeLevelsBtn.hidden = !state.started;

    hideOverlay(el.winOverlay);
    showOverlay(el.startOverlay);
  }

  function startLevel(index) {
    hideOverlay(el.startOverlay);
    hideOverlay(el.winOverlay);
    state.running = true;
    loadLevel(index);
  }

  el.levelGrid.addEventListener("click", (evt) => {
    const card = evt.target.closest(".level-card");
    if (!card) return;
    startLevel(Number(card.dataset.level));
  });

  el.levelsBtn.addEventListener("click", openLevels);
  el.winLevelsBtn.addEventListener("click", openLevels);

  /* رجوع للمرحلة اللي كان بيلعبها — من غير ما الوقت يتصفّر */
  el.closeLevelsBtn.addEventListener("click", () => {
    hideOverlay(el.startOverlay);

    // لو كان خلّص المرحلة خلاص، نرجّعله شاشة الفوز مش اللعب
    if (state.found.size === SCENES[state.level].diffs.length) {
      showOverlay(el.winOverlay);
      return;
    }
    state.running = true;
    runTimer();
  });

  /* ============================================================
     الأزرار
     ============================================================ */

  el.hintBtn.addEventListener("click", useHint);

  el.restartBtn.addEventListener("click", () => startLevel(state.level));

  el.nextBtn.addEventListener("click", () => {
    startLevel(Math.min(state.level + 1, SCENES.length - 1));
  });

  el.replayBtn.addEventListener("click", () => startLevel(state.level));

  el.soundBtn.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    el.soundBtn.setAttribute("aria-pressed", String(state.soundOn));
    el.soundBtn.textContent = state.soundOn ? "🔊" : "🔇";
    el.soundBtn.title = state.soundOn ? "اقفل الصوت" : "شغّل الصوت";
  });

  /* تحميل صور المراحل في الخلفية بعد ما الصفحة تخلص، عشان اللاعب
     ميستناش لما يفتح مرحلة بصور */
  function warmPhotoAssets() {
    SCENES.forEach((scene) => {
      [scene.imgA, scene.imgB].forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    });
  }
  if (document.readyState === "complete") warmPhotoAssets();
  else window.addEventListener("load", warmPhotoAssets);

  /* شاشة اختيار المرحلة ظاهرة من الأول */
  openLevels();
})();
