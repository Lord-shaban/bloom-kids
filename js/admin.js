/* ============================================================
   Bloom Kids — لوحة التحكم v2
   ============================================================ */

const API = {
  login: "/api/login",
  list: "/api/registrations",
  item: (id) => `/api/registrations/${id}`,
};

const STATUS_META = {
  new:       { label: "جديد",        icon: "🌸" },
  contacted: { label: "تم التواصل",  icon: "💬" },
  confirmed: { label: "مؤكد",        icon: "✅" },
};

const AVATAR_COLORS = ["#23a89f", "#ef5f7c", "#6a4fb6", "#f6a92c", "#7dc242", "#332d6e"];
const REFRESH_INTERVAL = 60 * 1000; // دقيقة

let token = sessionStorage.getItem("bk_token") || "";
let allItems = [];
let currentStatus = "all";
let searchTerm = "";
let sortOrder = "newest";
let drawerItemId = null;
let pendingDeleteId = null;
let refreshTimer = null;
let lastFetchAt = null;

const $ = (id) => document.getElementById(id);

/* ============================================================
   أدوات مساعدة
   ============================================================ */
function authHeaders() {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function showToast(message, type = "") {
  const toast = $("toast");
  toast.textContent = message;
  toast.className = "toast" + (type ? ` toast-${type}` : "");
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (toast.hidden = true), 2800);
}

function parseDate(sqlDate) {
  return new Date(String(sqlDate).replace(" ", "T") + "Z"); // متخزن UTC
}

function fmtFull(sqlDate) {
  const d = parseDate(sqlDate);
  if (isNaN(d)) return sqlDate;
  return d.toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit",
  });
}

function fmtRelative(sqlDate) {
  const d = parseDate(sqlDate);
  if (isNaN(d)) return sqlDate;
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "دلوقتي";
  if (diffMin < 60) return `من ${diffMin} د`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `من ${diffHr} س`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "إمبارح";
  if (diffDay < 7) return `من ${diffDay} أيام`;
  return d.toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo", day: "numeric", month: "short" });
}

function cairoDay(date) {
  return date.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
}

function waDigits(phone) {
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "2" + digits;
  else if (!digits.startsWith("20") && digits.length <= 11) digits = "2" + digits;
  return digits;
}

function waLink(item) {
  const msg = `أهلًا ${item.parent_name} 👋\nمعاك فريق بلوم كيدز 🌱\nبخصوص حجز ${item.child_name} في السيشنز — حابين نأكد معاك التفاصيل والمواعيد المناسبة.`;
  return `https://wa.me/${waDigits(item.phone)}?text=${encodeURIComponent(msg)}`;
}

function avatarFor(item) {
  const color = AVATAR_COLORS[item.id % AVATAR_COLORS.length];
  const initial = (item.parent_name || "؟").trim().charAt(0);
  return `<span class="avatar" style="background:${color}">${escapeHtml(initial)}</span>`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("تم نسخ الرقم 📋", "success");
  } catch {
    showToast("معرفناش ننسخ — انسخه يدوي", "error");
  }
}

function forceLogout() {
  sessionStorage.removeItem("bk_token");
  token = "";
  clearInterval(refreshTimer);
  $("dashboard").hidden = true;
  $("loginScreen").hidden = false;
  showToast("الجلسة انتهت — سجّل دخول تاني", "error");
}

/* ============================================================
   تسجيل الدخول
   ============================================================ */
$("passToggle").addEventListener("click", () => {
  const input = $("passwordInput");
  input.type = input.type === "password" ? "text" : "password";
});

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = $("passwordInput").value;
  const btn = $("loginBtn");
  btn.disabled = true;
  btn.textContent = "ثانية واحدة...";
  $("loginError").hidden = true;

  try {
    const res = await fetch(API.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (data.ok) {
      token = password;
      sessionStorage.setItem("bk_token", token);
      enterDashboard();
    } else {
      $("loginError").textContent = data.error || "كلمة السر غلط، جرّب تاني 🙈";
      $("loginError").hidden = false;
      const card = $("loginCard");
      card.classList.remove("shake");
      void card.offsetWidth; // إعادة تشغيل الأنيميشن
      card.classList.add("shake");
    }
  } catch {
    $("loginError").textContent = "مش قادرين نوصل للسيرفر — اتأكد من النت";
    $("loginError").hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "دخول";
  }
});

