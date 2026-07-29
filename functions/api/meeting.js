/**
 * POST /api/meeting — تذكرة دخول السيشن (LiveKit)
 *
 * ليه LiveKit؟ لأنه الوحيد اللي بيشتغل من غير ما تضيف كارت.
 * الباقة المجانية (Build): ٥٠٠٠ دقيقة شهرياً، وبتقف لوحدها لما
 * تخلص فمفيش فاتورة مفاجئة.
 *
 * السر بيفضل على السيرفر هنا ومبيوصلش للمتصفح. اللي بيرجع للطفل
 * هو توكن موقّع صلاحيته ٣ ساعات وللأوضة دي بس.
 *
 * متغيرات البيئة المطلوبة في إعدادات Cloudflare Pages:
 *   LIVEKIT_URL        wss://xxxx.livekit.cloud   (من LiveKit Cloud)
 *   LIVEKIT_API_KEY    مفتاح المشروع
 *   LIVEKIT_API_SECRET سر المشروع  (سر — اعمله Encrypt)
 *   MEETING_HOST_KEY   (اختياري) كلمة سر المدرّس عشان يبقى أدمن
 *                      الأوضة ويقدر يكتم ويطرد
 *
 * مفيش خطوة "إنشاء أوضة" — LiveKit بيعمل الأوضة لوحده أول ما حد
 * يدخل بتوكن صالح، وبيقفلها لوحده لما تفضى.
 */

const ROOM_PREFIX = "bloom-";
const HOURS = 3;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/* الكود بيتحوّل لحروف وأرقام وشرطات بس — بنكرر التنضيف هنا لأن
   أي حاجة جاية من العميل مش موثوقة */
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

/* base64url من غير padding — ده اللي الـ JWT بيستخدمه */
function b64url(bytes) {
  let bin = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlJson(obj) {
  return b64url(new TextEncoder().encode(JSON.stringify(obj)));
}

/* توكن LiveKit = JWT عادي موقّع HS256 بسر المشروع */
async function signToken(apiKey, apiSecret, payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const data = b64urlJson(header) + "." + b64urlJson(payload);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));

  return data + "." + b64url(sig);
}

export async function onRequestPost(context) {
  const { env } = context;

  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    return json(
      {
        ok: false,
        code: "no-key",
        error:
          "خدمة السيشن لسه مش متظبطة. لازم تتحط LIVEKIT_URL و LIVEKIT_API_KEY و LIVEKIT_API_SECRET في إعدادات الموقع.",
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

  // المدرّس بيبقى أدمن الأوضة لو بعت المفتاح الصح
  const wantsHost = body.host === true;
  const isHost =
    wantsHost &&
    !!env.MEETING_HOST_KEY &&
    String(body.hostKey ?? "") === env.MEETING_HOST_KEY;

  if (wantsHost && !isHost) {
    return json({ ok: false, error: "مفتاح المدرّس غلط" }, 403);
  }

  const now = Math.floor(Date.now() / 1000);
  const room = ROOM_PREFIX + code;

  /* الهوية لازم تبقى فريدة، وإلا لو اتنين بنفس الاسم دخلوا،
     التاني بيطرد الأول من الأوضة */
  const identity = name + "-" + crypto.randomUUID().slice(0, 8);

  let token;
  try {
    token = await signToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      iss: env.LIVEKIT_API_KEY,
      sub: identity,
      name,
      nbf: now - 10, // شوية سماحية لو ساعة الجهاز مظبوطة بالظبط
      exp: now + HOURS * 3600,
      video: {
        room,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        roomAdmin: isHost,
      },
    });
  } catch {
    return json({ ok: false, error: "مقدرناش نجهّز دخولك، حاول تاني" }, 500);
  }

  return json({
    ok: true,
    url: env.LIVEKIT_URL,
    token,
    room,
    identity,
    isHost,
  });
}
