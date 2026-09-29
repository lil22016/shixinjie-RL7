import QRCode from 'qrcode';
import http from 'node:http';
import crypto from 'node:crypto';

const upstream = process.env.NCM_API_URL || 'http://127.0.0.1:3000';
const allowedOrigin = process.env.SITE_ORIGIN || 'https://lil22016.github.io';
const sessions = new Map();
const port = Number(process.env.PORT || 8080);
const fail = (res, status, error) => send(res, status, { error });
function send(res, status, data) { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); }
function param(url, key) { return url.searchParams.get(key) || ''; }
function session(req) { const token=(req.headers.authorization||'').replace(/^Bearer /,''); return sessions.get(token); }
async function ncm(path, query={}, includeCookies=false) {
  const u = new URL(path, upstream);
  Object.entries(query).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  u.searchParams.set('timestamp',Date.now().toString());
  const r = await fetch(u, {signal: AbortSignal.timeout(16000)});
  if (!r.ok) throw new Error(`音乐接口 HTTP ${r.status}`);
  const body=await r.json();
  return includeCookies ? {body,cookies:r.headers.getSetCookie()} : body;
}
const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  if(origin && origin!==allowedOrigin) return fail(res,403,'不允许此来源');
  res.setHeader('Access-Control-Allow-Origin',allowedOrigin);
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
  res.setHeader('Vary','Origin');
  if(req.method==='OPTIONS') {res.writeHead(204);return res.end();}
  if(req.method!=='GET') return fail(res,405,'只支持 GET');
  const url=new URL(req.url,'http://localhost');
  try {
    if(url.pathname==='/health') return send(res,200,{ok:true});
    if(url.pathname==='/qr/start') {
      const keyResult=await ncm('/login/qr/key');
      const key=keyResult.data?.unikey || keyResult.unikey;
      if(!key) throw new Error('未能生成登录 key');
      const qr=await ncm('/login/qr/create',{key,qrimg:'true'});
      const qrimg=(qr.data?.qrimg || qr.qrimg) || (qr.data?.qrurl ? await QRCode.toDataURL(qr.data.qrurl) : '');
      if(!qrimg) throw new Error('未能生成二维码');
      const token=crypto.randomBytes(32).toString('hex');
      sessions.set(token,{key,created:Date.now()});
      return send(res,200,{token,qrimg});
    }
    const s=session(req);
    if(!s) return fail(res,401,'登录会话不存在，请重新扫码');
    if(url.pathname==='/logout') {sessions.delete((req.headers.authorization||'').replace(/^Bearer /,''));return send(res,200,{ok:true});}
    if(url.pathname==='/qr/check') {
      if(!s.key) return fail(res,400,'请生成新的二维码');
      const result=await ncm('/login/qr/check',{key:s.key},true);
      const d=result.body;
      if(d.code===803) {
        const cookie=result.cookies.length ? result.cookies.map(c=>c.split(';')[0]).join('; ') : (d.cookie || d.data?.cookie);
        if(!cookie) throw new Error('扫码已确认，但音乐接口未返回登录凭证');
        s.cookie=Array.isArray(cookie)?cookie.join('; '):cookie;
        const me=await ncm('/user/account',{cookie:s.cookie});
        s.uid=me.profile?.userId || me.account?.id;
        s.nickname=me.profile?.nickname || '';
        if(!s.uid) throw new Error('已扫码，但未能取得用户资料');
        delete s.key;
        return send(res,200,{code:803,nickname:s.nickname});
      }
      return send(res,200,{code:d.code});
    }
    if(!s.cookie) return fail(res,401,'请先扫码登录');
    if(url.pathname==='/me') return send(res,200,{nickname:s.nickname,uid:s.uid});
    if(url.pathname==='/playlists') {
      const d=await ncm('/user/playlist',{uid:s.uid,limit:1000,cookie:s.cookie});
      return send(res,200,{playlist:d.playlist||[]});
    }
    if(url.pathname==='/playlist') {
      const id=param(url,'id'); if(!/^\d+$/.test(id)) return fail(res,400,'歌单 ID 无效');
      const d=await ncm('/playlist/track/all',{id,limit:1000,cookie:s.cookie});
      const tracks=d.songs||[];
      return send(res,200,{songs:tracks.map(t=>({id:t.id,name:t.name,artist:(t.ar||t.artists||[]).map(a=>a.name).join(' / '),cover:t.al?.picUrl||'',duration:t.dt||0}))});
    }
    if(url.pathname==='/song/url') {
      const id=param(url,'id'); if(!/^\d+$/.test(id)) return fail(res,400,'歌曲 ID 无效');
      const d=await ncm('/song/url/v1',{id,level:'standard',cookie:s.cookie});
      const media=d.data?.[0]?.url;
      return send(res,200,{url:media?.startsWith('https://')?media:null});
    }
    return fail(res,404,'接口不存在');
  } catch(e) {return fail(res,502,e.message||'音乐服务暂不可用');}
});
server.listen(port,'0.0.0.0',()=>console.log(`music auth listening on ${port}`));
