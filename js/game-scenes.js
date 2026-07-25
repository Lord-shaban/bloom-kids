/* ============================================================
   Bloom Kids — لعبة "اكتشف الفروق"
   بيانات المراحل (رسومات SVG أصلية بألوان هوية بلوم كيدز)

   كل مرحلة فيها:
     base  = الرسمة الأساسية المشتركة بين الصورتين
     diffs = الفروق. كل فرق له:
        x, y, r → دايرة الضغط (بإحداثيات الـ viewBox)
        a       → الشكل اللي يظهر في الصورة الأولى
        b       → الشكل اللي يظهر في الصورة التانية ("" يعني مش موجود)

   الفروق كلها بتترسم فوق الرسمة الأساسية، عشان كده
   مفيش أي حاجة في الـ base بتغطي عليها.
   ============================================================ */

const VIEWBOX = "0 0 600 450";

/* ---------- مساعدات صغيرة لتكرار الأشكال ---------- */
function flower(x, y, petal, core) {
  return `<g>
    <path d="M${x} ${y}v30" stroke="#4e8720" stroke-width="4" stroke-linecap="round"/>
    <g fill="${petal}">
      <circle cx="${x}" cy="${y - 9}" r="6.5"/>
      <circle cx="${x - 9}" cy="${y}" r="6.5"/>
      <circle cx="${x + 9}" cy="${y}" r="6.5"/>
      <circle cx="${x}" cy="${y + 9}" r="6.5"/>
    </g>
    <circle cx="${x}" cy="${y}" r="5" fill="${core}"/>
  </g>`;
}

function bird(x, y, color = "#332d6e") {
  return `<path d="M${x} ${y}q8-9 16 0q8-9 16 0" stroke="${color}" stroke-width="3.4"
    fill="none" stroke-linecap="round"/>`;
}

function butterfly(x, y, wing) {
  return `<g>
    <ellipse cx="${x - 9}" cy="${y - 5}" rx="9" ry="11" fill="${wing}"/>
    <ellipse cx="${x + 9}" cy="${y - 5}" rx="9" ry="11" fill="${wing}"/>
    <ellipse cx="${x - 7}" cy="${y + 7}" rx="7" ry="8" fill="${wing}" opacity=".75"/>
    <ellipse cx="${x + 7}" cy="${y + 7}" rx="7" ry="8" fill="${wing}" opacity=".75"/>
    <rect x="${x - 2}" y="${y - 13}" width="4" height="26" rx="2" fill="#332d6e"/>
    <path d="M${x - 2} ${y - 13}l-7-8M${x + 2} ${y - 13}l7-8" stroke="#332d6e"
      stroke-width="2.2" stroke-linecap="round"/>
  </g>`;
}

/* ============================================================
   المرحلة ١ — سيشن بلوم كيدز (أوضة الطفل)
   ============================================================ */
