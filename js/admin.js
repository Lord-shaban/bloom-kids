/* ============================================================
   Bloom Kids — لوحة التحكم
   ============================================================ */

const API = {
  login: "/api/login",
  list: "/api/registrations",
  item: (id) => `/api/registrations/${id}`,
};

const STATUS_LABELS = {
  new: "🌸 جديد",
  contacted: "💬 تم التواصل",
  confirmed: "✅ مؤكد",
};

let token = sessionStorage.getItem("bk_token") || "";
let allItems = [];
let currentStatus = "all";
let searchTerm = "";

/* ---------- عناصر ---------- */
const $ = (id) => document.getElementById(id);
const loginScreen = $("loginScreen");
const dashboard = $("dashboard");
const tbody = $("regTbody");

/* ---------- أدوات ---------- */
function authHeaders() {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function showToast(message, isError = false) {
  const toast = $("toast");
  toast.textContent = message;
  toast.className = "toast" + (isError ? " toast-error" : "");
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (toast.hidden = true), 2600);
}

function waLink(phone) {
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "2" + digits;       // 010... → 2010...
  else if (!digits.startsWith("20") && digits.length <= 11) digits = "2" + digits;
  return `https://wa.me/${digits}`;
}

function fmtDate(sqlDate) {
  // التواريخ متخزنة UTC — بنعرضها بتوقيت القاهرة
  const d = new Date(sqlDate.replace(" ", "T") + "Z");
  if (isNaN(d)) return sqlDate;
  return d.toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}

function isToday(sqlDate) {
  const d = new Date(sqlDate.replace(" ", "T") + "Z");
  const now = new Date();
  const cairoDay = (x) => x.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  return cairoDay(d) === cairoDay(now);
}

function isWithinDays(sqlDate, days) {
  const d = new Date(sqlDate.replace(" ", "T") + "Z");
  return Date.now() - d.getTime() < days * 24 * 60 * 60 * 1000;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

/* ---------- تسجيل الدخول ---------- */
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
  loginScreen.hidden = true;
  dashboard.hidden = false;
  loadData();
}

$("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("bk_token");
  token = "";
  location.reload();
});

/* ---------- تحميل البيانات ---------- */
async function loadData() {
  $("loadingState").hidden = false;
  $("errorState").hidden = true;
  $("emptyState").hidden = true;
  tbody.innerHTML = "";

  try {
    const res = await fetch(API.list, { headers: authHeaders() });

    if (res.status === 401) {
      sessionStorage.removeItem("bk_token");
      token = "";
      dashboard.hidden = true;
      loginScreen.hidden = false;
      return;
    }

    const data = await res.json();
    if (!data.ok) throw new Error(data.error);

    allItems = data.items || [];
    render();
  } catch (err) {
    $("errorMessage").textContent = err.message || "حصلت مشكلة في تحميل البيانات";
    $("errorState").hidden = false;
  } finally {
    $("loadingState").hidden = true;
  }
}

$("refreshBtn").addEventListener("click", () => {
  loadData();
  showToast("تم تحديث البيانات ✅");
});
$("retryBtn").addEventListener("click", loadData);

/* ---------- العرض ---------- */
function getFiltered() {
  return allItems.filter((item) => {
    const matchesStatus = currentStatus === "all" || item.status === currentStatus;
    const q = searchTerm.trim();
    const matchesSearch =
      !q ||
      item.parent_name.includes(q) ||
      item.child_name.includes(q) ||
      item.phone.includes(q);
    return matchesStatus && matchesSearch;
  });
}

function render() {
  renderStats();
  const items = getFiltered();
  tbody.innerHTML = items.map(rowHtml).join("");
  $("emptyState").hidden = allItems.length > 0;

  // ربط الأحداث
  tbody.querySelectorAll(".status-select").forEach((sel) => {
    sel.addEventListener("change", () => updateStatus(sel.dataset.id, sel.value, sel));
  });
  tbody.querySelectorAll(".del-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteItem(btn.dataset.id, btn.dataset.name));
  });
}

