/* ============================================================
   Bloom Kids — لعبة "أوجد المختلف"
   بيانات الجولات

   فكرة اللعبة: ٤ صور، تلاتة منهم بينهم حاجة مشتركة وواحدة مختلفة.
   الطفل يختار المختلفة، وبعدين يقول ليه — والجزء التاني ده هو
   أهم حاجة في اللعبة، لأن اللعبة أصلاً بتعلّم التصنيف والتفكير
   مش التخمين.

   ⚠️ أهم قاعدة وإنت بتضيف جولة جديدة:
   لازم يكون فيه **تجميعة واحدة بس** ممكنة للتلاتة. المشكلة الشهيرة
   في اللعبة دي إن الطفل يلاقي تجميعة تانية صح وإحنا محسبينهاش غلط.
   مثال على جولة **غلط**: كورة، ساعة، بيتزا، كتاب —
     • تلاتة مدوّرين (الكتاب مختلف) ✔
     • بس كمان البيتزا هي الوحيدة اللي بتتاكل ✔
   فبقى فيه إجابتين مظبوطين. الحل إن البطيخة تاخد مكان الساعة، عشان
   يبقى فيه اتنين بيتاكلوا واتنين لأ، وتفضل "الاستدارة" هي التجميعة
   الوحيدة. راجع كل جولة جديدة بالطريقة دي قبل ما تضيفها.
   ============================================================ */

/* كتالوج الصور — الجولات بتشاور على الـ id عشان مفيش مسارات مكرّرة.
   بعض الصور مشتركة مع لعبة "العين الحديدية". */
const ODD_ITEMS = {
  watermelon: { label: "بطيخة",  src: "assets/images/game/eye/watermelon.svg" },
  strawberry: { label: "فراولة", src: "assets/images/game/eye/strawberry.svg" },
  football:   { label: "كورة",   src: "assets/images/game/eye/football.svg" },
  pizza:      { label: "بيتزا",  src: "assets/images/game/eye/pizza.svg" },
  cake:       { label: "تورتة",  src: "assets/images/game/eye/cake.svg" },
  giraffe:    { label: "زرافة",  src: "assets/images/game/eye/giraffe.svg" },
  bee:        { label: "نحلة",   src: "assets/images/game/eye/bee.svg" },
  fish:       { label: "سمكة",   src: "assets/images/game/eye/fish.svg" },
  butterfly:  { label: "فراشة",  src: "assets/images/game/eye/butterfly.svg" },

  banana:     { label: "موزة",   src: "assets/images/game/odd/banana.svg" },
  bird:       { label: "عصفور",  src: "assets/images/game/odd/bird.svg" },
  clock:      { label: "ساعة",   src: "assets/images/game/odd/clock.svg" },
  book:       { label: "كتاب",   src: "assets/images/game/odd/book.svg" },
  car:        { label: "عربية",  src: "assets/images/game/odd/car.svg" },
  plane:      { label: "طيارة",  src: "assets/images/game/odd/plane.svg" },
  boat:       { label: "مركب",   src: "assets/images/game/odd/boat.svg" },
  house:      { label: "بيت",    src: "assets/images/game/odd/house.svg" },
  sun:        { label: "شمس",    src: "assets/images/game/odd/sun.svg" },
  lamp:       { label: "لمبة",   src: "assets/images/game/odd/lamp.svg" },
  candle:     { label: "شمعة",   src: "assets/images/game/odd/candle.svg" },
};

/* الجولات مرتّبة من الأسهل للأصعب — التصنيف بالنوع الأول،
   وبعدين بالشكل والوظيفة، وفي الآخر تصنيف مجرّد */
