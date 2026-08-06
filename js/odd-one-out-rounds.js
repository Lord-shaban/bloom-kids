/* ============================================================
   Bloom Kids — لعبة "أوجد المختلف"
   بيانات المراحل والجولات

   فكرة اللعبة: ٤ صور، تلاتة منهم بينهم حاجة مشتركة وواحدة مختلفة.
   الطفل يختار المختلفة، وبعدين يقول ليه — والجزء التاني ده هو
   أهم حاجة في اللعبة، لأن اللعبة أصلاً بتعلّم التصنيف والتفكير
   مش التخمين.

   ٣٠ جولة مقسومة على ٥ مراحل × ٦ جولات، من التصنيف بالنوع
   (أسهل حاجة) لحد التصنيف المجرّد (طبيعة/صناعة، حي/آلة).

   ⚠️ أهم قاعدة وإنت بتضيف جولة جديدة:
   لازم يكون فيه **تجميعة واحدة بس** ممكنة للتلاتة. المشكلة الشهيرة
   في اللعبة دي إن الطفل يلاقي تجميعة تانية صح وإحنا محسبينهاش غلط.
   مثال على جولة **غلط**: كورة، ساعة، بيتزا، كتاب —
     • تلاتة مدوّرين (الكتاب مختلف) ✔
     • بس كمان البيتزا هي الوحيدة اللي بتتاكل ✔
   فبقى فيه إجابتين مظبوطين. الحل إن البطيخة تاخد مكان الساعة، عشان
   يبقى فيه اتنين بيتاكلوا واتنين لأ، وتفضل "الاستدارة" هي التجميعة
   الوحيدة. راجع كل جولة جديدة بالطريقة دي قبل ما تضيفها.

   💡 حيلة بنستعملها في المراحل الصعبة: نخلّي الصفة الواضحة تنطبق
   على **الأربعة** (زي "كلهم بيطيروا" أو "كلهم ليهم عجل")، فتبقى
   الصفة دي مش فارقة، والطفل مضطر يدوّر على فرق أعمق. الصفة دي
   بنحطها في الأسباب الغلط عن قصد — مش خدعة، ده بالظبط اللي
   بيعلّمه إن "الوصف الصح" مش شرط يكون "السبب الصح".
   ============================================================ */

/* كتالوج الصور — الجولات بتشاور على الـ id عشان مفيش مسارات مكرّرة.
   أغلب الصور مشتركة مع لعبة "العين الحديدية". */
