/**
 * POST /api/meeting — تجهيز أوضة السيشن عند Daily.co
 *
 * مفتاح Daily بيفضل على السيرفر هنا ومبيوصلش للمتصفح أبداً.
 * الرد بيرجّع لينك الأوضة + توكن للمشارك بس.
 *
 * متغيرات البيئة المطلوبة في إعدادات Cloudflare Pages:
 *   DAILY_API_KEY    (سر) — من dashboard.daily.co → Developers
 *   MEETING_HOST_KEY (سر، اختياري) — كلمة سر المدرّس عشان يبقى
 *                    مالك الأوضة (يقدر يكتم ويطرد). لو مش متظبطة،
 *                    الكل بيدخل كمشارك عادي والسيشن تشتغل عادي.
 */

const DAILY_API = "https://api.daily.co/v1";
const ROOM_PREFIX = "bloom-";
const ROOM_HOURS = 3; // الأوضة بتقفل لوحدها بعد ٣ ساعات

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/* الكود بيتحوّل لحروف وأرقام وشرطات بس — نفس التنضيف اللي في المتصفح،
   بس بنكرره هنا لأن أي حاجة جاية من العميل مش موثوقة */
function cleanCode(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function daily(env, path, init = {}) {
  const res = await fetch(DAILY_API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.DAILY_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

/**
 * بنجيب الأوضة لو موجودة، وننشئها لو لأ.
 * مهم: كل الأطفال بينادوا نفس الـ endpoint في نفس اللحظة تقريباً،
 * فلازم نتعامل مع إن اتنين يحاولوا ينشئوها في نفس الوقت.
 */
async function ensureRoom(env, name) {
  const existing = await daily(env, `/rooms/${name}`);
  if (existing.ok) return existing;

  const created = await daily(env, "/rooms", {
    method: "POST",
    body: JSON.stringify({
      name,
      privacy: "public",
      properties: {
        start_video_off: true,      // مفيش كاميرا من أول لحظة
        start_audio_off: true,      // بيدخل ساكت
        enable_screenshare: true,
        enable_chat: false,         // مفيش شات
        enable_prejoin_ui: false,   // إحنا بناخد الاسم قبل كده
        enable_knocking: false,
        max_participants: 30,
        exp: Math.floor(Date.now() / 1000) + ROOM_HOURS * 3600,
      },
    }),
  });

  if (created.ok) return created;

  // اتعملت في نفس اللحظة من طلب تاني — نجيبها تاني
  const retry = await daily(env, `/rooms/${name}`);
  if (retry.ok) return retry;

  return created;
}

export async function onRequestPost(context) {
  const { env } = context;

  if (!env.DAILY_API_KEY) {
    return json(
      {
        ok: false,
        error: "خدمة السيشن لسه مش متظبطة. لازم تتحط DAILY_API_KEY في إعدادات الموقع.",
        code: "no-key",
      },
      503
    );
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: "بيانات غير صالحة" }, 400);
  }

  const code = cleanCode(body.code);
  const name = String(body.name ?? "").trim().slice(0, 40);

  if (!code) return json({ ok: false, error: "كود السيشن ناقص" }, 400);
  if (name.length < 2) return json({ ok: false, error: "الاسم ناقص" }, 400);

  // المدرّس بيبقى مالك الأوضة لو بعت المفتاح الصح
  const wantsHost = body.host === true;
  const isHost =
    wantsHost &&
    !!env.MEETING_HOST_KEY &&
    String(body.hostKey ?? "") === env.MEETING_HOST_KEY;

  if (wantsHost && !isHost) {
    return json({ ok: false, error: "مفتاح المدرّس غلط" }, 403);
  }

  const roomName = ROOM_PREFIX + code;

  const room = await ensureRoom(env, roomName);
  if (!room.ok) {
    return json(
      { ok: false, error: "مقدرناش نجهّز الأوضة، حاول تاني بعد شوية" },
      502
    );
  }

  const token = await daily(env, "/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: name,
        is_owner: isHost,
        start_video_off: true,
        start_audio_off: true,
        exp: Math.floor(Date.now() / 1000) + ROOM_HOURS * 3600,
      },
    }),
  });

  if (!token.ok) {
    return json({ ok: false, error: "مقدرناش ندخّلك السيشن، حاول تاني" }, 502);
  }

  return json({
    ok: true,
    url: room.data.url,
    token: token.data.token,
    isHost,
  });
}
