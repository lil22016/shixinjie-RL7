/* RL7 service worker — version 2026-10-28-v98reply1 */
const RL7_SW_VERSION='2026-10-28-v98reply1';
self.addEventListener('install',function(){self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim());});
self.addEventListener('message',function(e){if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();});

/* ===== V91 Web Push：无需后台音频保活 =====
 * 推送服务只负责“到点叫醒”。被叫醒后，这里从页面写入 IndexedDB 的字卡快照里
 * 随机抽一句，弹系统通知，并把消息放进队列；下次打开网站时页面会把队列写进聊天记录。
 */
const PUSH_DB='rl7-push',PUSH_STORE='kv';
function pushDb(){
  return new Promise(function(res,rej){
    const r=indexedDB.open(PUSH_DB,1);
    r.onupgradeneeded=function(){r.result.createObjectStore(PUSH_STORE);};
    r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};
  });
}
function kvGet(db,k){return new Promise(function(res,rej){const q=db.transaction(PUSH_STORE).objectStore(PUSH_STORE).get(k);q.onsuccess=function(){res(q.result);};q.onerror=function(){rej(q.error);};});}
function kvSet(db,k,v){return new Promise(function(res,rej){const t=db.transaction(PUSH_STORE,'readwrite');t.objectStore(PUSH_STORE).put(v,k);t.oncomplete=function(){res();};t.onerror=function(){rej(t.error);};});}
function pick(a){return a[Math.floor(Math.random()*a.length)];}

function composeFromSnapshot(s,pool){
  const cards=pool||(s&&s.cards)||[];
  if(!cards.length)return '';
  const parts=[];
  const base=pick(cards);const texts=[base];
  if(s.spellCard&&cards.length>1){
    const n=1+Math.floor(Math.random()*2);
    for(let i=0;i<n;i++){let o,tries=0;do{o=pick(cards);tries++;}while(o===base&&tries<20);texts.push(o);}
  }
  parts.push(s.spellCard?texts.join('，'):texts.join(''));
  if(s.emojis&&s.emojis.length&&Math.random()<0.15)parts.splice(Math.floor(Math.random()*(parts.length+1)),0,pick(s.emojis));
  if(s.kaomojis&&s.kaomojis.length&&Math.random()<0.20)parts.splice(Math.floor(Math.random()*(parts.length+1)),0,pick(s.kaomojis));
  return parts.join('');
}
/* V98：回复某个聊天时，和网页里一样——有该角色专属字卡时一半概率用专属字卡 */
function poolFor(s,chatId){
  const pid=String(chatId||'').replace('partner_','');
  const main=(s&&s.main)||(s&&s.cards)||[];
  const sub=(s&&s.subs&&s.subs[pid])||[];
  if(sub.length&&main.length)return Math.random()<.5?sub:main;
  return sub.length?sub:main;
}
function nameFor(s,chatId){
  const pid=String(chatId||'').replace('partner_','');
  return (s&&s.names&&s.names[pid])||(s&&s.partnerName)||'对方';
}

async function handlePush(data){
  data=data||{};
  let snap=null,db=null;
  try{db=await pushDb();snap=await kvGet(db,'snapshot');}catch(e){}
  const isReply=data.t==='reply';
  const chatId=isReply?(data.chatId||(snap&&snap.chatId)||''):((snap&&snap.chatId)||'');
  const name=nameFor(snap,chatId);
  let text='';
  if(data.test)text='推送测试成功，关掉后台保活也能收到消息啦';
  else if(isReply)text=snap?composeFromSnapshot(snap,poolFor(snap,chatId)):'';
  else if(snap&&snap.enabled!==false)text=composeFromSnapshot(snap);

  if(db&&chatId&&!data.test){
    try{
      const q=(await kvGet(db,'queue'))||[];
      const now=Date.now();
      /* 回复：即使没抽到字卡也要入队，好让已读状态和「等待中的回复」被正确消化 */
      if(text||isReply)q.push({id:now+Math.floor(Math.random()*1000),chatId:chatId,text:text,time:now,pendingId:data.pid||'',markRead:isReply});
      while(q.length>50)q.shift();
      await kvSet(db,'queue',q);
    }catch(e){}
  }
  if(!text)text=isReply?'已读':'给你发来一条消息';
  /* 页面若开着就让它立刻把队列写入聊天记录 */
  try{
    const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    list.forEach(function(c){c.postMessage({type:'rl7-push-queue'});});
  }catch(e){}

  /* iOS 要求每条推送都必须弹出可见通知 */
  return self.registration.showNotification('『'+name+'』'+(isReply&&text==='已读'?'已读了你的消息':'发来消息'),{
    body:text,
    tag:'rl7-msg-'+Date.now(),
    icon:'./favicon.svg',
    badge:'./favicon.svg',
    data:{url:self.registration.scope,chatId:chatId}
  });
}

self.addEventListener('push',function(e){
  let data={};
  try{data=e.data?e.data.json():{};}catch(err){data={};}
  e.waitUntil(handlePush(data));
});

self.addEventListener('notificationclick',function(e){
  e.notification.close();
  const d=e.notification.data||{};
  const url=(d.url||self.registration.scope)+'?openChat='+encodeURIComponent(d.chatId||'1');
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
    for(const c of list){if('focus' in c){c.postMessage({type:'rl7-push-queue'});c.postMessage({type:'rl7-open-chat',chatId:d.chatId||''});return c.focus();}}
    return self.clients.openWindow?self.clients.openWindow(url):null;
  }));
});

/* 订阅被浏览器轮换时通知页面重新注册 */
self.addEventListener('pushsubscriptionchange',function(e){
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
    list.forEach(function(c){c.postMessage({type:'rl7-push-resubscribe'});});
  }));
});