const ODD_ITEMS = {
  /* --- فاكهة وأكل --- */
  watermelon: { label: "بطيخة",   src: "assets/images/game/eye/watermelon.svg" },
  strawberry: { label: "فراولة",  src: "assets/images/game/eye/strawberry.svg" },
  apple:      { label: "تفاحة",   src: "assets/images/game/eye/apple.svg" },
  orange:     { label: "برتقانة", src: "assets/images/game/eye/orange.svg" },
  grapes:     { label: "عنب",     src: "assets/images/game/eye/grapes.svg" },
  pineapple:  { label: "أناناس",  src: "assets/images/game/eye/pineapple.svg" },
  banana:     { label: "موزة",    src: "assets/images/game/odd/banana.svg" },
  carrot:     { label: "جزرة",    src: "assets/images/game/eye/carrot.svg" },
  corn:       { label: "ذرة",     src: "assets/images/game/eye/corn.svg" },
  pizza:      { label: "بيتزا",   src: "assets/images/game/eye/pizza.svg" },
  cake:       { label: "تورتة",   src: "assets/images/game/eye/cake.svg" },
  iceCream:   { label: "آيس كريم", src: "assets/images/game/eye/ice-cream.svg" },

  /* --- حيوانات --- */
  giraffe:    { label: "زرافة",   src: "assets/images/game/eye/giraffe.svg" },
  zebra:      { label: "حمار وحشي", src: "assets/images/game/eye/zebra.svg" },
  elephant:   { label: "فيل",     src: "assets/images/game/eye/elephant.svg" },
  cat:        { label: "قطة",     src: "assets/images/game/eye/cat.svg" },
  owl:        { label: "بومة",    src: "assets/images/game/eye/owl.svg" },
  penguin:    { label: "بطريق",   src: "assets/images/game/eye/penguin.svg" },
  peacock:    { label: "طاووس",   src: "assets/images/game/eye/peacock.svg" },
  bee:        { label: "نحلة",    src: "assets/images/game/eye/bee.svg" },
  butterfly:  { label: "فراشة",   src: "assets/images/game/eye/butterfly.svg" },
  ladybug:    { label: "دعسوقة",  src: "assets/images/game/eye/ladybug.svg" },
  fish:       { label: "سمكة",    src: "assets/images/game/eye/fish.svg" },
  crab:       { label: "كابوريا", src: "assets/images/game/eye/crab.svg" },
  turtle:     { label: "سلحفاة",  src: "assets/images/game/eye/turtle.svg" },
  bird:       { label: "عصفور",   src: "assets/images/game/odd/bird.svg" },

  /* --- طبيعة وسما --- */
  sun:        { label: "شمس",     src: "assets/images/game/odd/sun.svg" },
  moon:       { label: "قمر",     src: "assets/images/game/odd/moon.svg" },
  star:       { label: "نجمة",    src: "assets/images/game/odd/star.svg" },
  cloud:      { label: "سحابة",   src: "assets/images/game/odd/cloud.svg" },
  rainbow:    { label: "قوس قزح", src: "assets/images/game/eye/rainbow.svg" },
  tree:       { label: "شجرة",    src: "assets/images/game/odd/tree.svg" },
  flower:     { label: "وردة",    src: "assets/images/game/odd/flower.svg" },
  sunflower:  { label: "عبّاد الشمس", src: "assets/images/game/eye/sunflower.svg" },

  /* --- مواصلات --- */
  car:        { label: "عربية",   src: "assets/images/game/odd/car.svg" },
  plane:      { label: "طيارة",   src: "assets/images/game/odd/plane.svg" },
  boat:       { label: "مركب",    src: "assets/images/game/odd/boat.svg" },
  bicycle:    { label: "عجلة",    src: "assets/images/game/odd/bicycle.svg" },
  train:      { label: "قطر",     src: "assets/images/game/odd/train.svg" },

  /* --- حاجات حوالينا --- */
  house:      { label: "بيت",     src: "assets/images/game/odd/house.svg" },
  clock:      { label: "ساعة",    src: "assets/images/game/odd/clock.svg" },
  book:       { label: "كتاب",    src: "assets/images/game/odd/book.svg" },
  pencil:     { label: "قلم",     src: "assets/images/game/odd/pencil.svg" },
  scissors:   { label: "مقص",     src: "assets/images/game/odd/scissors.svg" },
  lamp:       { label: "لمبة",    src: "assets/images/game/odd/lamp.svg" },
  candle:     { label: "شمعة",    src: "assets/images/game/odd/candle.svg" },
  cup:        { label: "كوباية",  src: "assets/images/game/odd/cup.svg" },
  phone:      { label: "تليفون",  src: "assets/images/game/odd/phone.svg" },
  shirt:      { label: "تيشيرت",  src: "assets/images/game/odd/shirt.svg" },
  shoe:       { label: "جزمة",    src: "assets/images/game/odd/shoe.svg" },
  hat:        { label: "قبعة",    src: "assets/images/game/odd/hat.svg" },
  umbrella:   { label: "شمسية",   src: "assets/images/game/eye/umbrella.svg" },
  balloon:    { label: "بالونة",  src: "assets/images/game/eye/balloon.svg" },
  football:   { label: "كورة",    src: "assets/images/game/eye/football.svg" },
  basketball: { label: "كورة سلة", src: "assets/images/game/eye/basketball.svg" },
  drum:       { label: "طبلة",    src: "assets/images/game/odd/drum.svg" },
  guitar:     { label: "جيتار",   src: "assets/images/game/odd/guitar.svg" },
  trumpet:    { label: "بوق",     src: "assets/images/game/odd/trumpet.svg" },
};

