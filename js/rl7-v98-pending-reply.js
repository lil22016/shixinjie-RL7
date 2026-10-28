/* RL7 V98 — 切到后台 / 网页被系统清掉后，回复不再丢失
 *
 * 以前：你发消息后，网页在内存里开一个计时器，到点才「已读 + 回复」。
 * 一切到后台 iPhone 就冻结网页，计时器停了；网页被系统清掉时计时器直接没了。
 *
 * 现在：
 *  1. 每条等待中的回复都存进本机（id、哪个聊天、几点该回复）。
 *  2. 网页在前台：照旧到点已读 + 正在输入 + 回复。
 *  3. 切到后台：开着离线推送时，把「几点该回复」交给推送服务，到点推送叫醒手机，
 *     后台生成回复并弹通知；回到网站时写进聊天记录并标为已读。
 *  4. 回到网站 / 重新打开时：已经过了时间、还没回的，立刻补上（先已读，再回复）。
 * 群聊沿用原来的逻辑。
 */
(function(){
'use strict';
var KEY='rl7.pendingReplies.v1';
var timers={};

function load(){try{var a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function save(a){try{localStorage.setItem(KEY,JSON.stringify(a.slice(-30)));}catch(e){}}
function isGroup(cid){try{return typeof isGroupChatId==='function'&&isGroupChatId(cid);}catch(e){return false;}}
function pushOn(){try{return localStorage.getItem('rl7WebPushOn')==='1'&&!!localStorage.getItem('rl7WebPushSub');}catch(e){return false;}}
function hidden(){return document.visibilityState==='hidden';}
function chatVisible(cid){var r=document.getElementById('page-chat-room');return !!(r&&r.classList.contains('active')&&String(r.dataset.chatId)===String(cid)&&!hidden());}

function delayMs(){
  var min=30,max=180;
  try{min=Storage.getReplyMinDelay();max=Storage.getReplyMaxDelay();}catch(e){}
  var d=(min+Math.random()*Math.max(0,max-min))*1000;
  if(d<500)d=500+Math.random()*1500;
  return d;
}

function markSelfRead(cid,upTo){
  var ms=Storage.getMessages(cid)||[],changed=false;
  for(var i=0;i<ms.length;i++){
    var m=ms[i];
    if(m&&m.type==='self'&&!m.read&&!m.isRecall&&!m.isCall&&(!upTo||(m.time||0)<=upTo)){m.read=true;changed=true;}
  }
  if(changed){
    Storage.setMessages(cid,ms);
    if(chatVisible(cid)){try{if(typeof renderChatMessages==='function')renderChatMessages(cid,{preserveScroll:true});}catch(e){}}
  }
}

function remove(id){
  clearTimeout(timers[id]);delete timers[id];
  var a=load(),b=a.filter(function(x){return x.id!==id;});
  if(b.length!==a.length)save(b);
  return b.length!==a.length;
}

/* 真正执行一条回复：已读 → 正在输入 → 回复 */
function run(p){
  if(!remove(p.id))return;                       /* 已经被别处处理过 */
  markSelfRead(p.chatId,p.sentAt);
  var typing=true;try{typing=Storage.getTypingIndicator();}catch(e){}
  if(typing&&chatVisible(p.chatId)&&typeof showTypingIndicator==='function'){
    showTypingIndicator();
    setTimeout(function(){if(typeof doAutoReply==='function')doAutoReply(p.chatId);},1600+Math.random()*2200);
  }else if(typeof doAutoReply==='function'){
    doAutoReply(p.chatId);
  }
}

function arm(p){
  clearTimeout(timers[p.id]);
  timers[p.id]=setTimeout(function(){
    delete timers[p.id];
    /* 切到后台且开着离线推送：交给推送服务，免得回来时重复回复 */
    if(hidden()&&pushOn())return;
    run(p);
  },Math.max(0,p.at-Date.now()));
}

function schedule(chatId){
  if(!chatId)return;
  if(isGroup(chatId)){ if(typeof scheduleGroupAutoReply==='function')scheduleGroupAutoReply(chatId); return; }
  var now=Date.now();
  var p={id:'r'+now.toString(36)+Math.random().toString(36).slice(2,7),chatId:String(chatId),at:now+delayMs(),sentAt:now};
  var a=load();a.push(p);save(a);
  arm(p);
}
schedule.__rl7Timing=1;   /* 让 rl7-unified-ux-v1 不再覆盖 */
schedule.__v98=1;

/* 回到网站：先把后台推送收到的回复写进去，再补上过期没回的 */
var catching=false;
function catchUp(){
  if(catching)return;catching=true;
  var drain=(window.RL7WebPush&&RL7WebPush.drain)?RL7WebPush.drain():Promise.resolve();
  Promise.resolve(drain).catch(function(){}).then(function(){
    var now=Date.now(),a=load(),overdue=[];
    a.forEach(function(p){ if(p.at<=now)overdue.push(p); else arm(p); });
    overdue.sort(function(x,y){return x.at-y.at;});
    overdue.forEach(function(p,i){ setTimeout(function(){run(p);},800+i*2600); });
  }).then(function(){catching=false;},function(){catching=false;});
}

function install(){
  if(window.scheduleAutoReply&&window.scheduleAutoReply.__v98)return;
  window.scheduleAutoReply=schedule;
}
install();
[300,1000,2500,5000].forEach(function(ms){setTimeout(install,ms);});

document.addEventListener('visibilitychange',function(){if(!hidden())catchUp();});
window.addEventListener('pageshow',function(){if(!hidden())catchUp();});
setTimeout(catchUp,2200);   /* 等聊天数据从本机数据库恢复后再补 */

window.RL7PendingReply={
  list:function(){return load().map(function(p){return {id:p.id,at:p.at,chatId:p.chatId};});},
  consumed:function(id){remove(id);},
  catchUp:catchUp,
  _schedule:schedule
};
})();
