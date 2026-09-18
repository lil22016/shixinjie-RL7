/* RL7 Live Cloud Sync v5 — additive merge, never whole-list replace */
(function(){'use strict';
const C={url:'https://tncilkhksteqocbnqcrt.supabase.co',key:'sb_publishable_fj5yqUMg3BLws3HoMY9MiQ_TcGXjHsS',table:'user_sync'};
const A='__rl7_cloud_auth_v1',READY='__rl7_cloud_ready_v3';let busy=false,applying=false;
const J=(s,f)=>{try{return JSON.parse(s)}catch(e){return f}},auth=()=>J(localStorage.getItem(A),null),uid=()=>auth()?.user?.id;
function excluded(k){return !k||k===A||k===READY||k.startsWith('__rl7_cloud_')||k.startsWith('sb-')||k.toLowerCase().includes('supabase')}
async function api(path,opt={}){let a=auth(),h=Object.assign({apikey:C.key,'Content-Type':'application/json'},opt.headers||{});if(a?.access_token)h.Authorization='Bearer '+a.access_token;let r=await fetch(C.url+path,Object.assign({},opt,{headers:h})),t=await r.text(),d=t?J(t,t):null;if(!r.ok)throw Error((d&&(d.msg||d.message||d.error_description||d.error))||('HTTP '+r.status));return d}
async function ensure(){let a=auth();if(!a)return false;if(a.expires_at&&a.expires_at*1000<Date.now()+60000&&a.refresh_token){try{let d=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:a.refresh_token})});if(d.expires_in&&!d.expires_at)d.expires_at=Math.floor(Date.now()/1000)+Number(d.expires_in);localStorage.setItem(A,JSON.stringify(d))}catch(e){return false}}return !!uid()}
function all(db,st){return new Promise((res,rej)=>{let q=indexedDB.open(db);q.onerror=()=>rej(q.error);q.onsuccess=()=>{let d=q.result;if(!d.objectStoreNames.contains(st)){d.close();return res([])}let tx=d.transaction(st,'readonly'),r=tx.objectStore(st).getAll();r.onsuccess=()=>{d.close();res(r.result||[])};r.onerror=()=>rej(r.error)}})}
function put(db,st,row){return new Promise((res,rej)=>{let q=indexedDB.open(db);q.onerror=()=>rej(q.error);q.onsuccess=()=>{let d=q.result;if(!d.objectStoreNames.contains(st)){d.close();return res()}let tx=d.transaction(st,'readwrite');tx.objectStore(st).put(row);tx.oncomplete=()=>{d.close();res()};tx.onerror=()=>rej(tx.error)}})}
async function collect(){let o={};for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i);if(!excluded(k))o['ls:'+k]={value:localStorage.getItem(k)}};for(let r of await all('mirror_app_kv_db','kv'))if(r?.key)o['kv:'+r.key]=r;for(let r of await all('mirror_message_db','messages'))if(r?.chatId)o['msg:'+r.chatId]=r;for(let r of await all('MirrorStickers','stickers'))if(r?.id!=null)o['sticker:'+r.id]=r;for(let r of await all('MirrorStickers','stickerCategories'))if(r?.id!=null)o['stickerCat:'+r.id]=r;return o}
function time(x){if(!x||typeof x!=='object')return 0;for(let k of ['updatedAt','updated_at','time','timestamp','createdAt','created_at','date']){let v=x[k];if(v!=null){let n=typeof v==='number'?v:Date.parse(v);if(Number.isFinite(n))return n}}return 0}
function ident(x){if(x&&typeof x==='object'){for(let k of ['id','messageId','msgId','momentId','commentId','uuid','key'])if(x[k]!=null)return k+':'+String(x[k])}return 'json:'+JSON.stringify(x)}
function mergeArray(a,b){let m=new Map();for(let x of [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])]){let k=ident(x),old=m.get(k);if(!old)m.set(k,x);else if(x&&old&&typeof x==='object'&&typeof old==='object')m.set(k,mergeObj(old,x));else m.set(k,x)}let out=[...m.values()];if(out.every(x=>time(x)))out.sort((x,y)=>time(x)-time(y));return out}
function mergeObj(a,b){if(!a||typeof a!=='object'||Array.isArray(a)||!b||typeof b!=='object'||Array.isArray(b))return b??a;let o=Object.assign({},a);for(let [k,v] of Object.entries(b)){if(Array.isArray(v)&&Array.isArray(o[k]))o[k]=mergeArray(o[k],v);else if(v&&o[k]&&typeof v==='object'&&typeof o[k]==='object'&&!Array.isArray(v)&&!Array.isArray(o[k]))o[k]=mergeObj(o[k],v);else if(o[k]===undefined)o[k]=v;else if(time(b)>=time(a)&&time(b)>0)o[k]=v}return o}
function mergeValue(a,b){if(Array.isArray(a)||Array.isArray(b))return mergeArray(a,b);if(a&&b&&typeof a==='object'&&typeof b==='object')return mergeObj(a,b);return b??a}
function mergeWrapped(local,cloud,key){
 if(!local)return cloud;if(!cloud)return local;
 if(key.startsWith('ls:')&&'value'in local&&'value'in cloud){let la=J(local.value,undefined),cb=J(cloud.value,undefined);if(la!==undefined&&cb!==undefined&&(typeof la==='object'||typeof cb==='object'))return{value:JSON.stringify(mergeValue(la,cb))};return local}
 if(key.startsWith('msg:')){let o=mergeObj(cloud,local);if(Array.isArray(local.messages)||Array.isArray(cloud.messages))o.messages=mergeArray(cloud.messages,local.messages);return o}
 if(key.startsWith('kv:')){let o=mergeObj(cloud,local);if('value'in local&&'value'in cloud)o.value=mergeValue(cloud.value,local.value);return o}
 return mergeValue(cloud,local)
}
async function rows(){return api('/rest/v1/'+C.table+'?user_id=eq.'+encodeURIComponent(uid())+'&data_key=not.like.backup:%25&select=data_key,data,updated_at')}
async function push(items){for(let i=0;i<items.length;i+=25){let body=items.slice(i,i+25).map(x=>({user_id:uid(),data_key:x.k,data:x.d,updated_at:new Date().toISOString()}));await api('/rest/v1/'+C.table+'?on_conflict=user_id,data_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)})}}
async function apply(k,d){if(k.startsWith('ls:')){let n=k.slice(3);if(!excluded(n)&&d?.value!=null)localStorage.setItem(n,String(d.value))}else if(k.startsWith('kv:'))await put('mirror_app_kv_db','kv',d);else if(k.startsWith('msg:'))await put('mirror_message_db','messages',d);else if(k.startsWith('sticker:'))await put('MirrorStickers','stickers',d);else if(k.startsWith('stickerCat:'))await put('MirrorStickers','stickerCategories',d)}
function state(s){let e=document.getElementById('rl7-cloud-settings-state');if(e)e.textContent=s==='ok'?'已同步 · 合并模式':s==='error'?'同步失败':localStorage.getItem(READY)?'同步开启':'同步暂停'}
async function sync(){if(busy||applying||!localStorage.getItem(READY)||!await ensure())return;busy=true;try{
 let loc=await collect(),rr=await rows(),cm={};rr.forEach(r=>cm[r.data_key]=r.data);let keys=new Set([...Object.keys(loc),...Object.keys(cm)]),out=[];
 applying=true;
 for(let k of keys){let merged=mergeWrapped(loc[k],cm[k],k);if(merged===undefined)continue;await apply(k,merged);if(JSON.stringify(merged)!==JSON.stringify(cm[k]))out.push({k,d:merged})}
 applying=false;if(out.length)await push(out);state('ok')
 }catch(e){applying=false;console.error('[RL7 cloud merge v5]',e);state('error')}finally{busy=false}}
function enable(){localStorage.setItem(READY,'1');sync()}function disable(){localStorage.removeItem(READY);state('off')}
function inject(){let row=document.getElementById('rl7-cloud-settings-entry');if(!row)return;let on=!!localStorage.getItem(READY),v=row.querySelector('#rl7-cloud-settings-state');if(v)v.textContent=on?'同步开启 · 合并模式':'同步暂停 · 点击开启'}
function boot(){setInterval(()=>{inject();if(document.visibilityState==='visible')sync()},2000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});if(localStorage.getItem(READY))setTimeout(sync,500)}
window.RL7CloudSync={syncNow:sync,enable,disable};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();