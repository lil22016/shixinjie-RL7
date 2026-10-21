/* RL7 V91 — 离线推送（Web Push），不需要一直播放后台音频
 *
 * 工作方式：
 *  - 页面在前台：照旧由本地计时器主动发消息；每 5 分钟告诉推送服务“我在前台，先别推”。
 *  - 页面切到后台：把下一次发送时间交给推送服务，并停掉本地计时器（避免重复发送）。
 *  - 到点后推送服务发一条 Web Push，sw.js 从本地字卡快照里抽一句弹通知并排队；
 *    回到网站时，排队的消息自动写进聊天记录。
 *
 * 部署：先按 push-server/README.md 部署推送服务，再把下面 PUSH_SERVER 改成它的地址。
 */
(function(global){
'use strict';

var PUSH_SERVER = 'https://shixinjie-push.kugaiwo.workers.dev';   // ← 改成你的 Worker 地址，末尾不要加 /

var LS_ON='rl7WebPushOn', LS_ID='rl7WebPushId', LS_SUB='rl7WebPushSub';
var DB='rl7-push', STORE='kv';
var heartbeat=null, localTimerPausedByPush=false;

function configured(){ return /^https:\/\//.test(PUSH_SERVER) && PUSH_SERVER.indexOf('YOUR-PUSH-SERVICE')<0; }
function supported(){ return 'serviceWorker' in navigator && 'PushManager' in global && 'Notification' in global; }
function isOn(){ try{return localStorage.getItem(LS_ON)==='1';}catch(e){return false;} }
function setOn(v){ try{ v?localStorage.setItem(LS_ON,'1'):localStorage.removeItem(LS_ON);}catch(e){} }
function isStandalone(){ return (global.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true; }
function isIOS(){ return /iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1); }
function proactiveOn(){ try{return !!Storage.getProactiveSend();}catch(e){return false;} }
function intervalSec(){ try{var v=Storage.getProactiveSendInterval();return v>0?v:600;}catch(e){return 600;} }
function deviceId(){
  var id=null; try{id=localStorage.getItem(LS_ID);}catch(e){}
  if(!id||!/^[A-Za-z0-9_-]{16,64}$/.test(id)){
    var b=new Uint8Array(18); crypto.getRandomValues(b);
    id=btoa(String.fromCharCode.apply(null,b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    try{localStorage.setItem(LS_ID,id);}catch(e){}
  }
  return id;
}
function savedSub(){ try{return JSON.parse(localStorage.getItem(LS_SUB)||'null');}catch(e){return null;} }
function nextLocalTime(){
  var n=(typeof _proactiveNextTime!=='undefined')?_proactiveNextTime:0;
  return n>Date.now()+5000 ? n : Date.now()+intervalSec()*1000;
}
function b64uToBytes(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4)s+='='; var bin=atob(s),o=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++)o[i]=bin.charCodeAt(i); return o; }

/* text/plain 属于“简单请求”，不触发 CORS 预检；keepalive 保证切后台/关闭时也能发出去 */
function post(path, body, keepalive){
  body.id=deviceId();
  return fetch(PUSH_SERVER+path,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(body),keepalive:!!keepalive,mode:'cors'})
    .then(function(r){return r.json().catch(function(){return {ok:r.ok,status:r.status};});});
}

/* ---------- IndexedDB（与 sw.js 共用） ---------- */
function db(){ return new Promise(function(res,rej){var r=indexedDB.open(DB,1);r.onupgradeneeded=function(){r.result.createObjectStore(STORE);};r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};}); }
function kvGet(d,k){ return new Promise(function(res,rej){var q=d.transaction(STORE).objectStore(STORE).get(k);q.onsuccess=function(){res(q.result);};q.onerror=function(){rej(q.error);};}); }
function kvSet(d,k,v){ return new Promise(function(res,rej){var t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(v,k);t.oncomplete=function(){res();};t.onerror=function(){rej(t.error);};}); }

/* ---------- 字卡快照：sw.js 在后台用它生成消息 ---------- */
function targetChatId(){
  var cid=(typeof _proactiveChatId!=='undefined'&&_proactiveChatId)||'';
  if(cid&&cid.indexOf('partner_')===0)return cid;
  try{
    var chats=Storage.getChats()||[],best=null;
    for(var i=0;i<chats.length;i++){
      if(String(chats[i].id).indexOf('partner_')!==0)continue;
      if(!best||(chats[i].lastTime||0)>(best.lastTime||0))best=chats[i];
    }
    return best?best.id:'';
  }catch(e){return '';}
}
function sample(arr,max){ if(arr.length<=max)return arr; var a=arr.slice(); for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;} return a.slice(0,max); }
function buildSnapshot(){
  var chatId=targetChatId(), pid=chatId.replace('partner_',''), name='对方';
  try{ (Storage.getPartnerProfiles()||[]).forEach(function(p){ if(String(p.id)===pid) name=p.nickname||name; }); }catch(e){}
  var cards=[];
  try{
    (Storage.getCards()||[]).forEach(function(c){ if(c&&c.text&&c.category!=='格言')cards.push(String(c.text).slice(0,300)); });
    var blocked=Storage.getBlockedSubCards()||[];
    (Storage.getSubCards()||[]).forEach(function(c){ if(c&&c.text&&String(c.partnerId)===pid&&blocked.indexOf(c.id)<0)cards.push(String(c.text).slice(0,300)); });
  }catch(e){}
  var emojis=[],kaomojis=[],spell=false;
  try{
    spell=!!Storage.getSpellCardSend();
    if(Storage.getEmojiMixing())emojis=(Storage.getEmojis()||[]).map(function(e){return e.char;}).filter(Boolean);
    if(Storage.getKaomojiMixing())kaomojis=(Storage.getKaomojis()||[]).map(function(k){return k.text;}).filter(Boolean);
  }catch(e){}
  return {enabled:proactiveOn(),chatId:chatId,partnerName:name,cards:sample(cards,1500),emojis:sample(emojis,200),kaomojis:sample(kaomojis,200),spellCard:spell,savedAt:Date.now()};
}
function writeSnapshot(){ return db().then(function(d){return kvSet(d,'snapshot',buildSnapshot());}).catch(function(){}); }

