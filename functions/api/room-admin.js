/**
 * POST /api/room-admin — أدوات تنظيم السيشن (للمدرّس بس)
 *
 * كل طلب هنا بيتأكد من MEETING_HOST_KEY الأول. الطالب مش هيقدر
 * ينادي الـ endpoint ده حتى لو عرف عنوانه، لأن المفتاح على
 * السيرفر ومش بيتبعت للمتصفح أبداً.
 *
 * الأوامر:
 *   list        كشف بالموجودين وحالة الميك بتاعهم
 *   mute        اكتم واحد (بيقدر يفتح تاني)
 *   mute-all    اكتم كل الأطفال مرة واحدة
 *   lock-mic    امنع واحد من فتح الميك خالص
 *   unlock-mic  ارجّعله حق الكلام
 *   remove      اطرده من السيشن
 */

import {
  ROOM_PREFIX,
  json,
  cleanCode,
  missingConfig,
  checkHostKey,
  roomService,
} from "./_lk.js";

/* الأطفال هويتهم بتبدأ بـ kid- والمدرّس host- (اتحددت في meeting.js) */
function isKid(identity) {
  return String(identity || "").startsWith("kid-");
}

async function listParticipants(env, room) {
  const res = await roomService(env, "ListParticipants", { room }, room);
  if (!res.ok) return null;
  return res.data.participants || [];
}

/* بنكتم كل تراكات الصوت بتاعة المشارك — عادةً واحد بس */
async function muteEveryTrack(env, room, p, muted) {
  const tracks = (p.tracks || []).filter(function (t) {
    return t.type === "AUDIO" || t.type === 1;
  });
  for (const t of tracks) {
    await roomService(
      env,
      "MutePublishedTrack",
      { room, identity: p.identity, track_sid: t.sid, muted },
      room
    );
  }
  return tracks.length;
}

export async function onRequestPost(context) {
  const { env } = context;

  if (missingConfig(env)) {
    return json({ ok: false, error: "خدمة السيشن مش متظبطة" }, 503);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: "بيانات غير صالحة" }, 400);
  }

  if (!checkHostKey(env, body.hostKey)) {
    return json({ ok: false, error: "مش مسموح" }, 403);
  }

  const code = cleanCode(body.code);
  if (!code) return json({ ok: false, error: "كود السيشن ناقص" }, 400);

  const room = ROOM_PREFIX + code;
  const action = String(body.action || "");
  const target = String(body.identity || "");

  /* ---------- كشف الموجودين ---------- */
  if (action === "list") {
    const people = await listParticipants(env, room);
    if (people === null) return json({ ok: false, error: "مقدرناش نجيب الكشف" }, 502);

    return json({
      ok: true,
      people: people.map(function (p) {
        const audio = (p.tracks || []).filter(function (t) {
          return t.type === "AUDIO" || t.type === 1;
        });
        return {
          identity: p.identity,
          name: p.name || "",
          isKid: isKid(p.identity),
          // مفيش تراك صوت أصلاً = الميك مقفول
          micOn: audio.length > 0 && audio.some(function (t) { return !t.muted; }),
          canPublish: p.permission ? p.permission.canPublish !== false : true,
        };
      }),
    });
  }

  /* ---------- اكتم الكل ---------- */
  if (action === "mute-all") {
    const people = await listParticipants(env, room);
    if (people === null) return json({ ok: false, error: "مقدرناش نجيب الكشف" }, 502);

    let n = 0;
    for (const p of people) {
      if (!isKid(p.identity)) continue; // المدرّس مبيتكتمش
      n += await muteEveryTrack(env, room, p, true);
    }
    return json({ ok: true, muted: n });
  }

  /* باقي الأوامر لازم يكون معاها شخص محدد */
  if (!target) return json({ ok: false, error: "مفيش حد محدد" }, 400);

  /* حماية: المدرّس ميقدرش يكتم أو يطرد مدرّس (نفسه مثلاً) */
  if (!isKid(target)) {
    return json({ ok: false, error: "مينفعش تعمل كده مع المدرّس" }, 400);
  }

  if (action === "mute" || action === "unmute") {
    const people = await listParticipants(env, room);
    if (people === null) return json({ ok: false, error: "مقدرناش نجيب الكشف" }, 502);

    const p = people.find(function (x) { return x.identity === target; });
    if (!p) return json({ ok: false, error: "الشخص ده خرج من السيشن" }, 404);

    const n = await muteEveryTrack(env, room, p, action === "mute");
    if (!n) return json({ ok: true, note: "الميك مقفول أصلاً" });
    return json({ ok: true });
  }

  if (action === "lock-mic" || action === "unlock-mic") {
    const allow = action === "unlock-mic";
    const res = await roomService(
      env,
      "UpdateParticipant",
      {
        room,
        identity: target,
        permission: {
          can_subscribe: true,
          can_publish: allow,
          can_publish_data: true,
          can_publish_sources: allow ? ["microphone"] : [],
        },
      },
      room
    );
    if (!res.ok) return json({ ok: false, error: "مقدرناش نغيّر الصلاحية" }, 502);
    return json({ ok: true });
  }

  if (action === "remove") {
    const res = await roomService(env, "RemoveParticipant", { room, identity: target }, room);
    if (!res.ok) return json({ ok: false, error: "مقدرناش نطرده" }, 502);
    return json({ ok: true });
  }

  return json({ ok: false, error: "أمر مش معروف" }, 400);
}
