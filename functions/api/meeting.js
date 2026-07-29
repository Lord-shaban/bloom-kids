/**
 * POST /api/meeting — تذكرة دخول السيشن (LiveKit)
 *
 * فيه دورين مفصولين تماماً، والفرق بينهم متفرض من السيرفر جوه
 * التوكن نفسه — مش بإخفاء أزرار في الصفحة:
 *
 *   طالب  → يقدر يفتح الميك بس (canPublishSources: microphone)
 *           يعني حتى لو عبث بالكود، LiveKit هيرفض أي مشاركة شاشة.
 *   مدرّس → ميك + مشاركة شاشة + roomAdmin (يكتم ويطرد وينظّم).
 *
 * دخول المدرّس بيحتاج MEETING_HOST_KEY. من غير المفتاح الصح
 * الطلب بيترفض، ومفيش أي طريقة تانية تاخد صلاحيات مدرّس.
 */

import {
  ROOM_PREFIX,
  TOKEN_HOURS,
  json,
  cleanCode,
  missingConfig,
  checkHostKey,
  signToken,
} from "./_lk.js";

export async function onRequestPost(context) {
  const { env } = context;

  if (missingConfig(env)) {
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
  const wantsHost = body.role === "host";

  if (!code) return json({ ok: false, error: "كود السيشن ناقص" }, 400);
  if (name.length < 2) return json({ ok: false, error: "الاسم ناقص" }, 400);

  if (wantsHost && !checkHostKey(env, body.hostKey)) {
    return json({ ok: false, code: "bad-host-key", error: "مفتاح المدرّس غلط" }, 403);
  }

  const isHost = wantsHost;
  const now = Math.floor(Date.now() / 1000);
  const room = ROOM_PREFIX + code;

  /* الهوية لازم تبقى فريدة، وإلا لو اتنين بنفس الاسم دخلوا،
     التاني بيطرد الأول من الأوضة. وبنعلّم المدرّس ببادئة عشان
     الواجهة تعرفه من غير ما تسأل السيرفر تاني */
  const identity =
    (isHost ? "host-" : "kid-") + crypto.randomUUID().slice(0, 8);

  const token = await signToken(env, {
    iss: env.LIVEKIT_API_KEY,
    sub: identity,
    name,
    nbf: now - 10,
    exp: now + TOKEN_HOURS * 3600,
    metadata: JSON.stringify({ role: isHost ? "host" : "kid" }),
    video: {
      room,
      roomJoin: true,
      canSubscribe: true,
      canPublishData: true,
      canPublish: true,
      // ==== ده بيت القصيد ====
      canPublishSources: isHost
        ? ["microphone", "screen_share", "screen_share_audio"]
        : ["microphone"],
      roomAdmin: isHost,
    },
  });

  return json({
    ok: true,
    url: env.LIVEKIT_URL,
    token,
    room,
    identity,
    role: isHost ? "host" : "kid",
  });
}