function enterDashboard() {
  $("loginScreen").hidden = true;
  $("dashboard").hidden = false;
  loadData();
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => loadData({ silent: true }), REFRESH_INTERVAL);
}

$("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("bk_token");
  token = "";
  clearInterval(refreshTimer);
  location.reload();
});

// تحديث صامت لما المستخدم يرجع للتاب
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && token && !$("dashboard").hidden) loadData({ silent: true });
});

/* ============================================================
   تحميل البيانات
   ============================================================ */
async function loadData({ silent = false } = {}) {
  if (!silent) {
    $("skeletons").hidden = false;
    $("errorState").hidden = true;
    $("emptyState").hidden = true;
    $("noResults").hidden = true;
    $("listBody").innerHTML = "";
  }
  $("refreshBtn").classList.add("spinning");

  try {
    const res = await fetch(API.list, { headers: authHeaders() });
    if (res.status === 401) return forceLogout();

    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "حصلت مشكلة في تحميل البيانات");

    const prevIds = new Set(allItems.map((i) => i.id));
    const fresh = data.items || [];

    // إشعار لو وصل تسجيل جديد أثناء التحديث التلقائي
    if (silent && allItems.length && fresh.some((i) => !prevIds.has(i.id))) {
      showToast("وصل تسجيل جديد 🎉", "success");
    }

    allItems = fresh;
    lastFetchAt = new Date();
    render();
  } catch (err) {
    if (!silent) {
      $("errorMessage").textContent = err.message;
      $("errorState").hidden = false;
    }
  } finally {
    $("skeletons").hidden = true;
    $("refreshBtn").classList.remove("spinning");
    updateLastUpdateLabel();
  }
}

function updateLastUpdateLabel() {
  if (!lastFetchAt) return;
  $("lastUpdate").textContent = "آخر تحديث " +
    lastFetchAt.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
}

$("refreshBtn").addEventListener("click", () => loadData());
$("retryBtn").addEventListener("click", () => loadData());

/* ============================================================
   العرض
   ============================================================ */
function getFiltered() {
  let items = allItems.filter((item) => {
    const matchesStatus = currentStatus === "all" || item.status === currentStatus;
    const q = searchTerm.trim();
    const matchesSearch =
      !q ||
      item.parent_name.includes(q) ||
      item.child_name.includes(q) ||
      item.phone.includes(q);
    return matchesStatus && matchesSearch;
  });
  if (sortOrder === "oldest") items = [...items].reverse();
  return items;
}

function render() {
  renderStats();
  renderCounts();

  const items = getFiltered();
  $("listBody").innerHTML = items.map(rowHtml).join("");
  $("emptyState").hidden = !(allItems.length === 0);
  $("noResults").hidden = !(allItems.length > 0 && items.length === 0);

  bindRowEvents();
}

function rowHtml(item) {
  const meta = STATUS_META[item.status] || STATUS_META.new;
  const options = Object.entries(STATUS_META)
    .map(([v, m]) => `<option value="${v}" ${v === item.status ? "selected" : ""}>${m.icon} ${m.label}</option>`)
    .join("");

  return `<div class="reg-row" data-id="${item.id}">
    <div class="col-parent">
      ${item.status === "new" ? '<span class="new-dot" title="جديد"></span>' : ""}
      ${avatarFor(item)}
      <span class="p-name">${escapeHtml(item.parent_name)}</span>
    </div>
    <div class="col-contact">
      <span class="phone-txt">${escapeHtml(item.phone)}</span>
      <button class="mini-btn" data-copy="${escapeHtml(item.phone)}" title="نسخ الرقم">📋</button>
      <a class="mini-btn wa" href="${waLink(item)}" target="_blank" rel="noopener" title="واتساب" data-stop>💬</a>
    </div>
    <div class="col-child">
      <span class="c-name">${escapeHtml(item.child_name)}</span>
      <span class="c-age">${escapeHtml(item.child_age)}</span>
    </div>
    <div class="col-status">
      <select class="status-pill s-${item.status}" data-id="${item.id}" title="غيّر الحالة">${options}</select>
    </div>
    <div class="col-time" title="${escapeHtml(fmtFull(item.created_at))}">${fmtRelative(item.created_at)}</div>
    <div class="col-actions">
      <button class="mini-btn" data-open="${item.id}" title="التفاصيل">👁️</button>
      <button class="mini-btn" data-del="${item.id}" title="حذف">🗑️</button>
    </div>
  </div>`;
}

