/* 拾心界 Cloud Sync — Supabase local-first sync */
(function () {
  'use strict';

  var CFG = {
    url: 'https://tncilkhksteqocbnqcrt.supabase.co',
    key: 'sb_publishable_fj5yqUMg3BLws3HoMY9MiQ_TcGXjHsS',
    table: 'user_sync'
  };
  var AUTH_KEY = '__rl7_cloud_auth_v1';
  var TS_KEY = '__rl7_cloud_ls_ts_v1';
  var syncing = false;
  var timer = null;
  var originalSetItem = localStorage.setItem.bind(localStorage);
  var originalRemoveItem = localStorage.removeItem.bind(localStorage);

  function parse(s, fallback) { try { return JSON.parse(s); } catch (_) { return fallback; } }
  function auth() { return parse(localStorage.getItem(AUTH_KEY), null); }
  function saveAuth(v) { originalSetItem(AUTH_KEY, JSON.stringify(v)); }
  function clearAuth() { originalRemoveItem(AUTH_KEY); }
  function lsTimes() { return parse(localStorage.getItem(TS_KEY), {}) || {}; }
  function saveTimes(v) { originalSetItem(TS_KEY, JSON.stringify(v)); }
  function excluded(k) {
    return !k || k === AUTH_KEY || k === TS_KEY || k.indexOf('sb-') === 0 ||
      k.indexOf('supabase') >= 0 || k.indexOf('__rl7_cloud_') === 0;
  }

  /* Track ordinary localStorage writes so later syncs can resolve conflicts. */
  localStorage.setItem = function(k, v) {
    originalSetItem(k, v);
    if (!excluded(k) && !syncing) {
      var t = lsTimes(); t[k] = Date.now(); saveTimes(t); schedule();
    }
  };
  localStorage.removeItem = function(k) {
    originalRemoveItem(k);
    if (!excluded(k) && !syncing) {
      var t = lsTimes(); t[k] = Date.now(); saveTimes(t); schedule();
    }
  };

  async function api(path, opts) {
    opts = opts || {};
    var a = auth();
    var headers = Object.assign({
      'apikey': CFG.key,
      'Content-Type': 'application/json'
    }, opts.headers || {});
    if (a && a.access_token) headers.Authorization = 'Bearer ' + a.access_token;
    var r = await fetch(CFG.url + path, Object.assign({}, opts, {headers: headers}));
    var body = await r.text();
    var data = body ? parse(body, body) : null;
    if (!r.ok) throw new Error((data && (data.msg || data.message || data.error_description || data.error)) || ('HTTP ' + r.status));
    return data;
  }

  async function signUp(email, password) {
    var d = await api('/auth/v1/signup', {method:'POST', body:JSON.stringify({email:email,password:password})});
    if (d && d.access_token) saveAuth(d);
    return d;
  }
  async function signIn(email, password) {
    var d = await api('/auth/v1/token?grant_type=password', {method:'POST', body:JSON.stringify({email:email,password:password})});
    saveAuth(d); return d;
  }
  async function refresh() {
    var a = auth();
    if (!a || !a.refresh_token) return null;
    try {
      var d = await api('/auth/v1/token?grant_type=refresh_token', {method:'POST', body:JSON.stringify({refresh_token:a.refresh_token})});
      saveAuth(d); return d;
    } catch(e) { clearAuth(); return null; }
  }
  function userId() { var a=auth(); return a && a.user && a.user.id; }

  async function upsert(key, data, updatedAt) {
    var uid = userId(); if (!uid) throw new Error('Not signed in');
    return api('/rest/v1/' + CFG.table + '?on_conflict=user_id,data_key', {
      method:'POST',
      headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify({user_id:uid,data_key:key,data:data,updated_at:new Date(updatedAt || Date.now()).toISOString()})
    });
  }
  async function cloudRows() {
    var uid=userId(); if (!uid) return [];
    return await api('/rest/v1/' + CFG.table + '?user_id=eq.' + encodeURIComponent(uid) + '&select=data_key,data,updated_at');
  }

  function idbAll(dbName, storeName) {
    return new Promise(function(resolve) {
      if (!window.indexedDB) return resolve([]);
      var req=indexedDB.open(dbName);
      req.onerror=function(){resolve([]);};
      req.onsuccess=function(){
        var db=req.result;
        if (!db.objectStoreNames.contains(storeName)) { db.close(); return resolve([]); }
        var tx=db.transaction(storeName,'readonly'), q=tx.objectStore(storeName).getAll();
        q.onsuccess=function(){resolve(q.result||[]);}; q.onerror=function(){resolve([]);};
      };
    });
  }
  function idbPut(dbName, storeName, rows) {
    return new Promise(function(resolve) {
      if (!rows || !rows.length) return resolve();
      var req=indexedDB.open(dbName);
      req.onerror=function(){resolve();};
      req.onsuccess=function(){
        var db=req.result;
        if (!db.objectStoreNames.contains(storeName)) {db.close();return resolve();}
        var tx=db.transaction(storeName,'readwrite'), s=tx.objectStore(storeName);
        rows.forEach(function(x){try{s.put(x);}catch(_){}});
        tx.oncomplete=function(){resolve();}; tx.onerror=function(){resolve();};
      };
    });
  }

  async function collectLocal() {
    var out={}, ts=lsTimes(), now=Date.now();
    for (var i=0;i<localStorage.length;i++) {
      var k=localStorage.key(i); if (excluded(k)) continue;
      var raw=localStorage.getItem(k);
      out['ls:'+k]={data:{value:raw}, ts:ts[k] || now};
    }
    var kv=await idbAll('mirror_app_kv_db','kv');
    kv.forEach(function(r){ if(r&&r.key) out['kv:'+r.key]={data:r,ts:r.updatedAt||now}; });
    var msgs=await idbAll('mirror_message_db','messages');
    msgs.forEach(function(r){ if(r&&r.chatId) out['msg:'+r.chatId]={data:r,ts:r.updatedAt||now}; });
    var stickers=await idbAll('MirrorStickers','stickers');
    stickers.forEach(function(r){ if(r&&r.id!=null) out['sticker:'+r.id]={data:r,ts:now}; });
    var cats=await idbAll('MirrorStickers','stickerCategories');
    cats.forEach(function(r){ if(r&&r.id!=null) out['stickerCat:'+r.id]={data:r,ts:now}; });
    return out;
  }

  async function applyCloud(rows, local) {
    var lsPut=[], kvPut=[], msgPut=[], stPut=[], catPut=[], changed=false, t=lsTimes();
    for (var i=0;i<rows.length;i++) {
      var r=rows[i], cloudTs=Date.parse(r.updated_at)||0, l=local[r.data_key];
      if (l && l.ts >= cloudTs) continue;
      if (r.data_key.indexOf('ls:')===0) {
        var k=r.data_key.slice(3); if(excluded(k)) continue;
        if (r.data && r.data.value !== null && r.data.value !== undefined) originalSetItem(k,String(r.data.value));
        else originalRemoveItem(k);
        t[k]=cloudTs; changed=true;
      } else if (r.data_key.indexOf('kv:')===0) { kvPut.push(r.data); changed=true;
      } else if (r.data_key.indexOf('msg:')===0) { msgPut.push(r.data); changed=true;
      } else if (r.data_key.indexOf('sticker:')===0) { stPut.push(r.data); changed=true;
      } else if (r.data_key.indexOf('stickerCat:')===0) { catPut.push(r.data); changed=true; }
    }
    saveTimes(t);
    await idbPut('mirror_app_kv_db','kv',kvPut);
    await idbPut('mirror_message_db','messages',msgPut);
    await idbPut('MirrorStickers','stickers',stPut);
    await idbPut('MirrorStickers','stickerCategories',catPut);
    return changed;
  }

  async function sync(showToast) {
    if (syncing || !userId()) return;
    syncing=true; setStatus('syncing');
    try {
      var local=await collectLocal(), rows=await cloudRows(), map={};
      rows.forEach(function(r){map[r.data_key]=r;});
      /* First pull newer cloud records, then push missing/newer local records. */
      var changed=await applyCloud(rows,local);
      local=await collectLocal();
      var keys=Object.keys(local);
      for (var i=0;i<keys.length;i++) {
        var k=keys[i], l=local[k], c=map[k], cts=c ? (Date.parse(c.updated_at)||0) : 0;
        if (!c || l.ts > cts) await upsert(k,l.data,l.ts);
      }
      originalSetItem('__rl7_cloud_last_sync', String(Date.now()));
      setStatus('ok');
      if (showToast) toast('Cloud sync complete');
      if (changed && showToast && confirm('Cloud data was restored to this browser. Reload now to apply it everywhere?')) location.reload();
    } catch(e) {
      console.error('[CloudSync]',e); setStatus('error'); if(showToast) toast('Sync failed: '+e.message);
    } finally { syncing=false; }
  }

  function schedule() {
    if (!userId()) return;
    clearTimeout(timer); timer=setTimeout(function(){sync(false);},2500);
  }

  function css() {
    if(document.getElementById('rl7-cloud-css'))return;
    var l=document.createElement('link'); l.id='rl7-cloud-css'; l.rel='stylesheet'; l.href='css/cloud-sync.css?v=20260917a'; document.head.appendChild(l);
  }
  function toast(s) {
    var x=document.createElement('div');x.className='rl7-cloud-toast';x.textContent=s;document.body.appendChild(x);
    setTimeout(function(){x.remove();},2600);
  }
  function setStatus(s) {
    var b=document.getElementById('rl7-cloud-btn'); if(!b)return;
    b.dataset.state=s; b.title=s==='ok'?'Cloud synced':s==='error'?'Cloud sync error':'Cloud sync';
  }
  function modal() {
    var old=document.getElementById('rl7-cloud-modal'); if(old)old.remove();
    var signed=!!userId(), d=document.createElement('div');d.id='rl7-cloud-modal';d.className='rl7-cloud-overlay';
    d.innerHTML='<div class="rl7-cloud-card"><button class="rl7-cloud-x">×</button><div class="rl7-cloud-title">Cloud Sync</div>'+
      (signed?'<div class="rl7-cloud-sub">Signed in. This browser can sync with your other browsers.</div><button id="rl7-sync-now" class="rl7-cloud-primary">Sync now</button><button id="rl7-signout" class="rl7-cloud-secondary">Sign out</button>':
      '<div class="rl7-cloud-sub">Use the same account in PWA and Bluefy.</div><input id="rl7-email" type="email" placeholder="Email"><input id="rl7-pass" type="password" placeholder="Password"><button id="rl7-signin" class="rl7-cloud-primary">Sign in</button><button id="rl7-signup" class="rl7-cloud-secondary">Create account</button>')+
      '<div class="rl7-cloud-note">Local data stays on this device. Cloud sync adds a second copy.</div></div>';
    document.body.appendChild(d);
    d.querySelector('.rl7-cloud-x').onclick=function(){d.remove();}; d.onclick=function(e){if(e.target===d)d.remove();};
    if(signed){
      document.getElementById('rl7-sync-now').onclick=async function(){await sync(true);};
      document.getElementById('rl7-signout').onclick=function(){clearAuth();d.remove();setStatus('off');toast('Signed out');};
    } else {
      async function go(mode){
        var e=document.getElementById('rl7-email').value.trim(),p=document.getElementById('rl7-pass').value;
        if(!e||p.length<6){toast('Enter an email and password (6+ characters)');return;}
        try{
          if(mode==='up') await signUp(e,p); else await signIn(e,p);
          if(!userId()) { await signIn(e,p); }
          d.remove(); setStatus('syncing'); await sync(true);
        }catch(err){toast(err.message);}
      }
      document.getElementById('rl7-signin').onclick=function(){go('in');};
      document.getElementById('rl7-signup').onclick=function(){go('up');};
    }
  }
  function ui() {
    css();
    var b=document.createElement('button');b.id='rl7-cloud-btn';b.className='rl7-cloud-btn';b.type='button';
    b.innerHTML='☁'; b.onclick=modal; document.body.appendChild(b); setStatus(userId()?'ok':'off');
  }

  async function boot() {
    ui();
    var a=auth();
    if(a && a.expires_at && a.expires_at*1000 < Date.now()+60000) await refresh();
    if(userId()) { setTimeout(function(){sync(false);},1200); setInterval(function(){sync(false);},60000); }
    window.addEventListener('online',function(){sync(false);});
    document.addEventListener('visibilitychange',function(){if(!document.hidden)sync(false);});
  }
  window.RL7CloudSync={sync:sync,signIn:signIn,signUp:signUp,signOut:function(){clearAuth();},config:CFG};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();