const SCENE_ROOM = {
  id: "room",
  emoji: "💻",
  title: "سيشن بلوم كيدز",
  hint: "أوضة السيشن… بصّ على الساعة والرف والشباك 👀",
  base: `
    <!-- الحيطة والأرضية -->
    <rect width="600" height="450" fill="#f3eefc"/>
    <rect y="345" width="600" height="105" fill="#e6cba6"/>
    <path d="M0 345h600" stroke="#c9a273" stroke-width="4"/>
    <g stroke="#d3b184" stroke-width="2" opacity=".85">
      <path d="M0 374h600M0 402h600M0 430h600"/>
    </g>
    <ellipse cx="300" cy="414" rx="178" ry="32" fill="#23a89f" opacity=".3"/>
    <ellipse cx="300" cy="414" rx="118" ry="20" fill="#ffffff" opacity=".45"/>

    <!-- الشباك -->
    <rect x="44" y="50" width="152" height="122" rx="12" fill="#bfe7ff"/>
    <circle cx="78" cy="84" r="17" fill="#f6a92c"/>
    <path d="M120 50v122M44 111h152" stroke="#ffffff" stroke-width="8"/>
    <rect x="44" y="50" width="152" height="122" rx="12" fill="none" stroke="#ffffff" stroke-width="9"/>

    <!-- الساعة (العقارب فرق) -->
    <circle cx="262" cy="86" r="34" fill="#ffffff" stroke="#332d6e" stroke-width="5"/>
    <g fill="#332d6e">
      <circle cx="262" cy="60" r="2"/><circle cx="288" cy="86" r="2"/>
      <circle cx="262" cy="112" r="2"/><circle cx="236" cy="86" r="2"/>
    </g>

    <!-- برواز على الحيطة -->
    <rect x="332" y="52" width="80" height="66" rx="8" fill="#ffffff" stroke="#6a4fb6" stroke-width="5"/>
    <path d="M338 110l20-24 14 15 13-18 21 27z" fill="#7dc242"/>
    <circle cx="353" cy="70" r="7" fill="#f6a92c"/>

    <!-- مكتبة الكتب -->
    <rect x="424" y="92" width="148" height="156" rx="9" fill="#c98c5a"/>
    <rect x="432" y="100" width="132" height="62" rx="4" fill="#eab98a"/>
    <rect x="432" y="170" width="132" height="70" rx="4" fill="#eab98a"/>
    <circle cx="452" cy="140" r="17" fill="#23a89f"/>
    <rect x="443" y="157" width="18" height="5" rx="2" fill="#8a5a2b"/>
    <rect x="486" y="120" width="13" height="42" rx="3" fill="#332d6e"/>
    <rect x="502" y="126" width="12" height="36" rx="3" fill="#ef5f7c"/>
    <g>
      <rect x="440" y="184" width="15" height="54" rx="3" fill="#ef5f7c"/>
      <rect x="459" y="176" width="13" height="62" rx="3" fill="#f6a92c"/>
      <rect x="476" y="188" width="16" height="50" rx="3" fill="#6a4fb6"/>
      <rect x="496" y="180" width="14" height="58" rx="3" fill="#7dc242"/>
      <rect x="514" y="186" width="13" height="52" rx="3" fill="#23a89f"/>
      <rect x="531" y="178" width="14" height="60" rx="3" fill="#332d6e"/>
    </g>

    <!-- الطفل -->
    <path d="M170 288q0-36 30-36t30 36z" fill="#ef5f7c"/>
    <circle cx="200" cy="234" r="25" fill="#f7c9a3"/>
    <path d="M175 230q3-27 25-27t25 27q-9-13-25-13t-25 13z" fill="#4a3728"/>
    <circle cx="192" cy="236" r="2.8" fill="#332d6e"/>
    <circle cx="209" cy="236" r="2.8" fill="#332d6e"/>
    <path d="M194 245q6.5 6 13 0" stroke="#332d6e" stroke-width="2.6" fill="none" stroke-linecap="round"/>

    <!-- المكتب -->
    <rect x="182" y="284" width="256" height="17" rx="8" fill="#b9743f"/>
    <rect x="198" y="301" width="15" height="60" rx="4" fill="#a3652f"/>
    <rect x="407" y="301" width="15" height="60" rx="4" fill="#a3652f"/>

    <!-- اللابتوب والسيشن -->
    <rect x="262" y="204" width="98" height="74" rx="7" fill="#3b3566"/>
    <rect x="269" y="211" width="84" height="60" rx="4" fill="#8fd8ff"/>
    <g fill="#ffffff" opacity=".92">
      <rect x="274" y="216" width="36" height="26" rx="4"/>
      <rect x="313" y="216" width="36" height="26" rx="4"/>
      <rect x="274" y="245" width="36" height="22" rx="4"/>
      <rect x="313" y="245" width="36" height="22" rx="4"/>
    </g>
    <g fill="#f6a92c">
      <circle cx="292" cy="227" r="6"/><circle cx="331" cy="227" r="6"/>
      <circle cx="292" cy="254" r="6"/><circle cx="331" cy="254" r="6"/>
    </g>
    <path d="M250 278h122l11 9H239z" fill="#4a4478"/>

    <!-- نبتة على الأرض -->
    <rect x="48" y="348" width="44" height="12" rx="4" fill="#e04868"/>
    <path d="M52 360h36l-5 42H57z" fill="#ef5f7c"/>
    <path d="M70 348v-32" stroke="#4e8720" stroke-width="4" stroke-linecap="round"/>
    <path d="M70 336q-18-6-20-24 18 2 20 20z" fill="#7dc242"/>
    <path d="M70 342q18-8 20-26-18 2-20 22z" fill="#7dc242"/>
  `,
  diffs: [
    {
      id: "clock",
      label: "عقارب الساعة",
      x: 262, y: 86, r: 38,
      a: `<g stroke-linecap="round">
            <path d="M262 86V64" stroke="#332d6e" stroke-width="4.5"/>
            <path d="M262 86h21" stroke="#ef5f7c" stroke-width="4"/>
          </g>
          <circle cx="262" cy="86" r="3.6" fill="#332d6e"/>`,
      b: `<g stroke-linecap="round">
            <path d="M262 86V62" stroke="#332d6e" stroke-width="4.5"/>
            <path d="M262 86l-16 13" stroke="#ef5f7c" stroke-width="4"/>
          </g>
          <circle cx="262" cy="86" r="3.6" fill="#332d6e"/>`,
    },
    {
      id: "cloud",
      label: "السحابة في الشباك",
      x: 152, y: 80, r: 27,
      a: `<g fill="#ffffff" opacity=".97">
            <circle cx="150" cy="78" r="13"/>
            <circle cx="164" cy="80" r="10"/>
            <circle cx="138" cy="81" r="9"/>
            <rect x="138" y="78" width="27" height="13" rx="6.5"/>
          </g>`,
      b: ``,
    },
    {
      id: "book",
      label: "لون الكتاب على الرف",
      x: 527, y: 138, r: 25,
      a: `<rect x="520" y="118" width="14" height="44" rx="3" fill="#6a4fb6"/>`,
      b: `<rect x="520" y="118" width="14" height="44" rx="3" fill="#f6a92c"/>`,
    },
    {
      id: "flower",
      label: "الوردة على النبتة",
      x: 70, y: 314, r: 28,
      a: `<g fill="#ef5f7c">
            <circle cx="70" cy="305" r="6.5"/><circle cx="61" cy="314" r="6.5"/>
            <circle cx="79" cy="314" r="6.5"/><circle cx="70" cy="323" r="6.5"/>
          </g>
          <circle cx="70" cy="314" r="5" fill="#f6a92c"/>`,
      b: ``,
    },
    {
      id: "ball",
      label: "رسمة الكورة",
      x: 510, y: 400, r: 30,
      a: `<circle cx="510" cy="400" r="24" fill="#ffffff" stroke="#332d6e" stroke-width="2.5"/>
          <path d="M510 382l5.5 11.5 12.5 1.5-9 8.5 2.5 12.5-11.5-6-11.5 6 2.5-12.5-9-8.5 12.5-1.5z"
            fill="#ef5f7c"/>`,
      b: `<circle cx="510" cy="400" r="24" fill="#ffffff" stroke="#332d6e" stroke-width="2.5"/>
          <path d="M488 400h44M510 378v44" stroke="#23a89f" stroke-width="7" stroke-linecap="round"/>`,
    },
  ],
};