/* ---------- 后台收到的消息 → 写入聊天记录 ---------- */
var draining=false;
function drainQueue(){
  if(draining)return Promise.resolve(); draining=true;
  var d;
  return db().then(function(x){d=x;return kvGet(d,'queue');}).then(function(q){
    if(!q||!q.length)return;
    return kvSet(d,'queue',[]).then(function(){
      var byChat={};
      q.forEach(function(m){(byChat[m.chatId]=byChat[m.chatId]||[]).push(m);});
      Object.keys(byChat).forEach(function(cid){
        var msgs=Storage.getMessages(cid)||[], seen={}, added=[];
        msgs.forEach(function(m){seen[String(m.id)]=1;});
        byChat[cid].forEach(function(m){
          if(seen[String(m.id)])return;
          var nm={id:m.id,type:'other',text:m.text,time:m.time,msgType:'text',viaPush:true};
          msgs.push(nm); added.push(nm);
        });
        if(!added.length)return;
        msgs.sort(function(a,b){return (a.time||0)-(b.time||0);});
        Storage.setMessages(cid,msgs);
        try{ if(typeof updateLastMsg==='function')updateLastMsg(cid,added[added.length-1].text); }catch(e){}
        try{ if(typeof _safeRenderChat==='function')_safeRenderChat(cid); }catch(e){}
      });
    });
  }).catch(function(){}).then(function(){draining=false;});
}

