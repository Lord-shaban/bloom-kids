/**
 * POST /api/register — استقبال تسجيل جديد من نموذج الحجز (عام)
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function clean(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: "بيانات غير صالحة" }, 400);
  }

  // Honeypot: حقل مخفي — البشر مش بيملوه، البوتات بتملأه
  if (body.website) {
    return json({ ok: true }); // نتجاهل بصمت
  }

  const parentName = clean(body.parentName, 100);
  const phone = clean(body.phone, 20).replace(/[^\d+]/g, "");
  const childName = clean(body.childName, 100);
  const childAge = clean(body.childAge, 20);
  const notes = clean(body.notes, 1000);

  if (!parentName || !childName || !childAge) {
    return json({ ok: false, error: "من فضلك املأ كل الحقول المطلوبة" }, 400);
  }
  if (phone.replace(/\D/g, "").length < 10) {
    return json({ ok: false, error: "رقم الهاتف غير صحيح" }, 400);
  }

  try {
    await context.env.DB.prepare(
      `INSERT INTO registrations (parent_name, phone, child_name, child_age, notes)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    )
      .bind(parentName, phone, childName, childAge, notes)
      .run();
  } catch (err) {
    return json({ ok: false, error: "حصلت مشكلة مؤقتة، حاول تاني" }, 500);
  }

  return json({ ok: true });
}
