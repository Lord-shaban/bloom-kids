/* ============================================================
   فحص بيانات لعبتَي "العين الحديدية" و"أوجد المختلف"

   شغّله كده من أي مكان:   node tools/check-games.js

   بيتأكد من: عدد الصور والجولات، تقسيم المراحل (٥ × ٦ ولازم
   تكون متجاورة في الأراي لأن المحرّك بيعتمد على ده)، إن كل ملف
   صورة موجود فعلاً، إن الإجابة الصح ضمن الاختيارات، إن كل جولة
   فيها سبب صح واحد بالظبط، وإن ملفات الـSVG سليمة.

   شغّله بعد أي إضافة لصورة أو جولة جديدة.
   ============================================================ */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const errors = [];
const warn = [];
const bad = (m) => errors.push(m);

const eye = require(path.join(ROOT, "js/iron-eye-scenes.js"));
const odd = require(path.join(ROOT, "js/odd-one-out-rounds.js"));

function fileOk(src) {
  return fs.existsSync(path.join(ROOT, src));
}

/* ---------- العين الحديدية ---------- */
const { EYE_STAGES, EYE_SCENES, EYE_STEPS } = eye;
if (EYE_SCENES.length !== 30) bad(`EYE: عدد الصور ${EYE_SCENES.length} مش ٣٠`);

const eyeIds = new Set();
EYE_SCENES.forEach((s, i) => {
  const at = `EYE[${i}] ${s.id}`;
  if (eyeIds.has(s.id)) bad(`${at}: id مكرر`);
  eyeIds.add(s.id);
  if (!fileOk(s.src)) bad(`${at}: الملف مش موجود ${s.src}`);
  if (!s.choices || s.choices.length !== 4) bad(`${at}: لازم ٤ اختيارات`);
  if (new Set(s.choices).size !== s.choices.length) bad(`${at}: اختيار مكرر`);
  if (!s.choices.includes(s.answer)) bad(`${at}: الإجابة مش في الاختيارات`);
  if (!s.fact) bad(`${at}: مفيش fact`);
  if (!s.emoji) bad(`${at}: مفيش emoji`);
  if (!s.focus || s.focus.x < 5 || s.focus.x > 95 || s.focus.y < 5 || s.focus.y > 95)
    bad(`${at}: focus بره النطاق الآمن ٥–٩٥`);
  if (!EYE_STAGES.some((st) => st.id === s.stage)) bad(`${at}: stage غير معروف "${s.stage}"`);
});

/* الصور لازم تكون متجاورة في كل مرحلة — المحرّك بيعتمد على ده في "الصورة الجاية" */
EYE_STAGES.forEach((st) => {
  const idx = EYE_SCENES.map((s, i) => (s.stage === st.id ? i : -1)).filter((i) => i >= 0);
  if (idx.length !== 6) bad(`EYE stage ${st.id}: ${idx.length} صورة (المفروض ٦)`);
  idx.forEach((v, k) => {
    if (k && v !== idx[k - 1] + 1) bad(`EYE stage ${st.id}: الصور مش متجاورة في الأراي`);
  });
});
if (EYE_STAGES.length !== 5) bad(`EYE: ${EYE_STAGES.length} مراحل (المفروض ٥)`);

/* ---------- أوجد المختلف ---------- */
const { ODD_ITEMS, ODD_STAGES, ODD_ROUNDS } = odd;
if (ODD_ROUNDS.length !== 30) bad(`ODD: عدد الجولات ${ODD_ROUNDS.length} مش ٣٠`);

Object.entries(ODD_ITEMS).forEach(([id, item]) => {
  if (!fileOk(item.src)) bad(`ODD item ${id}: الملف مش موجود ${item.src}`);
  if (!item.label) bad(`ODD item ${id}: مفيش label`);
});