function bindRowEvents() {
  const body = $("listBody");

  body.querySelectorAll(".reg-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      // متفتحش التفاصيل لو الضغطة كانت على عنصر تفاعلي
      if (e.target.closest("select, button, a")) return;
      openDrawer(Number(row.dataset.id));
    });
  });

  body.querySelectorAll(".status-pill").forEach((sel) => {
    sel.addEventListener("click", (e) => e.stopPropagation());
    sel.addEventListener("change", () => updateStatus(Number(sel.dataset.id), sel.value));
  });

  body.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyText(btn.dataset.copy);
    });
  });

  body.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openDrawer(Number(btn.dataset.open));
    });
  });

  body.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      askDelete(Number(btn.dataset.del));
    });
  });

  body.querySelectorAll("a[data-stop]").forEach((a) => {
    a.addEventListener("click", (e) => e.stopPropagation());
  });
}

function renderStats() {
  const now = new Date();
  const today = cairoDay(now);
  $("statTotal").textContent = allItems.length;
  $("statToday").textContent = allItems.filter((i) => cairoDay(parseDate(i.created_at)) === today).length;
  $("statWeek").textContent = allItems.filter((i) => now - parseDate(i.created_at) < 7 * 864e5).length;

  const newCount = allItems.filter((i) => i.status === "new").length;
  $("statNew").textContent = newCount;
  $("statNewCard").classList.toggle("has-new", newCount > 0);
}

function renderCounts() {
  $("cAll").textContent = allItems.length;
  $("cNew").textContent = allItems.filter((i) => i.status === "new").length;
  $("cContacted").textContent = allItems.filter((i) => i.status === "contacted").length;
  $("cConfirmed").textContent = allItems.filter((i) => i.status === "confirmed").length;
}

/* ============================================================
   الفلاتر والبحث والترتيب
   ============================================================ */
$("searchInput").addEventListener("input", (e) => {
  searchTerm = e.target.value;
  render();
});

$("statusFilters").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  currentStatus = chip.dataset.status;
  render();
});

$("sortSelect").addEventListener("change", (e) => {
  sortOrder = e.target.value;
  render();
});

/* ============================================================
   تعديل الحالة
   ============================================================ */
