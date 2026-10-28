/* 拾心界 Web Push 唤醒服务 (Cloudflare Worker + Durable Object)
 *
 * 职责只有一个：到点给手机发一条 Web Push，把网站的 Service Worker 叫醒。
 * 消息内容（字卡）由手机上的 sw.js 从本地缓存里随机抽取，服务器不保存任何聊天内容。
 *
 * 接口（全部 POST，body 为 JSON 文本；Content-Type 用 text/plain 也可，便于 sendBeacon）：
 *   /api/register  {id, subscription, minSec, maxSec, dnd?, nextAt?}   保存订阅并按 nextAt 排期（dnd={start,end,tzo}）
 *   /api/schedule  {id, intervalSec, nextAt}                  页面切到后台：交给服务器接管
 *   /api/active    {id, intervalSec, activeForSec}            页面在前台：暂停推送（到期自动恢复）
 *   /api/test      {id}                                        立即推一条测试
 *   /api/unregister {id}                                       删除订阅
 *   GET /api/health
 */

const MIN_INTERVAL = 60;              // 秒
const MAX_INTERVAL = 7 * 24 * 3600;   // 秒

/* ---------------- 小工具 ---------------- */
const enc = new TextEncoder();
function b64uToBytes(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64u(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function concat(...parts) {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hmac(keyBytes, data) {
  const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}
function clampInterval(v) {
  v = Number(v) || 600;
  return Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, Math.round(v)));
}

/* ---------------- VAPID (RFC 8292) ---------------- */
async function vapidHeader(env, endpoint) {
  const pub = b64uToBytes(env.VAPID_PUBLIC_KEY);           // 65 字节 未压缩点
  const jwk = {
    kty: 'EC', crv: 'P-256', ext: true,
    x: bytesToB64u(pub.slice(1, 33)),
    y: bytesToB64u(pub.slice(33, 65)),
    d: env.VAPID_PRIVATE_KEY,
  };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const aud = new URL(endpoint).origin;
  const header = bytesToB64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = bytesToB64u(enc.encode(JSON.stringify({
    aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: env.VAPID_SUBJECT || 'mailto:admin@example.com',
  })));
  const unsigned = header + '.' + claims;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned)));
  return 'vapid t=' + unsigned + '.' + bytesToB64u(sig) + ', k=' + env.VAPID_PUBLIC_KEY;
}

/* ---------------- 负载加密 aes128gcm (RFC 8188 / RFC 8291) ---------------- */
export async function encryptPayload(subscription, plaintext, saltOverride, keyPairOverride) {
  const uaPublic = b64uToBytes(subscription.keys.p256dh);
  const authSecret = b64uToBytes(subscription.keys.auth);

  const asKeys = keyPairOverride || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeys.privateKey, 256));

  const prkKey = await hmac(authSecret, ecdhSecret);
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1]));
  const ikm = await hmac(prkKey, keyInfo);

  const salt = saltOverride || crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);

  const record = concat(typeof plaintext === 'string' ? enc.encode(plaintext) : plaintext, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, record));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

async function sendPush(env, subscription, payloadObj) {
  const body = await encryptPayload(subscription, JSON.stringify(payloadObj));
  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': await vapidHeader(env, subscription.endpoint),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
      'Urgency': 'high',
    },
    body,
  });
  return { status: res.status, text: res.status >= 300 ? (await res.text()).slice(0, 300) : '' };
}


/* ---------------- 发送节奏：随机区间 + 勿扰（与网页 chat-auto.js 规则一致） ----------------
 * rec.minSec / rec.maxSec：间隔区间（相等即固定）
 * rec.dnd = { start, end, tzo }：分钟数（0~1439），tzo = 浏览器 getTimezoneOffset()
 */