/* المراحل — الترتيب هنا هو ترتيب ظهورها في شاشة الاختيار */
const ODD_STAGES = [
  {
    id: "basic",
    emoji: "🌱",
    name: "البداية السهلة",
    tip: "تصنيف بالنوع — أكل، حيوان، مواصلات",
  },
  {
    id: "look",
    emoji: "🎨",
    name: "شكل ولون",
    tip: "هنا بنبصّ بعينينا مش بس بنفكّر",
  },
  {
    id: "use",
    emoji: "⚙️",
    name: "إيه بيعمل إيه؟",
    tip: "التصنيف بالوظيفة — كل حاجة بتستخدم في إيه",
  },
  {
    id: "zoo",
    emoji: "🦁",
    name: "عالم الحيوان",
    tip: "فروق دقيقة بين الكائنات",
  },
  {
    id: "think",
    emoji: "🧠",
    name: "تفكير متقدّم",
    tip: "أصعب مرحلة — الصفة الواضحة هنا بتخدعك",
  },
];

const ODD_ROUNDS = [
  /* ===================== مرحلة ١ — البداية السهلة ===================== */
  {
    id: "fruit",
    stage: "basic",
    items: ["watermelon", "pineapple", "banana", "football"],
    odd: "football",
    rule: "التلاتة التانيين فاكهة بناكلها — والكورة لعبة بنلعب بيها ⚽",
    reasons: [
      { text: "التلاتة التانيين فاكهة بناكلها", ok: true },
      { text: "التلاتة التانيين بنلعب بيهم", ok: false },
      { text: "التلاتة التانيين شكلهم دايرة", ok: false },
    ],
  },
  {
    id: "animals",
    stage: "basic",
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
    id: "eat",
    stage: "basic",
    items: ["pizza", "iceCream", "grapes", "book"],
    odd: "book",
    rule: "التلاتة التانيين أكل بناكله — والكتاب بنقراه 📕",
    reasons: [
      { text: "التلاتة التانيين بناكلهم", ok: true },
      { text: "التلاتة التانيين شكلهم دايرة", ok: false },
      { text: "التلاتة التانيين طعمهم حلو", ok: false },
    ],
  },
  {
    id: "creature",
    stage: "basic",
    items: ["cat", "owl", "elephant", "tree"],
    odd: "tree",
    rule: "التلاتة التانيين حيوانات بتتحرك وتاكل — والشجرة نبات ثابت في الأرض 🌳",
    reasons: [
      { text: "التلاتة التانيين حيوانات بتتحرك", ok: true },
      { text: "التلاتة التانيين بيطيروا", ok: false },
      { text: "التلاتة التانيين بيعيشوا في البيت", ok: false },
    ],
  },
  {
    id: "transport",
    stage: "basic",
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
    id: "school",
    stage: "basic",
    items: ["pencil", "book", "scissors", "cake"],
    odd: "cake",
    rule: "التلاتة التانيين بنستعملهم في المدرسة — والتورتة أكل 🎂",
    reasons: [
      { text: "التلاتة التانيين بنستعملهم في المدرسة", ok: true },
      { text: "التلاتة التانيين معمولين من ورق", ok: false },
      { text: "التلاتة التانيين بيقصّوا الورق", ok: false },
    ],
  },

  /* ===================== مرحلة ٢ — شكل ولون ===================== */
  {
    id: "round",
    stage: "look",
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
    id: "round2",
    stage: "look",
    items: ["orange", "basketball", "clock", "pencil"],
    odd: "pencil",
    rule: "التلاتة التانيين شكلهم دايرة — والقلم طويل ومستقيم ✏️",
    reasons: [
      { text: "التلاتة التانيين شكلهم دايرة", ok: true },
      { text: "التلاتة التانيين لونهم برتقاني", ok: false },
      { text: "التلاتة التانيين بناكلهم", ok: false },
    ],
  },
  {
    id: "yellow",
    stage: "look",
    /* الأربعة كلهم نباتات بتطلع من الأرض — عشان "النبات" ميفرزش حد،
       ويفضل اللون هو الفرق الوحيد */
    items: ["banana", "sunflower", "corn", "flower"],
    odd: "flower",
    rule: "التلاتة التانيين لونهم أصفر — والوردة لونها أحمر 🌹",
    reasons: [
      { text: "التلاتة التانيين لونهم أصفر", ok: true },
      { text: "التلاتة التانيين نباتات بتطلع من الأرض", ok: false },
      { text: "التلاتة التانيين بناكلهم", ok: false },
    ],
  },
  {
    id: "red",
    stage: "look",
    items: ["strawberry", "ladybug", "apple", "moon"],
    odd: "moon",
    rule: "التلاتة التانيين لونهم أحمر — والقمر أصفر 🌙",
    reasons: [
      { text: "التلاتة التانيين لونهم أحمر", ok: true },
      { text: "التلاتة التانيين بيطيروا", ok: false },
      { text: "التلاتة التانيين بنشوفهم بالليل", ok: false },
    ],
  },
  {
    id: "blackwhite",
    stage: "look",
    /* الكورة هنا مقصودة: من غيرها يبقى التلاتة حيوانات كمان،
       فيبقى فيه إجابتين */
    items: ["zebra", "penguin", "football", "strawberry"],
    odd: "strawberry",
    rule: "التلاتة التانيين لونهم أبيض وأسود — والفراولة حمرا 🍓",
    reasons: [
      { text: "التلاتة التانيين لونهم أبيض وأسود", ok: true },
      { text: "التلاتة التانيين حيوانات", ok: false },
      { text: "التلاتة التانيين بيعوموا في المية", ok: false },
    ],
  },
  {
    id: "spots",
    stage: "look",
    items: ["ladybug", "giraffe", "strawberry", "carrot"],
    odd: "carrot",
    rule: "التلاتة التانيين عليهم نقط صغيرة — والجزرة لونها سادة 🥕",
    reasons: [
      { text: "التلاتة التانيين عليهم نقط", ok: true },
      { text: "التلاتة التانيين حيوانات", ok: false },
      { text: "التلاتة التانيين لونهم أحمر", ok: false },
    ],
  },

  /* ===================== مرحلة ٣ — إيه بيعمل إيه؟ ===================== */
  {
    id: "light",
    stage: "use",
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
    id: "wheels",
    stage: "use",
    items: ["car", "bicycle", "train", "boat"],
    odd: "boat",
    rule: "التلاتة التانيين بيمشوا على عجل — والمركب بتعوم على المية ⛵",
    reasons: [
      { text: "التلاتة التانيين بيمشوا على عجل", ok: true },
      { text: "التلاتة التانيين بيشتغلوا بالبنزين", ok: false },
      { text: "التلاتة التانيين بيطيروا", ok: false },
    ],
  },
  {
    id: "wear",
    stage: "use",
    items: ["shirt", "shoe", "hat", "cup"],
    odd: "cup",
    rule: "التلاتة التانيين بنلبسهم — والكوباية بنشرب فيها ☕",
    reasons: [
      { text: "التلاتة التانيين بنلبسهم", ok: true },
      { text: "التلاتة التانيين بنلبسهم في رجلينا", ok: false },
      { text: "التلاتة التانيين لونهم واحد", ok: false },
    ],
  },
  {
    id: "music",
    stage: "use",
    /* الأربعة كلهم بيطلّعوا صوت — فالصوت لوحده مش هيفرز حد */
    items: ["drum", "guitar", "trumpet", "phone"],
    odd: "phone",
    rule: "التلاتة التانيين آلات موسيقية بنعزف عليها — والتليفون بنتكلم فيه 📱",
    reasons: [
      { text: "التلاتة التانيين آلات موسيقية بنعزف عليها", ok: true },
      { text: "التلاتة التانيين بيطلّعوا صوت", ok: false },
      { text: "التلاتة التانيين معمولين من خشب", ok: false },
    ],
  },
  {
    id: "sky",
    stage: "use",
    items: ["cloud", "plane", "bird", "fish"],
    odd: "fish",
    rule: "التلاتة التانيين بنشوفهم فوق في السما — والسمكة عايشة في المية 🌊",
    reasons: [
      { text: "التلاتة التانيين بنشوفهم فوق في السما", ok: true },
      { text: "التلاتة التانيين كائنات حية", ok: false },
      { text: "التلاتة التانيين ليهم جناحين", ok: false },
    ],
  },
  {
    id: "water",
    stage: "use",
    items: ["fish", "crab", "turtle", "cat"],
    odd: "cat",
    rule: "التلاتة التانيين عايشين في المية — والقطة عايشة معانا على البر 🐱",
    reasons: [
      { text: "التلاتة التانيين عايشين في المية", ok: true },
      { text: "التلاتة التانيين مالهمش رجلين", ok: false },
      { text: "التلاتة التانيين بيطيروا", ok: false },
    ],
  },

  /* ===================== مرحلة ٤ — عالم الحيوان ===================== */
  {
    id: "insects",
    stage: "zoo",
    items: ["bee", "butterfly", "ladybug", "bird"],
    odd: "bird",
    rule: "التلاتة التانيين حشرات صغيرة — والعصفور طير ليه ريش ومنقار 🐦",
    reasons: [
      { text: "التلاتة التانيين حشرات", ok: true },
      { text: "التلاتة التانيين بيطيروا", ok: false },
      { text: "التلاتة التانيين ليهم ريش", ok: false },
    ],
  },
  {
    id: "legs",
    stage: "zoo",
    items: ["cat", "elephant", "giraffe", "penguin"],
    odd: "penguin",
    rule: "التلاتة التانيين بيمشوا على ٤ رجلين — والبطريق بيمشي على رجلين بس 🐧",
    reasons: [
      { text: "التلاتة التانيين بيمشوا على ٤ رجلين", ok: true },
      { text: "التلاتة التانيين حيوانات", ok: false },
      { text: "التلاتة التانيين بيعيشوا في التلج", ok: false },
    ],
  },
  {
    id: "birds",
    stage: "zoo",
    items: ["bird", "owl", "peacock", "bee"],
    odd: "bee",
    rule: "التلاتة التانيين طيور ليها ريش ومنقار — والنحلة حشرة 🐝",
    reasons: [
      { text: "التلاتة التانيين طيور ليها ريش ومنقار", ok: true },
      { text: "التلاتة التانيين بيطيروا", ok: false },
      { text: "التلاتة التانيين بيعملوا عسل", ok: false },
    ],
  },
  {
    id: "eggs",
    stage: "zoo",
    items: ["bird", "fish", "turtle", "cat"],
    odd: "cat",
    rule: "التلاتة التانيين بيبيضوا بيض — والقطة بتولد وبترضّع صغارها 🐱",
    reasons: [
      { text: "التلاتة التانيين بيبيضوا بيض", ok: true },
      { text: "التلاتة التانيين عايشين في المية", ok: false },
      { text: "التلاتة التانيين ليهم ريش", ok: false },
    ],
  },
  {
    id: "bigwild",
    stage: "zoo",
    items: ["elephant", "giraffe", "zebra", "bee"],
    odd: "bee",
    rule: "التلاتة التانيين حيوانات ضخمة بتعيش في البرّية — والنحلة حشرة صغيرة 🐝",
    reasons: [
      { text: "التلاتة التانيين حيوانات ضخمة بتمشي على ٤ رجلين", ok: true },
      { text: "التلاتة التانيين عليهم خطوط", ok: false },
      { text: "التلاتة التانيين بيطيروا", ok: false },
    ],
  },
  {
    id: "flight",
    stage: "zoo",
    /* الأربعة كلهم ليهم جناحين — بس البطريق مبيطيرش */
    items: ["butterfly", "bird", "bee", "penguin"],
    odd: "penguin",
    rule: "التلاتة التانيين بيطيروا في الهوا — والبطريق ليه جناحين بس بيعوم بيهم مبيطيرش 🐧",
    reasons: [
      { text: "التلاتة التانيين بيطيروا في الهوا", ok: true },
      { text: "التلاتة التانيين ليهم جناحين", ok: false },
      { text: "التلاتة التانيين حشرات", ok: false },
    ],
  },

  /* ===================== مرحلة ٥ — تفكير متقدّم ===================== */
  {
    id: "alive",
    stage: "think",
    /* الأربعة كلهم بيطيروا، فـ"الطيران" مش هيفرز حد.
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
  {
    id: "sweet",
    stage: "think",
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
    id: "manmade",
    stage: "think",
    items: ["house", "car", "train", "tree"],
    odd: "tree",
    rule: "التلاتة التانيين الناس صنعوهم — والشجرة نبتت لوحدها وبتكبر 🌳",
    reasons: [
      { text: "التلاتة التانيين الناس صنعوهم", ok: true },
      { text: "التلاتة التانيين بيوصّلونا من مكان لمكان", ok: false },
      { text: "التلاتة التانيين معمولين من خشب", ok: false },
    ],
  },
  {
    id: "seaalive",
    stage: "think",
    /* الأربعة كلهم في المية — نفس فكرة جولة الطيارة بس في البحر */
    items: ["fish", "crab", "turtle", "boat"],
    odd: "boat",
    rule: "الأربعة كلهم في المية! بس التلاتة التانيين كائنات حية — والمركب حاجة الناس صنعوها ⛵",
    reasons: [
      { text: "التلاتة التانيين كائنات حية", ok: true },
      { text: "التلاتة التانيين بيعوموا في المية", ok: false },
      { text: "التلاتة التانيين ليهم رجلين", ok: false },
    ],
  },
  {
    id: "ground",
    stage: "think",
    /* الأربعة كلهم ليهم عجل — حتى الطيارة */
    items: ["car", "bicycle", "train", "plane"],
    odd: "plane",
    rule: "الأربعة كلهم ليهم عجل! بس التلاتة التانيين بيمشوا على الأرض — والطيارة بتطير في السما ✈️",
    reasons: [
      { text: "التلاتة التانيين بيمشوا على الأرض", ok: true },
      { text: "التلاتة التانيين ليهم عجل", ok: false },
      { text: "التلاتة التانيين بيشيلوا ناس", ok: false },
    ],
  },
  {
    id: "natural",
    stage: "think",
    /* الأربعة كلهم بيدّوا نور — أصعب جولة في اللعبة */
    items: ["sun", "star", "moon", "lamp"],
    odd: "lamp",
    rule: "الأربعة كلهم بيدّوا نور! بس التلاتة التانيين في السما وموجودين من غير ما حد يعملهم — واللمبة الناس صنعوها 💡",
    reasons: [
      { text: "التلاتة التانيين في السما والناس مصنعتهمش", ok: true },
      { text: "التلاتة التانيين بيدّونا نور", ok: false },
      { text: "التلاتة التانيين بنشوفهم بالليل بس", ok: false },
    ],
  },
];

/* النقط: اختيار الصورة صح من أول مرة = ٢، ومعرفة السبب = ١ */
const ODD_PICK_POINTS = 2;
const ODD_REASON_POINTS = 1;

/* عشان نقدر نتأكد من البيانات في node وقت التطوير */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ODD_ITEMS, ODD_STAGES, ODD_ROUNDS, ODD_PICK_POINTS, ODD_REASON_POINTS };
}