async function updateStatus(id, status) {
  try {
    const res = await fetch(API.item(id), {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    if (res.status === 401) return forceLogout();
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);

    const item = allItems.find((i) => i.id === id);
    if (item) item.status = status;
    render();
    if (drawerItemId === id) fillDrawer(item);
    showToast(`الحالة بقت: ${STATUS_META[status].label} ${STATUS_META[status].icon}`, "success");
  } catch (err) {
    showToast(err.message || "معرفناش نحدث الحالة", "error");
    render();
  }
}

/* ============================================================
   بانل التفاصيل
   ============================================================ */
function openDrawer(id) {
  const item = allItems.find((i) => i.id === id);
  if (!item) return;
  drawerItemId = id;
  fillDrawer(item);
  $("drawerOverlay").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  $("drawerOverlay").hidden = true;
  drawerItemId = null;
  document.body.style.overflow = "";
}

function fillDrawer(item) {
  const statusBtns = Object.entries(STATUS_META)
    .map(([v, m]) =>
      `<button class="d-status-btn s-${v} ${item.status === v ? "active" : ""}" data-status="${v}">${m.icon} ${m.label}</button>`
    ).join("");

  $("drawerBody").innerHTML = `
    <div class="d-profile">
      ${avatarFor(item)}
      <div>
        <strong>${escapeHtml(item.parent_name)}</strong>
        <small>سجّل ${fmtFull(item.created_at)}</small>
      </div>
    </div>

    <div class="d-grid">
      <div class="d-field"><label>اسم الطفل</label><div>${escapeHtml(item.child_name)}</div></div>
      <div class="d-field"><label>السن</label><div>${escapeHtml(item.child_age)}</div></div>
      <div class="d-field full"><label>رقم الواتساب</label><div class="ltr">${escapeHtml(item.phone)}</div></div>
      <div class="d-field full"><label>ملاحظات ولي الأمر</label><div>${escapeHtml(item.notes || "لا يوجد")}</div></div>
    </div>

    <p class="d-section-title">حالة الحجز</p>
    <div class="d-status-group">${statusBtns}</div>

    <div class="d-actions">
      <a class="d-btn d-btn-wa" href="${waLink(item)}" target="_blank" rel="noopener">💬 ابدأ التواصل على واتساب</a>
      <button class="d-btn d-btn-copy" id="dCopyBtn">📋 نسخ رقم الهاتف</button>
      <button class="d-btn d-btn-del" id="dDelBtn">🗑️ حذف التسجيل</button>
    </div>`;

  $("drawerBody").querySelectorAll(".d-status-btn").forEach((btn) => {
    btn.addEventListener("click", () => updateStatus(item.id, btn.dataset.status));
  });
  $("dCopyBtn").addEventListener("click", () => copyText(item.phone));
  $("dDelBtn").addEventListener("click", () => askDelete(item.id));
}

$("drawerClose").addEventListener("click", closeDrawer);
$("drawerOverlay").addEventListener("click", (e) => {
  if (e.target === $("drawerOverlay")) closeDrawer();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!$("confirmModal").hidden) hideConfirm();
    else if (!$("drawerOverlay").hidden) closeDrawer();
  }
});

/* ============================================================
   الحذف (بمودال تأكيد)
   ============================================================ */
function askDelete(id) {
  const item = allItems.find((i) => i.id === id);
  if (!item) return;
  pendingDeleteId = id;
  $("confirmText").textContent =
    `هتحذف تسجيل "${item.parent_name}" (${item.child_name}) نهائيًا — مش هينفع تتراجع.`;
  $("confirmModal").hidden = false;
}

function hideConfirm() {
  $("confirmModal").hidden = true;
  pendingDeleteId = null;
}

$("confirmCancel").addEventListener("click", hideConfirm);
$("confirmModal").addEventListener("click", (e) => {
  if (e.target === $("confirmModal")) hideConfirm();
});

$("confirmDelete").addEventListener("click", async () => {
  const id = pendingDeleteId;
  hideConfirm();
  if (!id) return;

  try {
    const res = await fetch(API.item(id), { method: "DELETE", headers: authHeaders() });
    if (res.status === 401) return forceLogout();
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);

    allItems = allItems.filter((i) => i.id !== id);
    if (drawerItemId === id) closeDrawer();
    render();
    showToast("تم الحذف 🗑️");
  } catch (err) {
    showToast(err.message || "معرفناش نحذف التسجيل", "error");
  }
});

/* ============================================================
   تصدير CSV
   ============================================================ */
$("exportBtn").addEventListener("click", () => {
  if (!allItems.length) {
    showToast("مفيش بيانات للتصدير", "error");
    return;
  }

  const header = ["ولي الأمر", "الهاتف", "الطفل", "السن", "ملاحظات", "الحالة", "التاريخ"];
  const rows = allItems.map((i) => [
    i.parent_name, i.phone, i.child_name, i.child_age,
    i.notes || "", STATUS_META[i.status]?.label || i.status, fmtFull(i.created_at),
  ]);

  const csvEscape = (v) => `"${String(v).replaceAll('"', '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }); // BOM للإكسل
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bloom-kids-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("تم تنزيل الملف 📥", "success");
});

/* ============================================================
   البداية
   ============================================================ */
$("year").textContent = new Date().getFullYear();

if (token) enterDashboard();
