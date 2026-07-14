/**
 * GET /api/registrations — قائمة كل التسجيلات (محمي بكلمة السر)
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function authorized(context) {
  const header = context.request.headers.get("Authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token && context.env.ADMIN_PASSWORD && token === context.env.ADMIN_PASSWORD;
}

export async function onRequestGet(context) {
  if (!authorized(context)) {
    return json({ ok: false, error: "غير مصرح" }, 401);
  }

  try {
    const { results } = await context.env.DB.prepare(
      `SELECT id, parent_name, phone, child_name, child_age, notes, status, created_at
       FROM registrations
       ORDER BY created_at DESC, id DESC
       LIMIT 2000`
    ).all();

    return json({ ok: true, items: results });
  } catch (err) {
    return json({ ok: false, error: "حصلت مشكلة في تحميل البيانات" }, 500);
  }
}
