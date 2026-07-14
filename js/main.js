/* ============================================================
   Bloom Kids — main.js
   ⚠️ مهم: غيّروا رقم الواتساب ده برقمكم الحقيقي
   الصيغة: كود الدولة + الرقم من غير صفر أو علامة +
   مثال لرقم مصري 01012345678 → "201012345678"
   ============================================================ */
const WHATSAPP_NUMBER = "201142444136"; // رقم بلوم كيدز على واتساب (01142444136)

/* ---------- Sticky header shadow ---------- */
const header = document.querySelector(".site-header");
window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 10);
}, { passive: true });

/* ---------- Mobile nav ---------- */
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");

navToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  navToggle.classList.toggle("open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  document.body.style.overflow = isOpen ? "hidden" : "";
});

// اقفل القائمة لما المستخدم يدوس على أي لينك
mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  });
});

/* ---------- Reveal on scroll ---------- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ---------- FAQ: اقفل الباقي لما واحد يتفتح ---------- */
const faqItems = document.querySelectorAll(".faq-item");
faqItems.forEach((item) => {
  item.addEventListener("toggle", () => {
    if (item.open) {
      faqItems.forEach((other) => {
        if (other !== item) other.open = false;
      });
    }
  });
});

/* ---------- WhatsApp links (الأيقونة العائمة + الفوتر) ---------- */
function whatsappUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

document.querySelectorAll(".js-whatsapp-link").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    const msg = "أهلًا بلوم كيدز 👋 عايز/ة أعرف أكتر عن السيشنز.";
    window.open(whatsappUrl(msg), "_blank", "noopener");
  });
});

/* ---------- نموذج الحجز → رسالة واتساب جاهزة ---------- */
const form = document.getElementById("registerForm");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  // فاليديشن بسيط
  let valid = true;
  form.querySelectorAll("[required]").forEach((field) => {
    const empty = !field.value || !field.value.trim();
    field.classList.toggle("invalid", empty);
    if (empty) valid = false;
  });
  if (!valid) {
    form.querySelector(".invalid")?.focus();
    return;
  }

  const parentName = form.parentName.value.trim();
  const phone = form.phone.value.trim();
  const childName = form.childName.value.trim();
  const childAge = form.childAge.value;
  const notes = form.notes.value.trim();

  const lines = [
    "أهلًا بلوم كيدز 👋",
    "حابب/ة أحجز مكان لطفلي في السيشنز:",
    "",
    `👤 ولي الأمر: ${parentName}`,
    `📱 رقم التواصل: ${phone}`,
    `🧒 اسم الطفل: ${childName}`,
    `🎂 السن: ${childAge}`,
  ];
  if (notes) lines.push(`📝 ملاحظات: ${notes}`);

  window.open(whatsappUrl(lines.join("\n")), "_blank", "noopener");
});

// شيل تحديد الخطأ أول ما المستخدم يكتب
form.querySelectorAll("input, select, textarea").forEach((field) => {
  field.addEventListener("input", () => field.classList.remove("invalid"));
});

/* ---------- السنة في الفوتر ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