const ODD_ROUNDS = [
  {
    id: "fruit",
    items: ["watermelon", "strawberry", "banana", "football"],
    odd: "football",
    rule: "التلاتة التانيين فاكهة بناكلها — والكورة لعبة بنلعب بيها ⚽",
    reasons: [
      { text: "التلاتة التانيين فاكهة بناكلها", ok: true },
      { text: "التلاتة التانيين لونهم أحمر", ok: false },
      { text: "التلاتة التانيين شكلهم دايرة", ok: false },
    ],
  },
  {
    id: "animals",
    items: ["giraffe", "bee", "fish", "cake"],
    odd: "cake",
    rule: "التلاتة التانيين حيوانات عايشة بتتحرك — والتورتة أكل 🎂",
    reasons: [
      { text: "التلاتة التانيين حيوانات عايشة", ok: true },
      { text: "التلاتة التانيين بيطيروا", ok: false },
      { text: "التلاتة التانيين بناكلهم", ok: false },
    ],
  },
  {
    id: "sky",
    items: ["sun", "plane", "bird", "fish"],
    odd: "fish",
    rule: "التلاتة التانيين بنشوفهم فوق في السما — والسمكة عايشة في المية 🌊",
    reasons: [
      { text: "التلاتة التانيين بنشوفهم فوق في السما", ok: true },
      { text: "التلاتة التانيين كائنات حية", ok: false },
      { text: "التلاتة التانيين لونهم أصفر", ok: false },
    ],
  },
  {
    id: "round",
    items: ["watermelon", "pizza", "football", "book"],
    odd: "book",
    rule: "التلاتة التانيين شكلهم دايرة — والكتاب مستطيل 📕",
    reasons: [
      { text: "التلاتة التانيين شكلهم دايرة", ok: true },
      { text: "التلاتة التانيين بناكلهم", ok: false },
      { text: "التلاتة التانيين بنلعب بيهم", ok: false },
    ],
  },
  {
    id: "sweet",
    items: ["cake", "strawberry", "banana", "pizza"],
    odd: "pizza",
    rule: "التلاتة التانيين طعمهم حلو — والبيتزا طعمها مالح 🍕",
    reasons: [
      { text: "التلاتة التانيين طعمهم حلو", ok: true },
      { text: "التلاتة التانيين فاكهة", ok: false },
      { text: "التلاتة التانيين بنعملهم في الفرن", ok: false },
    ],
  },
  {
    id: "transport",
    items: ["car", "plane", "boat", "house"],
    odd: "house",
    rule: "التلاتة التانيين بيوصّلونا من مكان لمكان — والبيت ثابت مكانه 🏠",
    reasons: [
      { text: "التلاتة التانيين بيوصّلونا من مكان لمكان", ok: true },
      { text: "التلاتة التانيين بيمشوا على عجل", ok: false },
      { text: "التلاتة التانيين بيطيروا في السما", ok: false },
    ],
  },
  {
    id: "light",
    items: ["sun", "lamp", "candle", "clock"],
    odd: "clock",
    rule: "التلاتة التانيين بيدّونا نور — والساعة بتقولنا الوقت بس 🕐",
    reasons: [
      { text: "التلاتة التانيين بيدّونا نور", ok: true },
      { text: "التلاتة التانيين شكلهم دايرة", ok: false },
      { text: "التلاتة التانيين بنشتريهم من الدكان", ok: false },
    ],
  },
  {
    id: "alive",
    /* أصعب جولة: الأربعة كلهم بيطيروا، فـ"الطيران" مش هيفرز حد.
       الفرق الوحيد إن تلاتة كائنات حية وواحدة آلة */
    items: ["bee", "butterfly", "bird", "plane"],
    odd: "plane",
    rule: "الأربعة كلهم بيطيروا! بس التلاتة التانيين كائنات حية — والطيارة آلة الناس صنعتها ✈️",
    reasons: [
      { text: "التلاتة التانيين كائنات حية", ok: true },
      { text: "التلاتة التانيين بيطيروا", ok: false },
      { text: "التلاتة التانيين ليهم جناحين", ok: false },
    ],
  },
];

/* النقط: اختيار الصورة صح من أول مرة = ٢، ومعرفة السبب = ١ */
const ODD_PICK_POINTS = 2;
const ODD_REASON_POINTS = 1;

/* عشان نقدر نتأكد من البيانات في node وقت التطوير */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ODD_ITEMS, ODD_ROUNDS, ODD_PICK_POINTS, ODD_REASON_POINTS };
}
