/**
 * أدوات LiveKit المشتركة بين ملفات /api
 * (الاسم بيبدأ بـ _ عشان Cloudflare Pages ميعتبروش endpoint)
 */

export const ROOM_PREFIX = "bloom-";
export const TOKEN_HOURS = 3;

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/* الكود بيتحوّل لحروف وأرقام وشرطات بس — بنكرر التنضيف على
   السيرفر لأن أي حاجة جاية من العميل مش موثوقة */
export function cleanCode(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function missingConfig(env) {
  return !env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET;
}

/* المدرّس بيتعرف بمفتاح محفوظ على السيرفر — العميل مبيقولش
   "أنا مدرّس" ونصدّقه */
export function checkHostKey(env, key) {
  if (!env.MEETING_HOST_KEY) return false;
  return String(key ?? "") === env.MEETING_HOST_KEY;
}

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
export async function signToken(env, payload) {
  const data =
    b64urlJson({ alg: "HS256", typ: "JWT" }) + "." + b64urlJson(payload);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.LIVEKIT_API_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );

  return data + "." + b64url(sig);
}

/* عنوان الـ API بيتبني من عنوان الويب سوكيت: wss:// → https:// */
export function httpBase(env) {
  return String(env.LIVEKIT_URL).replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/+$/, "");
}

/**
 * نداء RoomService عند LiveKit.
 * بيحتاج توكن فيه roomAdmin للأوضة دي.
 */
export async function roomService(env, method, body, room) {
  const token = await signToken(env, {
    iss: env.LIVEKIT_API_KEY,
    sub: "bloom-admin",
    nbf: Math.floor(Date.now() / 1000) - 10,
    exp: Math.floor(Date.now() / 1000) + 60,
    video: { room, roomAdmin: true, roomJoin: false },
  });

  const res = await fetch(`${httpBase(env)}/twirp/livekit.RoomService/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}
