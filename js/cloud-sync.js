/* 拾心界 Cloud Transfer v2 — explicit, one-way bootstrap only */
(function () {
'use strict';

var CFG={
  url:'https://tncilkhksteqocbnqcrt.supabase.co',
  key:'sb_publishable_fj5yqUMg3BLws3HoMY9MiQ_TcGXjHsS',
  table:'user_sync'
};
var AUTH_KEY='__rl7_cloud_auth_v1';
var BUSY=false;

function parse(s,f){try{return JSON.parse(s)}catch(_){return f}}
function auth(){return parse(localStorage.getItem(AUTH_KEY),null)}
function saveAuth(v){
  if(v&&v.expires_in&&!v.expires_at)v.expires_at=Math.floor(Date.now()/1000)+Number(v.expires_in);
  localStorage.setItem(AUTH_KEY,JSON.stringify(v));
}
function clearAuth(){localStorage.removeItem(AUTH_KEY)}
function uid(){var a=auth();return a&&a.user&&a.user.id}
function excluded(k){
  return !k || k===AUTH_KEY || k.indexOf('__rl7_cloud_')===0 ||
    k.indexOf('sb-')===0 || k.toLowerCase().indexOf('supabase')>=0;
}
async function api(path,opt){
  opt=opt||{}; var a=auth();
  var h=Object.assign({'apikey':CFG.key,'Content-Type':'application/json'},opt.headers||{});
  if(a&&a.access_token)h.Authorization='Bearer '+a.access_token;
  var r=await fetch(CFG.url+path,Object.assign({},opt,{headers:h}));
  var txt=await r.text(), data=txt?parse(txt,txt):null;
  if(!r.ok)throw new Error((data&&(data.msg||data.message||data.error_description||data.error))||('HTTP '+r.status));
  return data;
}
async function signIn(email,password){
  var d=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:email,password:password})});
  saveAuth(d); return d;
}
async function refresh(){
  var a=auth(); if(!a||!a.refresh_token)return false;
  try{
    var d=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:a.refresh_token})});
    saveAuth(d); return true;
  }catch(e){return false}
}
async function ensureAuth(){
  var a=auth(); if(!a)return false;
  if(a.expires_at && a.expires_at*1000<Date.now()+60000)return await refresh();
  return !!uid();
}
function idbAll(dbName,storeName){
  return new Promise(function(resolve,reject){
    var q=indexedDB.open(dbName);
    q.onerror=function(){reject(q.error||new Error('Cannot open '+dbName))};
    q.onsuccess=function(){
      var db=q.result;
      if(!db.objectStoreNames.contains(storeName)){db.close();return resolve([])}
      var tx=db.transaction(storeName,'readonly'), req=tx.objectStore(storeName).getAll();
      req.onsuccess=function(){db.close();resolve(req.result||[])};
      req.onerror=function(){db.close();reject(req.error)}
    };
  });
}
function idbReplace(dbName,storeName,rows){
  return new Promise(function(resolve,reject){
    var q=indexedDB.open(dbName);
    q.onerror=function(){reject(q.error||new Error('Cannot open '+dbName))};
    q.onsuccess=function(){
      var db=q.result;
      if(!db.objectStoreNames.contains(storeName)){db.close();return resolve()}
      var tx=db.transaction(storeName,'readwrite'), s=tx.objectStore(storeName);
      s.clear();
      (rows||[]).forEach(function(x){s.put(x)});
      tx.oncomplete=function(){db.close();resolve()};
      tx.onerror=function(){db.close();reject(tx.error)}
    };
  });
}
async function collectExact(){
  var rows=[], stamp=Date.now();
  for(var i=0;i<localStorage.length;i++){
    var k=localStorage.key(i); if(excluded(k))continue;
    rows.push({data_key:'ls:'+k,data:{value:localStorage.getItem(k)},updated_at:new Date(stamp).toISOString()});
  }
  var kv=await idbAll('mirror_app_kv_db','kv');
  kv.forEach(function(r){if(r&&r.key)rows.push({data_key:'kv:'+r.key,data:r,updated_at:new Date(stamp).toISOString()})});
  var msg=await idbAll('mirror_message_db','messages');
  msg.forEach(function(r){if(r&&r.chatId)rows.push({data_key:'msg:'+r.chatId,data:r,updated_at:new Date(stamp).toISOString()})});
  var st=await idbAll('MirrorStickers','stickers');
  st.forEach(function(r){if(r&&r.id!=null)rows.push({data_key:'sticker:'+r.id,data:r,updated_at:new Date(stamp).toISOString()})});
  var cat=await idbAll('MirrorStickers','stickerCategories');
  cat.forEach(function(r){if(r&&r.id!=null)rows.push({data_key:'stickerCat:'+r.id,data:r,updated_at:new Date(stamp).toISOString()})});
  return rows;
}
async function cloudRows(){
  var u=uid(); if(!u)throw new Error('Not signed in');
  return await api('/rest/v1/'+CFG.table+'?user_id=eq.'+encodeURIComponent(u)+'&data_key=not.like.backup:%25&select=data_key,data,updated_at');
}
async function deleteCloudWorkingSet(){
  var u=uid();
  await api('/rest/v1/'+CFG.table+'?user_id=eq.'+encodeURIComponent(u)+'&data_key=not.like.backup:%25',{
    method:'DELETE',headers:{'Prefer':'return=minimal'}
  });
}
async function upsertChunk(rows){
  var u=uid();
  var body=rows.map(function(r){return {user_id:u,data_key:r.data_key,data:r.data,updated_at:r.updated_at}});
  await api('/rest/v1/'+CFG.table+'?on_conflict=user_id,data_key',{
    method:'POST',
    headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify(body)
  });
}
async function seedCloud(){
  if(BUSY)return; BUSY=true; setState('syncing');
  try{
    if(!await ensureAuth())throw new Error('Please sign in again');
    var rows=await collectExact();
    if(!rows.length)throw new Error('No local data found. Nothing was uploaded.');
    if(!confirm('Replace the cloud copy with THIS device’s current data?\n\nUse this only on the recovered original PWA.'))return;
    await deleteCloudWorkingSet();
    for(var i=0;i<rows.length;i+=40)await upsertChunk(rows.slice(i,i+40));
    var check=await cloudRows();
    if(check.length!==rows.length)throw new Error('Verification failed: uploaded '+check.length+' of '+rows.length+' records.');
    toast('Cloud master copy created: '+rows.length+' records');
    setState('ok');
  }catch(e){console.error(e);toast('Upload failed: '+e.message);setState('error')}
  finally{BUSY=false}
}
async function restoreFromCloud(){
  if(BUSY)return; BUSY=true; setState('syncing');
  try{
    if(!await ensureAuth())throw new Error('Please sign in again');
    var rows=await cloudRows();
    if(!rows.length)throw new Error('Cloud master copy is empty. Restore stopped.');
    if(!confirm('Replace THIS browser’s local data with the cloud master copy?\n\nUse this on Bluefy, not on the recovered original PWA.'))return;

    var keep={}; for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(excluded(k))keep[k]=localStorage.getItem(k)}
    var remove=[]; for(var j=0;j<localStorage.length;j++){var k2=localStorage.key(j);if(!excluded(k2))remove.push(k2)}
    remove.forEach(function(k){localStorage.removeItem(k)});

    var kv=[],msg=[],st=[],cat=[];
    rows.forEach(function(r){
      if(r.data_key.indexOf('ls:')===0){
        var k=r.data_key.slice(3);
        if(!excluded(k)&&r.data&&r.data.value!==undefined&&r.data.value!==null)localStorage.setItem(k,String(r.data.value));
      }else if(r.data_key.indexOf('kv:')===0)kv.push(r.data);
      else if(r.data_key.indexOf('msg:')===0)msg.push(r.data);
      else if(r.data_key.indexOf('sticker:')===0)st.push(r.data);
      else if(r.data_key.indexOf('stickerCat:')===0)cat.push(r.data);
    });
    await idbReplace('mirror_app_kv_db','kv',kv);
    await idbReplace('mirror_message_db','messages',msg);
    await idbReplace('MirrorStickers','stickers',st);
    await idbReplace('MirrorStickers','stickerCategories',cat);
    Object.keys(keep).forEach(function(k){localStorage.setItem(k,keep[k])});
    toast('Restore complete: '+rows.length+' records. Reloading…');
    setState('ok'); setTimeout(function(){location.reload()},1400);
  }catch(e){console.error(e);toast('Restore failed: '+e.message);setState('error')}
  finally{BUSY=false}
}
function toast(s){
  var x=document.createElement('div');x.className='rl7-cloud-toast';x.textContent=s;document.body.appendChild(x);
  setTimeout(function(){x.remove()},3500)
}
function setState(s){var b=document.getElementById('rl7-cloud-btn');if(b)b.dataset.state=s}
function modal(){
  var old=document.getElementById('rl7-cloud-modal');if(old)old.remove();
  var signed=!!uid(),d=document.createElement('div');d.id='rl7-cloud-modal';d.className='rl7-cloud-overlay';
  d.innerHTML='<div class="rl7-cloud-card"><button class="rl7-cloud-x">×</button><div class="rl7-cloud-title">Cloud Transfer</div>'+
  (signed?
   '<div class="rl7-cloud-sub">Signed in. Nothing syncs automatically.</div>'+
   '<button id="rl7-seed" class="rl7-cloud-primary">① This PWA → Replace Cloud</button>'+
   '<button id="rl7-restore" class="rl7-cloud-secondary">② Cloud → Restore This Browser</button>'+
   '<button id="rl7-signout" class="rl7-cloud-ghost">Sign out</button>':
   '<div class="rl7-cloud-sub">Sign in with the same Supabase account you already created.</div>'+
   '<input id="rl7-email" type="email" placeholder="Email"><input id="rl7-pass" type="password" placeholder="Password">'+
   '<button id="rl7-signin" class="rl7-cloud-primary">Sign in</button>')+
   '<div class="rl7-cloud-note">Safety mode: manual one-way transfer only. No automatic pull, push, merge, timer, or background sync.</div></div>';
  document.body.appendChild(d);
  d.querySelector('.rl7-cloud-x').onclick=function(){d.remove()};
  d.onclick=function(e){if(e.target===d)d.remove()};
  if(signed){
    d.querySelector('#rl7-seed').onclick=seedCloud;
    d.querySelector('#rl7-restore').onclick=restoreFromCloud;
    d.querySelector('#rl7-signout').onclick=function(){clearAuth();d.remove();toast('Signed out')};
  }else{
    d.querySelector('#rl7-signin').onclick=async function(){
      var e=d.querySelector('#rl7-email').value.trim(),p=d.querySelector('#rl7-pass').value;
      if(!e||p.length<6){toast('Enter your email and password');return}
      try{await signIn(e,p);d.remove();modal()}catch(err){toast(err.message)}
    };
  }
}
function boot(){
  if(!document.getElementById('rl7-cloud-css')){
    var l=document.createElement('link');l.id='rl7-cloud-css';l.rel='stylesheet';l.href='css/cloud-sync.css?v=20260917safe2';document.head.appendChild(l)
  }
  var b=document.createElement('button');b.id='rl7-cloud-btn';b.className='rl7-cloud-btn';b.type='button';b.textContent='☁';b.onclick=modal;
  document.body.appendChild(b);setState(uid()?'ok':'off');
}
window.RL7CloudSync={seedCloud:seedCloud,restoreFromCloud:restoreFromCloud,signIn:signIn,signOut:clearAuth,config:CFG};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();