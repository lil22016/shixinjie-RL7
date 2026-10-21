/* 拾心界 Web Push 唤醒服务 (Cloudflare Worker + Durable Object)
 *
 * 职责只有一个：到点给手机发一条 Web Push，把网站的 Service Worker 叫醒。
 * 消息内容（字卡）由手机上的 sw.js 从本地缓存里随机抽取，服务器不保存任何聊天内容。
 *
 * 接口（全部 POST，body 为 JSON 文本；Content-Type 用 text/plain 也可，便于 sendBeacon）：
 *   /api/register  {id, subscription, intervalSec, nextAt?}   保存订阅并按 nextAt 排期
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
        rec = {
          subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          intervalSec: clampInterval(body.intervalSec),
          activeUntil: 0,
          failures: 0,
        };
        rec.nextAt = Number(body.nextAt) > now ? Number(body.nextAt) : now + rec.intervalSec * 1000;
        await st.put('rec', rec);
        await st.setAlarm(rec.nextAt);
        return json({ ok: true, nextAt: rec.nextAt });
      }
      case '/api/schedule': {
        if (!rec) return json({ ok: false, error: 'not registered' }, 404);
        rec.intervalSec = clampInterval(body.intervalSec || rec.intervalSec);
        rec.activeUntil = 0;
        rec.nextAt = Number(body.nextAt) > now ? Number(body.nextAt) : now + rec.intervalSec * 1000;
        await st.put('rec', rec);
        await st.setAlarm(rec.nextAt);
        return json({ ok: true, nextAt: rec.nextAt });
      }
      case '/api/active': {
        if (!rec) return json({ ok: false, error: 'not registered' }, 404);
        rec.intervalSec = clampInterval(body.intervalSec || rec.intervalSec);
        const forSec = Math.max(60, Math.min(3600, Number(body.activeForSec) || 360));
        rec.activeUntil = now + forSec * 1000;
        // 页面在前台时本地计时器负责发送；若页面意外没报告“切后台”，到期后服务器自动接管
        rec.nextAt = Math.max(rec.activeUntil, Number(body.nextAt) || 0);
        await st.put('rec', rec);
        await st.setAlarm(rec.nextAt);
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
        return json({ ok: true, intervalSec: rec.intervalSec, nextAt: rec.nextAt, activeUntil: rec.activeUntil, failures: rec.failures });
      }
    }
    return json({ ok: false, error: 'not found' }, 404);
  }

  async alarm() {
    const st = this.state.storage;
    const rec = await st.get('rec');
    if (!rec) return;
    const now = Date.now();
    if (rec.nextAt > now + 1000) { await st.setAlarm(rec.nextAt); return; }

    let r;
    try { r = await sendPush(this.env, rec.subscription, { t: 'msg', at: now }); }
    catch (e) { r = { status: 0, text: String(e) }; }

    if (r.status === 404 || r.status === 410) {           // 订阅已失效（卸载/清数据/关闭通知）
      await st.deleteAll();
      return;
    }
    rec.failures = r.status >= 200 && r.status < 300 ? 0 : (rec.failures || 0) + 1;
    if (rec.failures >= 20) { await st.deleteAll(); return; }

    rec.activeUntil = 0;
    rec.nextAt = now + rec.intervalSec * 1000;
    await st.put('rec', rec);
    await st.setAlarm(rec.nextAt);
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
