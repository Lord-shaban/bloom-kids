/* ============================================================
   Bloom Kids — لعبة "اكتشف الفروق"
   بيانات المراحل — كل مرحلة صورتين جاهزين وبينهم فروق.

   كل مرحلة فيها:
     imgA    = الصورة الأولى، imgB = الصورة التانية
     viewBox = بعرض ٦٠٠ في كل المراحل، عشان سماكة الدواير
               والعلامات تطلع بنفس الشكل في كل المراحل
     diffs   = الفروق، كل فرق له:
        x, y → مركز الفرق بإحداثيات الـ viewBox
        r    → نصف قطر الدايرة اللي بتترسم لما يلاقيه
               (منطقة الضغط نفسها أوسع — شوف MIN_HIT في game.js)
        label = اسم الفرق اللي بيظهر للاعب

   ملاحظة: الإحداثيات دي اتحسبت من مقارنة البكسلات بين الصورتين،
   مش بالنظر. لو ضفت مرحلة جديدة اعمل نفس الحاجة عشان تطلع مظبوطة.

   الصور كلها ١٠٠٠×٥٤٥ في assets/images/game/
   ============================================================ */
const PHOTO_BOX = "0 0 600 327";

/* ---------- المرحلة ١ — بيت الدببة (٥ فروق) ---------- */
const SCENE_BEARS = {
  id: "bears",
  emoji: "🐻",
  title: "بيت الدببة",
  hint: "أوضة مليانة تفاصيل… بصّ على الحيطة والتليفزيون والكنبة 🐼",
  viewBox: PHOTO_BOX,
  imgA: "assets/images/game/bears-a.jpg",
  imgB: "assets/images/game/bears-b.jpg",
  diffs: [
    { id: "frame",   label: "الصورة اللي في البرواز",   x: 68,  y: 46,  r: 33 },
    { id: "poster",  label: "البوستر على الحيطة",       x: 38,  y: 121, r: 28 },
    { id: "tv",      label: "اللي على شاشة التليفزيون", x: 46,  y: 228, r: 30 },
    { id: "mug",     label: "كوباية الدب البني",        x: 173, y: 174, r: 20 },
    { id: "backpack", label: "شنطة الضفدع على الكنبة",  x: 367, y: 184, r: 28 },
  ],
};

/* ---------- المرحلة ٢ — ملاهي الأحلام (٦ فروق) ---------- */
const SCENE_FAIR = {
  id: "fair",
  emoji: "🎠",
  title: "ملاهي الأحلام",
  hint: "٦ فروق المرة دي! بصّ على توم وجيري وكشك غزل البنات 🎡",
  viewBox: PHOTO_BOX,
  imgA: "assets/images/game/fair-a.jpg",
  imgB: "assets/images/game/fair-b.jpg",
  diffs: [
    { id: "hat",     label: "طاقية جيري",              x: 299, y: 68,  r: 20 },
    { id: "scarf",   label: "لون كوفية توم",           x: 291, y: 188, r: 45 },
    { id: "balloons", label: "بالونات جديدة في الخلفية", x: 239, y: 214, r: 21 },
    { id: "candy",   label: "لون غزل البنات",          x: 33,  y: 218, r: 13 },
    { id: "lolly",   label: "المصاصة في إيد البنت",    x: 60,  y: 210, r: 11 },
    { id: "gem",     label: "الجوهرة على سرج الحصان",  x: 316, y: 303, r: 20 },
  ],
};

/* ---------- المرحلة ٣ — قاع البحر (٩ فروق) ---------- */
const SCENE_REEF = {
  id: "reef",
  emoji: "🐬",
  title: "قاع البحر",
  hint: "أصعب مرحلة… ٩ فروق! بصّ في المياه وعلى باترك والرملة 🌊",
  viewBox: PHOTO_BOX,
  imgA: "assets/images/game/reef-a.jpg",
  imgB: "assets/images/game/reef-b.jpg",
  diffs: [
    { id: "dolphin-top",   label: "دولفين فوق في النص",        x: 352, y: 58,  r: 30 },
    { id: "dolphin-mid",   label: "دولفين تحت في النص",        x: 299, y: 94,  r: 30 },
    { id: "dolphin-right", label: "دولفين ناحية اليمين",       x: 560, y: 89,  r: 34 },
    { id: "propeller",     label: "الطاقية بالمروحة فوق البيت", x: 445, y: 55,  r: 25 },
    { id: "clam",          label: "الصدفة ورا باترك",          x: 401, y: 195, r: 28 },
    { id: "patrick2",      label: "باترك تاني على الممشى",     x: 88,  y: 179, r: 23 },
    { id: "sign",          label: "لافتة تشام باكيت",          x: 107, y: 143, r: 16 },
    { id: "pebbles",       label: "الأحجار الزرقا على الرملة", x: 262, y: 283, r: 23 },
    { id: "star",          label: "النجمة على شورت باترك",     x: 373, y: 234, r: 12 },
  ],
};

const SCENES = [SCENE_BEARS, SCENE_FAIR, SCENE_REEF];

/* عشان نقدر نتأكد من البيانات في node وقت التطوير */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SCENES, PHOTO_BOX };
}