/* ============================================================
   المرحلة ٢ — الحديقة
   ============================================================ */
const SCENE_PARK = {
  id: "park",
  emoji: "🌳",
  title: "يوم في الحديقة",
  hint: "بصّ في السما وعلى الشجرة والزرع 🌼",
  base: `
    <!-- السما والشمس -->
    <rect width="600" height="450" fill="#c9ecff"/>
    <circle cx="524" cy="62" r="32" fill="#f6a92c"/>
    <g stroke="#f6a92c" stroke-width="5" stroke-linecap="round">
      <path d="M524 16v-9M524 117v9M570 62h9M469 62h-9M557 29l6-6M485 95l-6 6M557 95l6 6M485 29l-6-6"/>
    </g>

    <!-- سحاب -->
    <g fill="#ffffff" opacity=".95">
      <circle cx="112" cy="70" r="20"/><circle cx="136" cy="72" r="15"/>
      <circle cx="92" cy="75" r="14"/><rect x="92" y="70" width="45" height="17" rx="8.5"/>
    </g>
    <g fill="#ffffff" opacity=".8">
      <circle cx="378" cy="52" r="15"/><circle cx="396" cy="54" r="11"/>
      <circle cx="363" cy="56" r="10"/><rect x="363" y="52" width="34" height="13" rx="6.5"/>
    </g>

    <!-- تلال وعشب -->
    <path d="M0 302q90-66 190-38t180-28 230 38v30H0z" fill="#7dc242" opacity=".5"/>
    <rect y="298" width="600" height="152" fill="#8fd05a"/>
    <path d="M0 298h600" stroke="#6fb041" stroke-width="4"/>

    <!-- ممشى -->
    <path d="M236 450q34-88 118-152h58q-104 68-132 152z" fill="#e6cba6" opacity=".9"/>

    <!-- الشجرة -->
    <rect x="110" y="220" width="25" height="84" rx="7" fill="#a3652f"/>
    <path d="M122 262l-20-16M122 240l20-16" stroke="#a3652f" stroke-width="6" stroke-linecap="round"/>
    <circle cx="122" cy="184" r="52" fill="#4e9c3a"/>
    <circle cx="86" cy="206" r="34" fill="#5cb045"/>
    <circle cx="158" cy="206" r="34" fill="#5cb045"/>
    <circle cx="122" cy="152" r="30" fill="#5cb045"/>

    <!-- الدكة -->
    <rect x="356" y="238" width="128" height="11" rx="5" fill="#c98c5a"/>
    <rect x="356" y="266" width="128" height="12" rx="5" fill="#c98c5a"/>
    <rect x="356" y="284" width="128" height="12" rx="5" fill="#c98c5a"/>
    <rect x="362" y="238" width="10" height="68" rx="4" fill="#8a5a2b"/>
    <rect x="468" y="238" width="10" height="68" rx="4" fill="#8a5a2b"/>

    <!-- ورود ثابتة -->
    ${flower(198, 378, "#ef5f7c", "#f6a92c")}
    ${flower(268, 416, "#ffffff", "#f6a92c")}
    ${flower(512, 372, "#f6a92c", "#ffffff")}
    ${flower(560, 420, "#ef5f7c", "#f6a92c")}
    ${flower(352, 428, "#6a4fb6", "#f6a92c")}

    <!-- نجيلة -->
    <g stroke="#6fb041" stroke-width="3" stroke-linecap="round">
      <path d="M30 450v-16M44 450v-22M58 450v-14M420 450v-18M434 450v-24M448 450v-15"/>
    </g>
  `,
  diffs: [
    {
      id: "birds",
      label: "عدد العصافير",
      x: 304, y: 78, r: 34,
      a: `${bird(196, 76)}${bird(238, 58)}${bird(288, 82)}`,
      b: `${bird(196, 76)}${bird(238, 58)}`,
    },
    {
      id: "kite",
      label: "لون الطيارة الورق",
      x: 430, y: 130, r: 38,
      a: `<g>
            <path d="M430 96l30 34-30 34-30-34z" fill="#ef5f7c"/>
            <path d="M430 96v68M400 130h60" stroke="#ffffff" stroke-width="2.5" opacity=".85"/>
            <path d="M430 164q-8 16 4 22t2 18" stroke="#332d6e" stroke-width="2.5" fill="none"/>
            <g fill="#f6a92c"><circle cx="432" cy="176" r="4"/><circle cx="436" cy="196" r="4"/></g>
          </g>`,
      b: `<g>
            <path d="M430 96l30 34-30 34-30-34z" fill="#23a89f"/>
            <path d="M430 96v68M400 130h60" stroke="#ffffff" stroke-width="2.5" opacity=".85"/>
            <path d="M430 164q-8 16 4 22t2 18" stroke="#332d6e" stroke-width="2.5" fill="none"/>
            <g fill="#f6a92c"><circle cx="432" cy="176" r="4"/><circle cx="436" cy="196" r="4"/></g>
          </g>`,
    },
    {
      id: "apple",
      label: "التفاحة على الشجرة",
      x: 150, y: 186, r: 24,
      a: `<circle cx="150" cy="188" r="11" fill="#ef5f7c"/>
          <path d="M150 177v-7" stroke="#4a3728" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M150 172q8-6 12 1-8 4-12-1z" fill="#4e8720"/>`,
      b: ``,
    },
    {
      id: "flower",
      label: "لون الوردة",
      x: 72, y: 388, r: 30,
      a: flower(72, 388, "#6a4fb6", "#f6a92c"),
      b: flower(72, 388, "#f6a92c", "#ffffff"),
    },
    {
      id: "butterfly",
      label: "مكان الفراشة",
      x: 318, y: 344, r: 42,
      a: butterfly(298, 348, "#6a4fb6"),
      b: butterfly(340, 336, "#6a4fb6"),
    },
  ],
};

