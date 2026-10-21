// 生成一对 VAPID 密钥：node gen-vapid.mjs
// 公钥填到 js/rl7-v91-web-push.js 和 Worker 的 VAPID_PUBLIC_KEY；私钥只放在 Worker 的 secret 里。
const { webcrypto: crypto } = await import('node:crypto');
const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
console.log('VAPID_PUBLIC_KEY  =', b64u(raw));
console.log('VAPID_PRIVATE_KEY =', jwk.d);