/* ---------- 订阅 ---------- */
function getPublicKey(){
  return fetch(PUSH_SERVER+'/api/health').then(function(r){return r.json();}).then(function(j){
    if(!j||!j.publicKey)throw new Error('推送服务还没有设置 VAPID 密钥');
    return j.publicKey;
  });
}
function subscribe(){
  return navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(function(){return navigator.serviceWorker.ready;}).then(function(reg){
    return getPublicKey().then(function(key){
      return reg.pushManager.getSubscription().then(function(old){
        if(old){
          var k=old.options&&old.options.applicationServerKey;
          var same=k&&btoa(String.fromCharCode.apply(null,new Uint8Array(k))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')===key;
          if(same)return old;
          return old.unsubscribe().then(function(){return null;});
        }
        return null;
      }).then(function(s){
        return s||reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBytes(key)});
      });
    });
  }).then(function(sub){
    var j=sub.toJSON(); try{localStorage.setItem(LS_SUB,JSON.stringify(j));}catch(e){}
    return j;
  });
}
function registerNow(keepalive){
  var sub=savedSub(); if(!sub)return Promise.resolve();
  if(!proactiveOn())return post('/api/unregister',{},keepalive).catch(function(){});
  return post('/api/register',{subscription:sub,intervalSec:intervalSec(),nextAt:nextLocalTime()},keepalive).catch(function(){});
}
function markActive(){
  if(!isOn()||!savedSub())return;
  if(!proactiveOn()){post('/api/unregister',{}).catch(function(){});return;}
  post('/api/active',{intervalSec:intervalSec(),activeForSec:360,nextAt:nextLocalTime()}).then(function(r){
    if(r&&r.error==='not registered')registerNow(false).then(function(){post('/api/active',{intervalSec:intervalSec(),activeForSec:360,nextAt:nextLocalTime()});});
  }).catch(function(){});
}

/* ---------- 前后台切换 ---------- */
function onHidden(){
  if(!isOn()||!savedSub())return;
  writeSnapshot();
  registerNow(true);
  /* 交给服务器后停掉本地计时器，避免回来时与推送重复 */
  if(proactiveOn()&&typeof stopProactiveTimer==='function'){ stopProactiveTimer(); localTimerPausedByPush=true; }
}
function onVisible(){
  drainQueue();
  if(!isOn())return;
  if(localTimerPausedByPush&&proactiveOn()&&typeof startProactiveTimer==='function'){ localTimerPausedByPush=false; startProactiveTimer(); }
  markActive();
  writeSnapshot();
}
function startHeartbeat(){ clearInterval(heartbeat); heartbeat=setInterval(function(){ if(document.visibilityState==='visible')markActive(); },5*60*1000); }

/* ---------- 开关 ---------- */
function setStatus(t){ var el=document.getElementById('cs-web-push-status'); if(el)el.textContent=t; }
function refreshUI(){
  var cb=document.getElementById('cs-web-push'); if(cb)cb.checked=isOn();
  var btn=document.getElementById('cs-web-push-test'); if(btn)btn.style.display=isOn()?'':'none';
  if(!configured())return setStatus('推送服务地址未配置（见 push-server/README.md）');
  if(!supported())return setStatus(isIOS()&&!isStandalone()?'iPhone 需先「添加到主屏幕」，从主屏图标打开后再开启（iOS 16.4+）':'当前浏览器不支持网页推送');
  if(!isOn())return setStatus('关掉后台保活也能收到消息，需允许通知');
  if(Notification.permission!=='granted')return setStatus('通知权限被关闭，请在系统设置里允许');
  setStatus(proactiveOn()?'已开启：切到后台后由推送服务按间隔叫醒':'已开启，但「主动发送」未开，后台不会推送');
}
function toast(t){ try{Core.toast(t);}catch(e){} }
function enable(){
  if(!configured()){toast('推送服务地址未配置');refreshUI();return Promise.resolve(false);}
  if(!supported()){refreshUI();toast(isIOS()&&!isStandalone()?'请先添加到主屏幕再从主屏打开':'当前浏览器不支持');return Promise.resolve(false);}
  setStatus('正在请求通知权限…');
  /* 必须在点击事件里直接请求权限（iOS 要求） */
  var perm=Notification.permission==='granted'?Promise.resolve('granted'):Notification.requestPermission();
  return Promise.resolve(perm).then(function(p){
    if(p!=='granted')throw new Error('没有获得通知权限');
    setStatus('正在订阅推送…');
    return subscribe();
  }).then(function(){
    setOn(true);
    return writeSnapshot().then(function(){return registerNow(false);}).then(function(){ markActive(); startHeartbeat(); });
  }).then(function(){ refreshUI(); toast('离线推送已开启'); return true; })
  .catch(function(e){ setOn(false); refreshUI(); setStatus('开启失败：'+(e&&e.message||e)); return false; });
}
function disable(){
  setOn(false); clearInterval(heartbeat);
  post('/api/unregister',{}).catch(function(){});
  navigator.serviceWorker&&navigator.serviceWorker.ready.then(function(reg){return reg.pushManager.getSubscription();}).then(function(s){if(s)s.unsubscribe();}).catch(function(){});
  try{localStorage.removeItem(LS_SUB);}catch(e){}
  if(localTimerPausedByPush&&proactiveOn()&&typeof startProactiveTimer==='function'){localTimerPausedByPush=false;startProactiveTimer();}
  refreshUI();
}
function test(){
  setStatus('已发送测试推送，切到后台或锁屏看看…');
  post('/api/test',{}).then(function(r){ if(!r||!r.ok)setStatus('测试失败：'+((r&&(r.error||r.detail||r.status))||'未知错误')); }).catch(function(e){setStatus('测试失败：'+e.message);});
}