/* ============================================================
   المرحلة ٣ — الشاطئ
   ============================================================ */
const SCENE_BEACH = {
  id: "beach",
  emoji: "🏖️",
  title: "يوم على الشاطئ",
  hint: "بصّ على الشمسية والمركب والقلعة 🐚",
  base: `
    <!-- السما والشمس -->
    <rect width="600" height="450" fill="#c9ecff"/>
    <circle cx="512" cy="68" r="33" fill="#f6a92c"/>
    <g fill="#ffffff" opacity=".9">
      <circle cx="330" cy="60" r="16"/><circle cx="349" cy="62" r="12"/>
      <circle cx="314" cy="64" r="11"/><rect x="314" y="60" width="36" height="14" rx="7"/>
    </g>

    <!-- البحر -->
    <rect y="228" width="600" height="122" fill="#23a89f"/>
    <path d="M0 228h600" stroke="#1c8b84" stroke-width="4"/>
    <g stroke="#7fe3dc" stroke-width="4" stroke-linecap="round" fill="none" opacity=".85">
      <path d="M40 252q14-9 28 0t28 0M330 246q14-9 28 0t28 0M170 282q14-9 28 0t28 0"/>
      <path d="M486 288q14-9 28 0t28 0M250 312q14-9 28 0t28 0M60 322q14-9 28 0t28 0"/>
    </g>

    <!-- الرمل -->
    <path d="M0 344q70-18 150-6t150 4 150-10 150 6v112H0z" fill="#f3dcae"/>
    <g fill="#e3c58c">
      <circle cx="120" cy="420" r="3"/><circle cx="180" cy="440" r="3"/>
      <circle cx="330" cy="410" r="3"/><circle cx="410" cy="436" r="3"/>
      <circle cx="60" cy="430" r="3"/><circle cx="580" cy="416" r="3"/>
    </g>

    <!-- نخلة -->
    <path d="M552 402q-8-56 2-96" stroke="#a3652f" stroke-width="9" fill="none" stroke-linecap="round"/>
    <g fill="#4e9c3a">
      <path d="M556 306q-34-16-54 4 28 12 54-4z"/>
      <path d="M556 306q30-20 52-2-26 14-52 2z"/>
      <path d="M556 306q-10-32 8-46 10 24-8 46z"/>
      <path d="M556 308q22 6 28 30-24-4-28-30z"/>
    </g>
    <g fill="#8a5a2b"><circle cx="550" cy="312" r="4"/><circle cx="561" cy="314" r="4"/></g>

    <!-- قلعة الرمل -->
    <rect x="208" y="352" width="84" height="48" fill="#e8cb98"/>
    <rect x="198" y="342" width="24" height="58" fill="#e8cb98"/>
    <rect x="278" y="342" width="24" height="58" fill="#e8cb98"/>
    <rect x="238" y="328" width="24" height="72" fill="#e8cb98"/>
    <path d="M194 400h112" stroke="#d6b47c" stroke-width="5" stroke-linecap="round"/>
    <path d="M244 366h12v14h-12z" fill="#d6b47c"/>

    <!-- جردل وأدوات -->
    <path d="M340 372h34l-5 30h-24z" fill="#ef5f7c"/>
    <path d="M340 372q17-14 34 0" stroke="#e04868" stroke-width="3" fill="none"/>
    <path d="M388 402l16-30 10 5-16 30z" fill="#f6a92c"/>
    <ellipse cx="392" cy="374" rx="12" ry="7" fill="#f6a92c" transform="rotate(-28 392 374)"/>

    <!-- صدفة -->
    <g transform="translate(150 424)">
      <path d="M0 0q-16-4-16-14T0-24q16 0 16 10T0 0z" fill="#ffd9e2"/>
      <path d="M0 0v-24M-9-3l4-20M9-3l-4-20" stroke="#ef5f7c" stroke-width="1.8"/>
    </g>

    <!-- عمود الشمسية -->
    <path d="M95 300v98" stroke="#8a5a2b" stroke-width="6" stroke-linecap="round"/>
  `,
  diffs: [
    {
      id: "gulls",
      label: "عدد النوارس",
      x: 190, y: 84, r: 34,
      a: `${bird(96, 92)}${bird(140, 68)}${bird(178, 88)}`,
      b: `${bird(96, 92)}${bird(140, 68)}`,
    },
    {
      id: "sail",
      label: "لون شراع المركب",
      x: 446, y: 250, r: 34,
      a: `<path d="M434 216v74h48z" fill="#6a4fb6"/>
          <path d="M430 296V212" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round"/>
          <path d="M386 298h88l-13 26h-62z" fill="#ef5f7c"/>`,
      b: `<path d="M434 216v74h48z" fill="#f6a92c"/>
          <path d="M430 296V212" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round"/>
          <path d="M386 298h88l-13 26h-62z" fill="#ef5f7c"/>`,
    },
    {
      id: "flag",
      label: "علم القلعة",
      x: 250, y: 314, r: 26,
      a: `<path d="M250 328v-32" stroke="#8a5a2b" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M250 298h22l-7 8 7 8h-22z" fill="#ef5f7c"/>`,
      b: ``,
    },
    {
      id: "starfish",
      label: "نجمة البحر",
      x: 470, y: 408, r: 28,
      a: `<path d="M470 388l6 14 15 1-11.5 10 3.5 15-13-8-13 8 3.5-15L449 403l15-1z"
            fill="#f6a92c" stroke="#e09420" stroke-width="2" stroke-linejoin="round"/>`,
      b: ``,
    },
    {
      id: "umbrella",
      label: "ألوان الشمسية",
      x: 95, y: 278, r: 46,
      a: `<path d="M35 300a60 44 0 0 1 120 0z" fill="#ef5f7c"/>
          <path d="M95 256v44M65 262a60 44 0 0 0-30 38h30zM125 262a60 44 0 0 1 30 38h-30z" fill="#ffffff"/>
          <path d="M35 300a60 44 0 0 1 120 0z" fill="none" stroke="#e04868" stroke-width="3"/>`,
      b: `<path d="M35 300a60 44 0 0 1 120 0z" fill="#23a89f"/>
          <path d="M95 256v44M65 262a60 44 0 0 0-30 38h30zM125 262a60 44 0 0 1 30 38h-30z" fill="#ffffff"/>
          <path d="M35 300a60 44 0 0 1 120 0z" fill="none" stroke="#1c8b84" stroke-width="3"/>`,
    },
  ],
};