function readPace(body, rec) {
  const min = clampInterval(body.minSec || body.intervalSec || (rec && rec.minSec) || (rec && rec.intervalSec));
  let max = clampInterval(body.maxSec || min);
  if (max < min) max = min;
  let dnd = null;
  const d = body.dnd;
  if (d && Number.isFinite(+d.start) && Number.isFinite(+d.end) && +d.start !== +d.end) {
    dnd = { start: ((+d.start % 1440) + 1440) % 1440, end: ((+d.end % 1440) + 1440) % 1440, tzo: Number.isFinite(+d.tzo) ? +d.tzo : 0 };
  }
  return { minSec: min, maxSec: max, intervalSec: min, dnd };
}
function inDnd(ts, d) {
  if (!d) return false;
  const local = new Date(ts - d.tzo * 60000);
  const m = local.getUTCHours() * 60 + local.getUTCMinutes();
  return d.start < d.end ? (m >= d.start && m < d.end) : (m >= d.start || m < d.end);
}
function dndEndAfter(ts, d) {
  const local = new Date(ts - d.tzo * 60000);
  local.setUTCHours(Math.floor(d.end / 60), d.end % 60, 0, 0);
  let t = local.getTime() + d.tzo * 60000;
  if (t <= ts) t += 86400000;
  return t;
}
function nextTime(from, rec) {
  const min = rec.minSec || rec.intervalSec || 600, max = Math.max(min, rec.maxSec || min);
  let t = from + Math.round((min + Math.random() * (max - min)) * 1000);
  if (rec.dnd && inDnd(t, rec.dnd)) t = dndEndAfter(t, rec.dnd) + Math.round(Math.random() * Math.min(min, 1800) * 1000);
  return t;
}
export const _pace = { readPace, inDnd, dndEndAfter, nextTime };


/* ---------------- 等待中的回复（V98） ----------------
 * rec.replies = [{ id, at, chatId }]：用户发了消息、页面切到后台时交过来的「几点该回复」。
 * rec.proactive = false 时只管回复，不发主动消息。
 */
const FAR = 8640000000000000;
function readReplies(body, rec) {
  if (!Array.isArray(body.replies)) return (rec && rec.replies) || [];
  const now = Date.now();
  return body.replies
    .filter(r => r && /^[\w-]{1,64}$/.test(String(r.id)) && Number(r.at) > now - 7 * 86400000)
    .slice(0, 30)
    .map(r => ({ id: String(r.id), at: Math.max(Number(r.at), now + 2000), chatId: String(r.chatId || '').slice(0, 64) }));
}
function readProactive(body, rec) {
  if (typeof body.proactive === 'boolean') return body.proactive;
  return rec && typeof rec.proactive === 'boolean' ? rec.proactive : true;
}
function wakeAt(rec) {
  let t = rec.proactive === false ? FAR : (rec.nextAt || FAR);
  for (const r of rec.replies || []) t = Math.min(t, r.at);
  return t;
}
async function arm(st, rec) {
  const t = wakeAt(rec);
  if (t >= FAR) await st.deleteAlarm(); else await st.setAlarm(t);
}

/* ---------------- Durable Object：每个设备一个，用 alarm 精确排期 ---------------- */
export class PushClient {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const now = Date.now();
    const st = this.state.storage;
    let rec = (await st.get('rec')) || null;

    switch (url.pathname) {
      case '/api/register': {
        const sub = body.subscription;
        if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return json({ ok: false, error: 'bad subscription' }, 400);
        if (!/^https:\/\//.test(sub.endpoint)) return json({ ok: false, error: 'bad endpoint' }, 400);
        rec = Object.assign({
          subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          activeUntil: 0,
          failures: 0,
        }, readPace(body, null));
        rec.proactive = readProactive(body, null);
        rec.replies = readReplies(body, null);
        rec.nextAt = Number(body.nextAt) > now ? Number(body.nextAt) : nextTime(now, rec);
        await st.put('rec', rec);
        await arm(st, rec);
        return json({ ok: true, nextAt: rec.nextAt, replies: rec.replies.length });
      }
      case '/api/schedule': {
        if (!rec) return json({ ok: false, error: 'not registered' }, 404);
        Object.assign(rec, readPace(body, rec));
        rec.proactive = readProactive(body, rec);
        rec.replies = readReplies(body, rec);
        rec.activeUntil = 0;
        rec.nextAt = Number(body.nextAt) > now ? Number(body.nextAt) : nextTime(now, rec);
        await st.put('rec', rec);
        await arm(st, rec);
        return json({ ok: true, nextAt: rec.nextAt, replies: rec.replies.length });
      }
      case '/api/active': {
        if (!rec) return json({ ok: false, error: 'not registered' }, 404);
        Object.assign(rec, readPace(body, rec));
        const forSec = Math.max(60, Math.min(3600, Number(body.activeForSec) || 360));
        rec.activeUntil = now + forSec * 1000;
        // 页面在前台时本地计时器负责发送；若页面意外没报告“切后台”，到期后服务器自动接管
        rec.nextAt = Math.max(rec.activeUntil, Number(body.nextAt) || 0);
        rec.proactive = readProactive(body, rec);
        rec.replies = [];                                     // 页面在前台：回复由页面自己处理
        await st.put('rec', rec);
        await arm(st, rec);
        return json({ ok: true, nextAt: rec.nextAt });
      }
      case '/api/test': {
        if (!rec) return json({ ok: false, error: 'not registered' }, 404);
        const r = await sendPush(this.env, rec.subscription, { t: 'msg', test: true, at: now });
        return json({ ok: r.status < 300, status: r.status, detail: r.text });
      }
      case '/api/unregister': {
        await st.deleteAlarm();
        await st.deleteAll();
        return json({ ok: true });
      }
      case '/api/status': {
        if (!rec) return json({ ok: false, error: 'not registered' }, 404);
        return json({ ok: true, proactive: rec.proactive !== false, replies: rec.replies || [], minSec: rec.minSec, maxSec: rec.maxSec, dnd: rec.dnd, nextAt: rec.nextAt, activeUntil: rec.activeUntil, failures: rec.failures });
      }
    }
    return json({ ok: false, error: 'not found' }, 404);
  }