function rowHtml(item) {
  const statusOptions = Object.entries(STATUS_LABELS)
    .map(([value, label]) =>
      `<option value="${value}" ${value === item.status ? "selected" : ""}>${label}</option>`
    ).join("");

  return `<tr>
    <td class="cell-parent"><strong>${escapeHtml(item.parent_name)}</strong></td>
    <td class="cell-phone"><a href="${waLink(item.phone)}" target="_blank" rel="noopener" title="افتح واتساب">${escapeHtml(item.phone)}</a></td>
    <td class="cell-child">${escapeHtml(item.child_name)}</td>
    <td class="cell-age">${escapeHtml(item.child_age)}</td>
    <td class="cell-notes">${escapeHtml(item.notes || "—")}</td>
    <td>
      <select class="status-select s-${item.status}" data-id="${item.id}">
        ${statusOptions}
      </select>
    </td>
    <td class="cell-date">${fmtDate(item.created_at)}</td>
    <td>
      <div class="row-actions">
        <a class="action-btn wa-btn" href="${waLink(item.phone)}" target="_blank" rel="noopener" title="كلمه على واتساب">💬</a>
        <button class="action-btn del-btn" data-id="${item.id}" data-name="${escapeHtml(item.parent_name)}" title="حذف">🗑️</button>
      </div>
    </td>
  </tr>`;
}

function renderStats() {
  $("statTotal").textContent = allItems.length;
  $("statToday").textContent = allItems.filter((i) => isToday(i.created_at)).length;
  $("statWeek").textContent = allItems.filter((i) => isWithinDays(i.created_at, 7)).length;
  $("statNew").textContent = allItems.filter((i) => i.status === "new").length;
}

/* ---------- الفلاتر ---------- */
$("searchInput").addEventListener("input", (e) => {
  searchTerm = e.target.value;
  render();
});

$("statusFilters").addEventListener("click", (e) => {
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;
  document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  currentStatus = chip.dataset.status;
  render();
});

/* ---------- تعديل الحالة ---------- */
async function updateStatus(id, status, selectEl) {
  try {
    const res = await fetch(API.item(id), {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);

    const item = allItems.find((i) => String(i.id) === String(id));
    if (item) item.status = status;
    selectEl.className = `status-select s-${status}`;
    renderStats();
    showToast("تم تحديث الحالة ✅");
  } catch (err) {
    showToast(err.message || "معرفناش نحدث الحالة", true);
    render(); // رجّع العرض للحالة الفعلية
  }
}

/* ---------- الحذف ---------- */
async function deleteItem(id, name) {
  if (!confirm(`متأكد إنك عايز تحذف تسجيل "${name}"؟\nمش هينفع تتراجع بعدها.`)) return;

  try {
    const res = await fetch(API.item(id), { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);

    allItems = allItems.filter((i) => String(i.id) !== String(id));
    render();
    showToast("تم الحذف 🗑️");
  } catch (err) {
    showToast(err.message || "معرفناش نحذف التسجيل", true);
  }
}

/* ---------- تصدير CSV ---------- */
$("exportBtn").addEventListener("click", () => {
  if (!allItems.length) {
    showToast("مفيش بيانات للتصدير", true);
    return;
  }

  const header = ["ولي الأمر", "الهاتف", "الطفل", "السن", "ملاحظات", "الحالة", "التاريخ"];
  const statusText = { new: "جديد", contacted: "تم التواصل", confirmed: "مؤكد" };

  const rows = allItems.map((i) => [
    i.parent_name, i.phone, i.child_name, i.child_age,
    i.notes || "", statusText[i.status] || i.status, fmtDate(i.created_at),
  ]);

  const csvEscape = (v) => `"${String(v).replaceAll('"', '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");

  // BOM عشان الإكسل يقرا العربي صح
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bloom-kids-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("تم تنزيل الملف 📥");
});

/* ---------- البداية ---------- */
$("year").textContent = new Date().getFullYear();

if (token) {
  // جلسة سابقة — ندخل مباشرة (لو الباسورد اتغير هيرجع لشاشة الدخول تلقائيًا)
  enterDashboard();
}
