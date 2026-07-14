/**
 * POST /api/login — تسجيل دخول الأدمن للداشبورد
 * بيقارن الباسورد بمتغير البيئة ADMIN_PASSWORD المضبوط في إعدادات Cloudflare Pages
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function onRequestPost(context) {
  const adminPassword = context.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return json({ ok: false, error: "ADMIN_PASSWORD مش مضبوط في إعدادات المشروع" }, 500);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: "بيانات غير صالحة" }, 400);
  }

  const supplied = String(body.password ?? "");

  // مقارنة بطول ثابت للحد من هجمات التوقيت
  const enc = new TextEncoder();
  const a = await crypto.subtle.digest("SHA-256", enc.encode(supplied));
  const b = await crypto.subtle.digest("SHA-256", enc.encode(adminPassword));
  const va = new Uint8Array(a);
  const vb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];

  if (diff !== 0) {
    return json({ ok: false, error: "كلمة السر غلط" }, 401);
  }

  return json({ ok: true });
}