/* ============================================================
   المرحلة ٤ — مرحلة بالصور (مش رسم SVG)

   المرحلة دي شغّالة بصورتين جاهزين بدل الرسم، عشان كده:
     photo   = true  → المحرّك يرسم <image> بدل الـ base
     imgA    = الصورة الأولى، imgB = الصورة التانية
     viewBox = بمقاس ٦٠٠ عرض زي باقي المراحل عشان سماكة
               الدوايرة والعلامات تطلع بنفس الشكل
     الفروق هنا فيها x, y, r بس (مفيش a و b) لأن الفرق
     نفسه موجود جوه الصورة.
   ============================================================ */
const SCENE_KRAB = {
  id: "krab",
  emoji: "🍔",
  title: "المطعم المقلوب",
  hint: "المرحلة الأخيرة بصور حقيقية… بصّ على الصينية والقارب واللوحة 🍔",
  photo: true,
  viewBox: "0 0 600 360",
  imgA: "assets/images/game/krusty-krab-a.jpg",
  imgB: "assets/images/game/krusty-krab-b.jpg",
  diffs: [
    { id: "burger-stack", label: "كومة البرجر على الصينية", x: 176, y: 83, r: 38 },
    { id: "pineapple",    label: "البرجر الطاير بقى أناناس", x: 45,  y: 57, r: 38 },
    { id: "boat",         label: "لون القارب",              x: 320, y: 185, r: 40 },
    { id: "menu-sign",    label: "لوحة المنيو",             x: 285, y: 92, r: 28 },
    { id: "sandy-flower", label: "الزهرة على خوذة ساندي",   x: 38,  y: 171, r: 26 },
  ],
};

const SCENES = [SCENE_ROOM, SCENE_PARK, SCENE_BEACH, SCENE_KRAB];

/* عشان نقدر نتأكد من البيانات في node وقت التطوير */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SCENES, VIEWBOX };
}