  async alarm() {
    const st = this.state.storage;
    const rec = await st.get('rec');
    if (!rec) return;
    const now = Date.now();
    const gone = r => r && (r.status === 404 || r.status === 410);   // 订阅已失效（卸载/清数据/关闭通知）
    const push = async payload => {
      try { return await sendPush(this.env, rec.subscription, payload); }
      catch (e) { return { status: 0, text: String(e) }; }
    };

    /* ① 到点的回复（用户主动发的消息，不受勿扰限制） */
    const due = (rec.replies || []).filter(r => r.at <= now + 1000);
    rec.replies = (rec.replies || []).filter(r => r.at > now + 1000);
    for (const r of due) {
      const res = await push({ t: 'reply', pid: r.id, chatId: r.chatId, at: now });
      if (gone(res)) { await st.deleteAll(); return; }
    }

    /* ② 主动消息 */
    if (rec.proactive !== false && rec.nextAt <= now + 1000) {
      if (inDnd(now, rec.dnd)) {                            // 勿扰中：不推，顺延
        rec.nextAt = nextTime(now, rec);
      } else {
        const res = await push({ t: 'msg', at: now });
        if (gone(res)) { await st.deleteAll(); return; }
        rec.failures = res.status >= 200 && res.status < 300 ? 0 : (rec.failures || 0) + 1;
        if (rec.failures >= 20) { await st.deleteAll(); return; }
        rec.nextAt = nextTime(now, rec);
      }
      rec.activeUntil = 0;
    }
    await st.put('rec', rec);
    await arm(st, rec);
  }
}

/* ---------------- 入口 ---------------- */
function json(obj, status = 200, cors = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const originOk = !allowed.length || allowed.includes(origin);
    const CORS = originOk && origin ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    } : {};

    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: originOk ? 204 : 403, headers: CORS });
    if (url.pathname === '/api/health') return json({ ok: true, vapid: !!env.VAPID_PUBLIC_KEY && !!env.VAPID_PRIVATE_KEY, publicKey: env.VAPID_PUBLIC_KEY || null }, 200, CORS);
    if (!originOk) return json({ ok: false, error: 'origin not allowed' }, 403, CORS);
    if (request.method !== 'POST' || !url.pathname.startsWith('/api/')) return json({ ok: false, error: 'not found' }, 404, CORS);

    const text = await request.text();
    let body;
    try { body = JSON.parse(text || '{}'); } catch (e) { return json({ ok: false, error: 'bad json' }, 400, CORS); }
    const id = String(body.id || '');
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(id)) return json({ ok: false, error: 'bad id' }, 400, CORS);

    const stub = env.PUSH_CLIENT.get(env.PUSH_CLIENT.idFromName(id));
    const res = await stub.fetch(new Request('https://do' + url.pathname, { method: 'POST', body: JSON.stringify(body) }));
    return new Response(res.body, { status: res.status, headers: { 'Content-Type': 'application/json', ...CORS } });
  },
};
