# 🌱 Bloom Kids — الموقع الرسمي + لوحة التحكم

موقع **بلوم كيدز** — سيشنز أونلاين تفاعلية للأطفال من 6 إلى 12 سنة.

- **الموقع:** لاندينج بيدج احترافية بنموذج حجز
- **التسجيلات:** بتتخزن في قاعدة بيانات Cloudflare D1 وبتظهر في لوحة تحكم
- **لوحة التحكم:** على `/admin.html` — محمية بكلمة سر، فيها إحصائيات وبحث وفلاتر وتصدير Excel
- **الواتساب:** للاستفسارات العامة (الأيقونة العائمة + الفوتر)
- **لعبة اكتشف الفروق:** على `/game.html` — صفحة مخفية (تفاصيل تحت)

---

## 🎮 لعبة "اكتشف الفروق"

لعبة للأطفال بنفس هوية وتصميم الموقع. **مفيش أي زرار أو لينك ليها من الموقع
الأساسي** — الوصول ليها بالرابط المباشر بس:

```
https://bloom-kids.pages.dev/game.html
```

**إزاي هي مخفية؟**
- مفيش أي لينك ليها من `index.html` أو أي صفحة تانية
- `<meta name="robots" content="noindex, nofollow">` جوه الصفحة
- هيدر `X-Robots-Tag: noindex, nofollow` في ملف `_headers`
- **مقصود** إننا مضفناهاش في `robots.txt` — لأن `robots.txt` ملف عام،
  ولو كتبنا فيه `Disallow: /game.html` هنكون بكده أعلنّا عن الرابط المخفي لأي حد

**الملفات:**

| الملف | بيعمل إيه |
|---|---|
| `game.html` | صفحة اللعبة |
| `css/game.css` | ستايل اللعبة (بيكمّل على `style.css`) |
| `js/game-scenes.js` | الرسومات والفروق (٣ مراحل × ٥ فروق) |
| `js/game.js` | محرّك اللعبة |

**الرسومات كلها SVG أصلي** اترسم بألوان بلوم كيدز — مفيش صور خارجية،
يعني مفيش أي مشاكل حقوق ملكية، والرسمة بتفضل واضحة على أي شاشة.

**تحب تضيف مرحلة جديدة؟** افتح `js/game-scenes.js` وزوّد سيشن جديدة على
نفس النمط، وضيفها في مصفوفة `SCENES` في آخر الملف. كل فرق محتاج `x, y, r`
(مكان الضغط) و `a` و `b` (شكل الفرق في كل صورة).

---

## 🚀 الإعداد لأول مرة (مرة واحدة بس)

بعد إضافة الداشبورد، الرفع بقى بأداة wrangler الرسمية (السحب والإفلات مش بيدعم الباك إند).
كل الأوامر دي بتتكتب في PowerShell جوه مجلد المشروع:

### الخطوة 1: تسجيل الدخول لـ Cloudflare
```powershell
npx wrangler login
```
هيفتح المتصفح — اضغط Allow.

### الخطوة 2: إنشاء قاعدة البيانات
```powershell
npx wrangler d1 create bloom-kids-db
```
هيظهرلك `database_id` — **انسخه وحطه في ملف `wrangler.toml`** مكان `ضع-الـID-هنا`.

### الخطوة 3: إنشاء جدول التسجيلات
```powershell
npx wrangler d1 execute bloom-kids-db --remote --file=schema.sql
```

### الخطوة 4: الرفع
```powershell
npx wrangler pages deploy . --project-name=bloom-kids
```
> غيّر `bloom-kids` لاسم مشروعك الفعلي على Cloudflare Pages (اللي عملته قبل كده).

### الخطوة 5: ضبط كلمة سر الداشبورد
من لوحة Cloudflare: **Workers & Pages** ← مشروعك ← **Settings** ← **Environment variables** ← **Add**:
- الاسم: `ADMIN_PASSWORD`
- القيمة: كلمة سر قوية من اختيارك (دي اللي هتدخل بيها الداشبورد)
- النوع: اختار **Secret** (مشفرة)

### الخطوة 6: ربط قاعدة البيانات بالمشروع
لو الربط ما تمش أوتوماتيك من `wrangler.toml`، اعمله يدوي:
**Settings** ← **Bindings** ← **Add** ← **D1 database**:
- Variable name: `DB`
- D1 database: `bloom-kids-db`

بعد الخطوتين 5 و 6 اعمل رفع تاني عشان الإعدادات تتفعل:
```powershell
npx wrangler pages deploy . --project-name=bloom-kids
```

---

## 📊 استخدام لوحة التحكم

- افتحها من: `https://موقعك.pages.dev/admin.html`
- ادخل بكلمة السر اللي ضبطتها في `ADMIN_PASSWORD`
- هتلاقي: إحصائيات (الإجمالي / النهارده / آخر 7 أيام / في انتظار التواصل)، بحث بالاسم أو الرقم، فلترة بالحالة، تغيير حالة كل تسجيل (جديد ← تم التواصل ← مؤكد)، زر واتساب جنب كل رقم للتواصل المباشر، حذف، وتصدير Excel/CSV
- **اللينك ده متشاركهوش مع حد** — ومش بيظهر في جوجل

## 🔄 الرفع بعد أي تعديل مستقبلًا

```powershell
npx wrangler pages deploy . --project-name=bloom-kids
```

> **مهم:** لو عدّلت `css/style.css` أو `js/main.js` زوّد رقم النسخة في `index.html`
> (`?v=6` ← `?v=7`) قبل الرفع عشان المتصفحات تحمّل النسخة الجديدة.

---

## ⚙️ إعدادات متفرقة

| الإعداد | المكان |
|---------|--------|
| رقم الواتساب | أول سطر في [js/main.js](js/main.js) |
| لينكات فيسبوك وانستجرام | قسم `socials` في [index.html](index.html) |
| آراء الأهالي (استبدلوها بآراء حقيقية!) | قسم `testimonials` في [index.html](index.html) |
| ألوان الهوية | أول [css/style.css](css/style.css) |
| كلمة سر الداشبورد | Cloudflare ← Settings ← Environment variables |

## 📁 هيكل المشروع

```
bloom kids/
├── index.html              ← الصفحة الرئيسية
├── admin.html              ← لوحة التحكم (محمية بكلمة سر)
├── 404.html                ← صفحة الخطأ
├── schema.sql              ← هيكل قاعدة البيانات
├── wrangler.toml           ← إعدادات Cloudflare (اسم المشروع + ربط D1)
├── _headers                ← كاش وأمان
├── robots.txt              ← منع فهرسة الداشبورد
├── functions/api/          ← الباك إند (Pages Functions)
│   ├── register.js         ← استقبال التسجيلات
│   ├── login.js            ← دخول الأدمن
│   ├── registrations.js    ← قائمة التسجيلات
│   └── registrations/[id].js ← تعديل حالة / حذف
├── css/  (style.css + admin.css)
├── js/   (main.js + admin.js)
└── assets/images/          ← الصور
```

## 🧪 التجربة محليًا (اختياري)

```powershell
npx wrangler pages dev . --d1 DB=bloom-kids-db
```
بيشغل الموقع + الباك إند على `http://localhost:8788` بقاعدة بيانات محلية للتجربة.
حط `ADMIN_PASSWORD` في ملف اسمه `.dev.vars` (سطر واحد: `ADMIN_PASSWORD=test123`) عشان تجرب الداشبورد محليًا.
