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

/* ---------- نموذج الحجز → يتسجل في قاعدة البيانات (الداشبورد) ---------- */
const form = document.getElementById("registerForm");
const submitBtn = document.getElementById("submitBtn");
const formFeedback = document.getElementById("formFeedback");

form.addEventListener("submit", async (e) => {
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

  const payload = {
    parentName: form.parentName.value.trim(),
    phone: form.phone.value.trim(),
    childName: form.childName.value.trim(),
    childAge: form.childAge.value,
    notes: form.notes.value.trim(),
    website: form.website.value, // honeypot
  };

  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "⏳ ثانية واحدة...";
  formFeedback.hidden = true;

  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!data.ok) throw new Error(data.error || "حصلت مشكلة، حاول تاني");

    // نجاح 🎉 — نستبدل النموذج برسالة تأكيد
    form.innerHTML = `
      <div class="form-success">
        <span class="success-icon">🎉</span>
        <h3>تم استلام طلبك بنجاح!</h3>
        <p>أهلًا بيكم في عيلة بلوم كيدز 💜<br>
        هنتواصل معاك على واتساب في أقرب وقت لتأكيد الحجز وتحديد المواعيد المناسبة.</p>
      </div>`;
  } catch (err) {
    // فشل — نعرض رسالة الخطأ مع بديل الواتساب
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    formFeedback.innerHTML = `⚠️ ${err.message}<br>
      أو ابعتلنا مباشرة على
      <a href="${whatsappUrl("أهلًا بلوم كيدز 👋 حاولت أسجل من الموقع وحصلت مشكلة — حابب أحجز لطفلي.")}"
         target="_blank" rel="noopener"><strong>واتساب من هنا</strong></a>`;
    formFeedback.hidden = false;
  }
});

// شيل تحديد الخطأ أول ما المستخدم يكتب
form.querySelectorAll("input, select, textarea").forEach((field) => {
  field.addEventListener("input", () => field.classList.remove("invalid"));
});

/* ---------- السنة في الفوتر ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
