/**
 * PATCH  /api/registrations/:id — تغيير حالة التسجيل (جديد / تم التواصل / مؤكد)
 * DELETE /api/registrations/:id — حذف تسجيل
 * (محمي بكلمة السر)
 */

const ALLOWED_STATUSES = ["new", "contacted", "confirmed"];

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

export async function onRequestPatch(context) {
  if (!authorized(context)) return json({ ok: false, error: "غير مصرح" }, 401);

  const id = Number(context.params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "رقم غير صالح" }, 400);

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: "بيانات غير صالحة" }, 400);
  }

  const status = String(body.status ?? "");
  if (!ALLOWED_STATUSES.includes(status)) {
    return json({ ok: false, error: "حالة غير معروفة" }, 400);
  }

  try {
    const result = await context.env.DB.prepare(
      `UPDATE registrations SET status = ?1 WHERE id = ?2`
    )
      .bind(status, id)
      .run();

    if (!result.meta.changes) return json({ ok: false, error: "التسجيل مش موجود" }, 404);
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: "حصلت مشكلة، حاول تاني" }, 500);
  }
}

export async function onRequestDelete(context) {
  if (!authorized(context)) return json({ ok: false, error: "غير مصرح" }, 401);

  const id = Number(context.params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "رقم غير صالح" }, 400);

  try {
    const result = await context.env.DB.prepare(`DELETE FROM registrations WHERE id = ?1`)
      .bind(id)
      .run();

    if (!result.meta.changes) return json({ ok: false, error: "التسجيل مش موجود" }, 404);
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: "حصلت مشكلة، حاول تاني" }, 500);
  }
}
