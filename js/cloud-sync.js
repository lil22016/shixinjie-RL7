/* RL7 Live Cloud Sync v3 — safe live sync after explicit bootstrap */
(function(){
'use strict';
const C={url:'https://tncilkhksteqocbnqcrt.supabase.co',key:'sb_publishable_fj5yqUMg3BLws3HoMY9MiQ_TcGXjHsS',table:'user_sync'};
const A='__rl7_cloud_auth_v1', DEV='__rl7_cloud_device_v3', READY='__rl7_cloud_ready_v3';
let busy=false,timer=null,lastSig='',applying=false;
const j=(s,f)=>{try{return JSON.parse(s)}catch(_){return f}};
const auth=()=>j(localStorage.getItem(A),null);
function saveAuth(v){if(v&&v.expires_in&&!v.expires_at)v.expires_at=Math.floor(Date.now()/1000)+Number(v.expires_in);localStorage.setItem(A,JSON.stringify(v))}
const uid=()=>auth()?.user?.id;
function device(){let d=localStorage.getItem(DEV);if(!d){d=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random());localStorage.setItem(DEV,d)}return d}
function excluded(k){return !k||k===A||k===DEV||k===READY||k.startsWith('__rl7_cloud_')||k.startsWith('sb-')||k.toLowerCase().includes('supabase')}
async function api(path,opt={}){let a=auth(),h=Object.assign({'apikey':C.key,'Content-Type':'application/json'},opt.headers||{});if(a?.access_token)h.Authorization='Bearer '+a.access_token;let r=await fetch(C.url+path,Object.assign({},opt,{headers:h})),t=await r.text(),d=t?j(t,t):null;if(!r.ok)throw Error((d&&(d.msg||d.message||d.error_description||d.error))||('HTTP '+r.status));return d}
async function signin(email,password){let d=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});saveAuth(d);return d}
async function ensure(){let a=auth();if(!a)return false;if(a.expires_at&&a.expires_at*1000<Date.now()+60000&&a.refresh_token){try{let d=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:a.refresh_token})});saveAuth(d)}catch(_){return false}}return !!uid()}
function idbAll(db,store){return new Promise((res,rej)=>{let q=indexedDB.open(db);q.onerror=()=>rej(q.error);q.onsuccess=()=>{let d=q.result;if(!d.objectStoreNames.contains(store)){d.close();return res([])}let tx=d.transaction(store,'readonly'),r=tx.objectStore(store).getAll();r.onsuccess=()=>{d.close();res(r.result||[])};r.onerror=()=>{d.close();rej(r.error)}}})}
function idbPut(db,store,row){return new Promise((res,rej)=>{let q=indexedDB.open(db);q.onerror=()=>rej(q.error);q.onsuccess=()=>{let d=q.result;if(!d.objectStoreNames.contains(store)){d.close();return res()}let tx=d.transaction(store,'readwrite');tx.objectStore(store).put(row);tx.oncomplete=()=>{d.close();res()};tx.onerror=()=>{d.close();rej(tx.error)}}})}
async function collect(){
 let out={};
 for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i);if(!excluded(k))out['ls:'+k]={value:localStorage.getItem(k)}}
 for(let r of await idbAll('mirror_app_kv_db','kv'))if(r?.key)out['kv:'+r.key]=r;
 for(let r of await idbAll('mirror_message_db','messages'))if(r?.chatId)out['msg:'+r.chatId]=r;
 for(let r of await idbAll('MirrorStickers','stickers'))if(r?.id!=null)out['sticker:'+r.id]=r;
 for(let r of await idbAll('MirrorStickers','stickerCategories'))if(r?.id!=null)out['stickerCat:'+r.id]=r;
 return out
}
function stable(x){return JSON.stringify(x,Object.keys(x||{}).sort())}
async function cloud(){return await api('/rest/v1/'+C.table+'?user_id=eq.'+encodeURIComponent(uid())+'&data_key=not.like.backup:%25&select=data_key,data,updated_at')}
async function upsert(items){
 if(!items.length)return;
 for(let i=0;i<items.length;i+=30){
   let body=items.slice(i,i+30).map(x=>({user_id:uid(),data_key:x.k,data:x.data,updated_at:x.at}));
   await api('/rest/v1/'+C.table+'?on_conflict=user_id,data_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)})
 }
}
async function applyRow(r){
 let k=r.data_key,d=r.data;
 if(k.startsWith('ls:')){let n=k.slice(3);if(!excluded(n)&&d&&d.value!=null&&localStorage.getItem(n)!==String(d.value))localStorage.setItem(n,String(d.value))}
 else if(k.startsWith('kv:'))await idbPut('mirror_app_kv_db','kv',d);
 else if(k.startsWith('msg:'))await idbPut('mirror_message_db','messages',d);
 else if(k.startsWith('sticker:'))await idbPut('MirrorStickers','stickers',d);
 else if(k.startsWith('stickerCat:'))await idbPut('MirrorStickers','stickerCategories',d)
}
async function liveSync(){
 if(busy||applying||!localStorage.getItem(READY))return;
 if(!await ensure())return;
 busy=true;
 try{
   let loc=await collect(), cr=await cloud(), cm={};cr.forEach(r=>cm[r.data_key]=r);
   // Never let empty/default local values erase a non-empty cloud value.
   let pushes=[];
   for(let [k,d] of Object.entries(loc)){
     let r=cm[k], ls=JSON.stringify(d), cs=r?JSON.stringify(r.data):null;
     if(ls===cs)continue;
     let empty=(d==null)||(Array.isArray(d)&&!d.length)||(typeof d==='object'&&d&&!Array.isArray(d)&&Object.keys(d).length===0)||
       (d&&typeof d.value==='string'&&(d.value==='[]'||d.value==='{}'||d.value===''||d.value==='null'));
     if(r&&empty){applying=true;await applyRow(r);applying=false}
     else pushes.push({k,data:d,at:new Date().toISOString()})
   }
   // Pull cloud keys missing locally. No deletions/tombstones in live mode.
   for(let r of cr)if(!(r.data_key in loc)){applying=true;await applyRow(r);applying=false}
   await upsert(pushes);
   state('ok')
 }catch(e){console.error('RL7 live sync',e);state('error')}
 finally{busy=false}
}
function schedule(ms=700){clearTimeout(timer);timer=setTimeout(liveSync,ms)}
function enable(){localStorage.setItem(READY,'1');schedule(50);toast('Live sync enabled')}
function disable(){localStorage.removeItem(READY);toast('Live sync paused')}
function toast(s){let x=document.createElement('div');x.className='rl7-cloud-toast';x.textContent=s;document.body.appendChild(x);setTimeout(()=>x.remove(),2600)}
function state(s){let b=document.getElementById('rl7-cloud-btn');if(b)b.dataset.state=s}
function modal(){
 document.getElementById('rl7-cloud-modal')?.remove();let d=document.createElement('div');d.id='rl7-cloud-modal';d.className='rl7-cloud-overlay';
 let signed=!!uid(),on=!!localStorage.getItem(READY);
 d.innerHTML='<div class="rl7-cloud-card"><button class="rl7-cloud-x">×</button><div class="rl7-cloud-title">Cloud Sync</div>'+
 (signed?'<div class="rl7-cloud-sub">'+(on?'Live sync is ON':'Live sync is paused')+'</div><button id="rl7-toggle" class="rl7-cloud-primary">'+(on?'Pause live sync':'Enable live sync')+'</button><button id="rl7-now" class="rl7-cloud-secondary">Sync now</button>':
 '<div class="rl7-cloud-sub">Sign in with the same account on PWA and Bluefy.</div><input id="rl7-email" type="email" placeholder="Email"><input id="rl7-pass" type="password" placeholder="Password"><button id="rl7-signin" class="rl7-cloud-primary">Sign in</button>')+
 '<div class="rl7-cloud-note">Changes sync within about 1 second while the page is active, plus every 5 seconds as a safety check. Empty/default data cannot overwrite existing non-empty cloud data. Live sync does not propagate deletions.</div></div>';
 document.body.appendChild(d);d.querySelector('.rl7-cloud-x').onclick=()=>d.remove();
 if(signed){d.querySelector('#rl7-toggle').onclick=()=>{on?disable():enable();d.remove()};d.querySelector('#rl7-now').onclick=()=>{schedule(0);d.remove()}}
 else d.querySelector('#rl7-signin').onclick=async()=>{try{await signin(d.querySelector('#rl7-email').value.trim(),d.querySelector('#rl7-pass').value);d.remove();modal()}catch(e){toast(e.message)}}
}
function boot(){
 if(!document.getElementById('rl7-cloud-css')){let l=document.createElement('link');l.id='rl7-cloud-css';l.rel='stylesheet';l.href='css/cloud-sync.css?v=20260917live3';document.head.appendChild(l)}
 if(!document.getElementById('rl7-cloud-btn')){let b=document.createElement('button');b.id='rl7-cloud-btn';b.className='rl7-cloud-btn';b.textContent='☁';b.onclick=modal;document.body.appendChild(b)}
 // Watch localStorage writes.
 try{let sp=Storage.prototype,ss=sp.setItem,sr=sp.removeItem;sp.setItem=function(k,v){let z=ss.apply(this,arguments);if(!applying&&!excluded(String(k)))schedule();return z};sp.removeItem=function(k){let z=sr.apply(this,arguments);if(!applying&&!excluded(String(k)))schedule();return z}}catch(_){}
 // IDB/message changes are caught by frequent snapshot comparison.
 setInterval(()=>{if(document.visibilityState==='visible')schedule(0)},5000);
 addEventListener('online',()=>schedule(100));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(100)});
 if(localStorage.getItem(READY))schedule(300);state(uid()?'ok':'off')
}
window.RL7CloudSync={syncNow:liveSync,enable,disable,signIn:signin};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();