const used = new Set();
const oddIds = new Set();
ODD_ROUNDS.forEach((r, i) => {
  const at = `ODD[${i}] ${r.id}`;
  if (oddIds.has(r.id)) bad(`${at}: id مكرر`);
  oddIds.add(r.id);
  if (r.items.length !== 4) bad(`${at}: لازم ٤ صور`);
  if (new Set(r.items).size !== 4) bad(`${at}: صورة مكررة في نفس الجولة`);
  r.items.forEach((id) => {
    if (!ODD_ITEMS[id]) bad(`${at}: العنصر "${id}" مش في الكتالوج`);
    used.add(id);
  });
  if (!r.items.includes(r.odd)) bad(`${at}: المختلف مش من ضمن الصور`);
  if (!r.rule) bad(`${at}: مفيش rule`);
  if (r.reasons.length !== 3) bad(`${at}: لازم ٣ أسباب`);
  const ok = r.reasons.filter((x) => x.ok).length;
  if (ok !== 1) bad(`${at}: لازم سبب صح واحد بالظبط (لقينا ${ok})`);
  if (new Set(r.reasons.map((x) => x.text)).size !== 3) bad(`${at}: سبب مكرر`);
  if (!ODD_STAGES.some((st) => st.id === r.stage)) bad(`${at}: stage غير معروف "${r.stage}"`);
});

ODD_STAGES.forEach((st) => {
  const idx = ODD_ROUNDS.map((r, i) => (r.stage === st.id ? i : -1)).filter((i) => i >= 0);
  if (idx.length !== 6) bad(`ODD stage ${st.id}: ${idx.length} جولة (المفروض ٦)`);
  idx.forEach((v, k) => {
    if (k && v !== idx[k - 1] + 1) bad(`ODD stage ${st.id}: الجولات مش متجاورة في الأراي`);
  });
});

Object.keys(ODD_ITEMS).forEach((id) => {
  if (!used.has(id)) warn.push(`ODD: العنصر "${id}" في الكتالوج بس مش مستعمل في أي جولة`);
});

/* نفس مجموعة الصور اتكررت في جولتين؟ */
const seenSets = {};
ODD_ROUNDS.forEach((r) => {
  const key = r.items.slice().sort().join(",");
  if (seenSets[key]) bad(`ODD: جولة "${r.id}" نفس صور جولة "${seenSets[key]}"`);
  seenSets[key] = r.id;
});

/* ---------- كل ملفات الـSVG سليمة؟ ---------- */
["assets/images/game/eye", "assets/images/game/odd"].forEach((dir) => {
  fs.readdirSync(path.join(ROOT, dir)).forEach((f) => {
    if (!f.endsWith(".svg")) return;
    const txt = fs.readFileSync(path.join(ROOT, dir, f), "utf8");
    if (!/^<svg[\s>]/m.test(txt)) bad(`SVG ${dir}/${f}: مفيهوش وسم svg`);
    if (!txt.trimEnd().endsWith("</svg>")) bad(`SVG ${dir}/${f}: مش مقفول صح`);
    if (!/viewBox="0 0 800 800"/.test(txt)) bad(`SVG ${dir}/${f}: viewBox مش 800×800`);
    if (!/<title>/.test(txt)) bad(`SVG ${dir}/${f}: مفيش title`);
    const open = (txt.match(/<(?!\/|\?|!)[a-zA-Z]/g) || []).length;
    const close = (txt.match(/<\//g) || []).length + (txt.match(/\/>/g) || []).length;
    if (open !== close) bad(`SVG ${dir}/${f}: وسوم مش متوازنة (${open} فتح / ${close} قفل)`);
  });
});

console.log(`صور العين: ${EYE_SCENES.length} | جولات المختلف: ${ODD_ROUNDS.length} | كتالوج: ${Object.keys(ODD_ITEMS).length}`);
warn.forEach((w) => console.log("⚠️  " + w));
if (errors.length) {
  console.log("\n❌ مشاكل:");
  errors.forEach((e) => console.log("   " + e));
  process.exit(1);
}
console.log("✅ كل البيانات سليمة");