function injectSettings(){
  if(document.getElementById('cs-web-push'))return;
  var anchor=document.getElementById('cs-bg-push'); if(!anchor)return;
  var item=anchor.closest('.settings-item'); if(!item)return;
  var wrap=document.createElement('div');
  wrap.innerHTML='<div class="list-divider"></div>'+
    '<div class="settings-item">'+
      '<div class="s-content"><div class="s-label">离线推送（无需保活）</div>'+
      '<div class="s-value" id="cs-web-push-status"></div>'+
      '<div class="s-value"><a href="javascript:void 0" id="cs-web-push-test" style="text-decoration:underline">发送测试推送</a></div></div>'+
      '<label class="toggle-switch"><input type="checkbox" id="cs-web-push"><span class="toggle-slider"></span></label>'+
    '</div>';
  var parent=item.parentNode, ref=item.nextSibling;
  while(wrap.firstChild)parent.insertBefore(wrap.firstChild,ref);
  document.getElementById('cs-web-push').addEventListener('change',function(){ this.checked?enable():disable(); });
  document.getElementById('cs-web-push-test').addEventListener('click',test);
  refreshUI();
}

/* 主动发送开关/间隔改变后同步给服务器 */
function hookSettings(){
  var orig=global.chatSettingToggle;
  if(typeof orig==='function'&&!orig.__rl7push){
    var w=function(key){ var r=orig.apply(this,arguments); if(key==='proactiveSend'){ refreshUI(); if(isOn()){writeSnapshot();markActive();} } return r; };
    w.__rl7push=true; global.chatSettingToggle=w;
  }
}

function init(){
  injectSettings(); hookSettings();
  document.addEventListener('visibilitychange',function(){ document.visibilityState==='hidden'?onHidden():onVisible(); });
  global.addEventListener('pagehide',onHidden);
  global.addEventListener('pageshow',function(){ if(document.visibilityState==='visible')onVisible(); });
  if(navigator.serviceWorker)navigator.serviceWorker.addEventListener('message',function(e){
    var t=e.data&&e.data.type;
    if(t==='rl7-push-queue')drainQueue();
    if(t==='rl7-open-chat')drainQueue().then(function(){ if(window.RL7OpenChat)RL7OpenChat(e.data.chatId); });
    if(t==='rl7-push-resubscribe'&&isOn()&&configured())subscribe().then(function(){registerNow(false);}).catch(function(){});
  });
  /* 等聊天数据（IndexedDB）恢复后再写入队列 */
  setTimeout(function(){
    onVisible(); if(isOn())startHeartbeat();
    /* 从系统通知点进来：打开对应聊天，并把地址栏的参数去掉 */
    var m=/[?&]openChat=([^&]*)/.exec(location.search);
    if(m){
      var cid=decodeURIComponent(m[1]); if(cid==='1')cid='';
      try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
      drainQueue().then(function(){ if(window.RL7OpenChat)RL7OpenChat(cid); });
    }
  },1500);
  /* 设置页面可能是后渲染的，补一次注入 */
  setTimeout(injectSettings,3000);
}

global.RL7WebPush={enable:enable,disable:disable,test:test,drain:drainQueue,snapshot:buildSnapshot,refresh:refreshUI};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})(window);
