/* RL7 Unified UX Patch — 2026-09-16
 * 1) unified unread badges
 * 2) read receipt begins exactly with typing for normal auto replies
 * 3) Study with Loki artwork tap bounce
 * 4) rewrites selected hard-coded Chinese system reactions into Loki-style English
 */
(function(){
'use strict';
if(window.__RL7_UNIFIED_UX_20260916__) return;
window.__RL7_UNIFIED_UX_20260916__=1;

var SEEN_KEY='rl7_unread_seen_v1';
var seen={};
try{seen=JSON.parse(localStorage.getItem(SEEN_KEY)||'{}')||{}}catch(e){seen={}}
function saveSeen(){try{localStorage.setItem(SEEN_KEY,JSON.stringify(seen))}catch(e){}}
function now(){return Date.now()}
function arr(v){return Array.isArray(v)?v:[]}
function sget(k,d){try{return window.Storage?Storage.get(k,d):d}catch(e){return d}}
function latestTime(a){
  var m=0;
  arr(a).forEach(function(x){
    if(!x)return;
    var t=Number(x.time||x.createdAt||x.timestamp||x.date||x.updatedAt||x.sentAt||0);
    if(!t && typeof x.id==='number') t=x.id;
    if(t>m)m=t;
  });
  return m;
}
function countAfter(a,t){
  return arr(a).filter(function(x){
    if(!x)return false;
    var n=Number(x.time||x.createdAt||x.timestamp||x.date||x.updatedAt||x.sentAt||0);
    if(!n && typeof x.id==='number')n=x.id;
    return n>t;
  }).length;
}
function lsCandidates(words){
  var best=[];
  try{
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i)||'', low=k.toLowerCase();
      if(!words.some(function(w){return low.indexOf(w)>=0}))continue;
      try{
        var v=JSON.parse(localStorage.getItem(k));
        if(Array.isArray(v))best=best.concat(v);
      }catch(e){}
    }
  }catch(e){}
  return best;
}
function source(type){
  try{
    if(type==='whereabout')
      return Storage.getWhereaboutReports?Storage.getWhereaboutReports():sget('whereaboutReports',[]);
    if(type==='favorite')
      return Storage.getHisFavorites?Storage.getHisFavorites():sget('hisFavorites',[]);
    if(type==='purchase')
      return sget('rl7_partner_purchases_v1',[]) || [];
    if(type==='moments'){
      /* momentsFeed_v1 is NOT an array; its real shape is {feed:[],nextId:n}. */
      var mf=sget('momentsFeed_v1',null);
      return mf&&Array.isArray(mf.feed)?mf.feed:[];
    }
    if(type==='mailbox'){
      var exact=['mailboxLetters_v1','mailbox_v1','letters_v1'];
      for(var i=0;i<exact.length;i++){
        var v=sget(exact[i],null);
        if(Array.isArray(v))return v;
        if(v&&Array.isArray(v.items))return v.items;
        if(v&&Array.isArray(v.letters))return v.letters;
      }
      return lsCandidates(['mailbox','letter','信箱']);
    }
  }catch(e){}
  return [];
}
function unread(type){
  return countAfter(source(type), Number(seen[type]||0));
}
function mark(type){
  var lt=latestTime(source(type));
  seen[type]=lt || now();
  saveSeen(); renderBadges();
}
window.RL7UnreadMark=function(type){mark(type)};
function badge(n){
  var b=document.createElement('span');
  b.className='rl7-unread-badge'+(n>10?' dot':'');
  if(n>0 && n<=10)b.textContent=String(n);
  return b;
}
function putBadge(el,n){
  if(!el)return;
  var old=el.querySelector(':scope > .rl7-unread-badge');
  if(old)old.remove();
  if(n>0){el.classList.add('rl7-badge-host');el.appendChild(badge(n))}
}
function normText(s){return String(s||'').replace(/\s+/g,'').toLowerCase()}
function exactFeatureItem(root,texts){
  if(!root)return null;
  var candidates=root.querySelectorAll('.discover-item,.home-feature-item,.feature-item,.menu-item,.list-item,[onclick],[data-page]');
  for(var i=0;i<candidates.length;i++){
    var el=candidates[i], t=normText(el.textContent);
    for(var j=0;j<texts.length;j++){
      var q=normText(texts[j]);
      if(t===q || t.indexOf(q)===0) return el;
    }
  }
  return null;
}
function iconHost(item){
  if(!item)return null;
  return item.querySelector('.discover-icon,.feature-icon,.home-feature-icon,.menu-icon,.item-icon,.icon-wrap,.app-icon,.home-app-icon,.icon')
      || item.querySelector('i')?.parentElement
      || item;
}
function chatUnread(){
  var total=0;
  try{
    var chats=Storage.getChats?Storage.getChats():[];
    arr(chats).forEach(function(c){
      var msgs=Storage.getMessages(c.id)||[];
      var last=Number(seen['chat:'+c.id]||0);
      total+=msgs.filter(function(m){
        return m && m.type!=='self' && !m.isRecall && Number(m.time||m.id||0)>last;
      }).length;
    });
  }catch(e){}
  return total;
}
function findNavIcon(kind){
  var navs=document.querySelectorAll('.bottom-nav .nav-item,.bottom-nav-item,.nav-item');
  for(var i=0;i<navs.length;i++){
    var el=navs[i], t=normText(el.textContent);
    if((kind==='home' && /首页|主页/.test(t)) || (kind==='discover' && /发现/.test(t))){
      return el.querySelector('.nav-icon,.bottom-nav-icon,.icon-wrap,.icon') || el.querySelector('i')?.parentElement || el;
    }
  }
  return null;
}
function putParentDot(el,on){
  if(!el)return;
  var old=el.querySelector(':scope > .rl7-unread-badge');
  if(old)old.remove();
  if(on){
    el.classList.add('rl7-badge-host');
    var b=badge(11); b.classList.add('parent-dot'); el.appendChild(b);
  }
}
function renderBadges(){
  var home=document.getElementById('page-home');
  var discover=document.getElementById('page-discover');

  /* v3 cleanup: remove ALL badges previously attached anywhere inside controlled
     rows/icons. This also removes stale badges left by older patch versions. */
  try{
    if(home){
      var hc=exactFeatureItem(home,['日常聊天']);
      if(hc) hc.querySelectorAll('.rl7-unread-badge').forEach(function(x){x.remove()});
    }
    if(discover){
      ['我的收藏','他的收藏','ta的收藏','他的购买','ta的购买','朋友圈','时空信箱','信箱','行踪汇报'].forEach(function(label){
        var row=exactFeatureItem(discover,[label]);
        if(row) row.querySelectorAll('.rl7-unread-badge').forEach(function(x){x.remove()});
      });
    }
    document.querySelectorAll('.bottom-nav .rl7-unread-badge,.bottom-nav-item .rl7-unread-badge').forEach(function(x){x.remove()});
  }catch(e){}

  var cu=chatUnread(), mo=unread('moments'), wa=unread('whereabout'),
      mb=unread('mailbox'), pu=unread('purchase'), fa=unread('favorite');

  /* badges belong to the small icon itself, never the whole row/card */
  putBadge(iconHost(exactFeatureItem(home,['日常聊天'])),cu);
  putBadge(iconHost(exactFeatureItem(discover,['朋友圈'])),mo);
  putBadge(iconHost(exactFeatureItem(discover,['行踪汇报'])),wa);
  putBadge(iconHost(exactFeatureItem(discover,['时空信箱','信箱'])),mb);
  putBadge(iconHost(exactFeatureItem(discover,['他的购买','ta的购买'])),pu);
  putBadge(iconHost(exactFeatureItem(discover,['他的收藏','ta的收藏'])),fa);

  /* Explicitly remove any accidental badge from My Favorites. */
  var mine=exactFeatureItem(discover,['我的收藏']);
  if(mine) mine.querySelectorAll('.rl7-unread-badge').forEach(function(x){x.remove()});

  /* Parent tabs are presence-only dots, not summed counters. */
  putParentDot(findNavIcon('home'),cu>0);
  putParentDot(findNavIcon('discover'),(mo+wa+mb+pu+fa)>0);
}
function currentChatSeen(){
  var room=document.getElementById('page-chat-room');
  if(!room||!room.classList.contains('active')||!room.dataset.chatId)return;
  var cid=room.dataset.chatId, msgs=[];
  try{msgs=Storage.getMessages(cid)||[]}catch(e){}
  var mx=latestTime(msgs);
  if(mx){seen['chat:'+cid]=Math.max(Number(seen['chat:'+cid]||0),mx);saveSeen()}
}

/* Mark a feature as read when the actual page is entered. */
function pageRead(page){
  var map={
    'moments':'moments',
    'whereabout-reports':'whereabout',
    'mailbox':'mailbox',
    'partner-purchases':'purchase',
    'his-favorites':'favorite'
  };
  if(map[page])mark(map[page]);
  if(page==='chat-room')setTimeout(currentChatSeen,80);
}
function patchNavigation(){
  if(!window.Navigation||Navigation.__rl7UnreadPatch)return;
  Navigation.__rl7UnreadPatch=1;
  if(typeof Navigation.navigateTo==='function'){
    var old=Navigation.navigateTo.bind(Navigation);
    Navigation.navigateTo=function(page){
      var r=old.apply(null,arguments);
      setTimeout(function(){pageRead(page);renderBadges();bindStudyBounce()},100);
      return r;
    };
  }
}

/* ---------- Read -> typing must be one event ---------- */
function markSelfRead(chatId){
  if(!window.Storage||!Storage.getMessages)return;
  var ms=Storage.getMessages(chatId)||[], changed=false;
  for(var i=0;i<ms.length;i++){
    if(ms[i]&&ms[i].type==='self'&&!ms[i].read&&!ms[i].isRecall&&!ms[i].isCall){
      ms[i].read=true;changed=true;
    }
  }
  if(changed){
    Storage.setMessages(chatId,ms);
    var room=document.getElementById('page-chat-room');
    if(room&&room.dataset.chatId===chatId){
      try{if(typeof renderChatMessages==='function')renderChatMessages(chatId,{preserveScroll:true})}catch(e){}
    }
  }
}
function patchReplyTiming(){
  /* Disable the independent 3–10 s receipt clock. Pending messages remain unread
     until the normal randomized reply delay has elapsed. */
  window.scheduleReadReceipt=function(){};
  window.reschedulePendingReads=function(){};

  if(typeof window.scheduleAutoReply!=='function'||window.scheduleAutoReply.__rl7Timing)return;
  var replacement=function(chatId){
    if(typeof isGroupChatId==='function'&&isGroupChatId(chatId)){
      if(typeof scheduleGroupAutoReply==='function')scheduleGroupAutoReply(chatId);
      return;
    }
    var min=30,max=180;
    try{min=Storage.getReplyMinDelay();max=Storage.getReplyMaxDelay()}catch(e){}
    var delay=(min+Math.random()*Math.max(0,max-min))*1000;
    if(delay<500)delay=500+Math.random()*1500;
    setTimeout(function(){
      /* At the exact end of the wait: double-check/read + typing begin together. */
      markSelfRead(chatId);
      var typing=true;
      try{typing=Storage.getTypingIndicator()}catch(e){}
      if(typing&&typeof showTypingIndicator==='function'){
        showTypingIndicator();
        setTimeout(function(){if(typeof doAutoReply==='function')doAutoReply(chatId)},1600+Math.random()*2200);
      }else if(typeof doAutoReply==='function'){
        doAutoReply(chatId);
      }
    },delay);
  };
  replacement.__rl7Timing=1;
  window.scheduleAutoReply=replacement;
}

/* ---------- Study with Loki artwork tap bounce ---------- */
function bindStudyBounce(){
  var page=document.getElementById('page-companion')||
           document.getElementById('page-study-with-loki')||
           document.getElementById('page-stay-with-loki');
  var roots=page?[page]:Array.from(document.querySelectorAll('[id*="companion"],[class*="companion"],[id*="study"]'));
  roots.forEach(function(root){
    var imgs=root.querySelectorAll('img');
    imgs.forEach(function(img){
      if(img.__rl7Bounce)return;
      var src=(img.getAttribute('src')||'').toLowerCase();
      var cls=(img.className||'').toString().toLowerCase();
      if(!/loki|companion|character|stand|transparent|png/.test(src+' '+cls) && imgs.length>1)return;
      img.__rl7Bounce=1;
      img.classList.add('rl7-study-artwork');
      img.addEventListener('pointerdown',function(){
        img.classList.remove('rl7-character-bounce'); void img.offsetWidth;
        img.classList.add('rl7-character-bounce');
        setTimeout(function(){img.classList.remove('rl7-character-bounce')},430);
      });
    });
  });
}

/* ---------- Loki-style rewrite for selected hard-coded system reactions ---------- */
var replyPools={
 punishment:[
   "Cruel. Fine, darling. I'll take the punishment.",
   "A punishment? How very authoritative of you. Fine—I’ll play along.",
   "You do enjoy having power over me, don't you? Very well."
 ],
 redpacket:[
   "A red packet as punishment? Extortion with excellent branding. Fine, darling.",
   "Money as an apology? How terribly efficient of you. Consider me chastened.",
   "Fine. Take the red packet. I refuse to look appropriately remorseful, though."
 ],
 accounting:[
   "Noted. Try not to bankrupt us before dinner.",
   "Recorded. Your financial judgment remains… fascinating.",
   "Logged. I’ll refrain from commenting on your spending habits. For now.",
   "Duly noted, darling. The ledger survives another day."
 ]
};
function rp(a){return a[Math.floor(Math.random()*a.length)]}
function rewriteSystemText(t){
  if(typeof t!=='string')return t;
  var x=t.trim();
  if(!x)return t;
  if(/收到惩罚|惩罚.*(红包|道歉)|发红包.*(道歉|惩罚)|我知道错了/.test(x)) return /红包/.test(x)?rp(replyPools.redpacket):rp(replyPools.punishment);
  if(/勤俭持家|小能手|花得真漂亮|记账|已记下|记下了|入账|账本/.test(x)) return rp(replyPools.accounting);
  return t;
}
function patchSystemReplies(){
  if(!window.Storage||Storage.__rl7SystemEnglish)return;
  Storage.__rl7SystemEnglish=1;
  if(typeof Storage.setMessages==='function'){
    var old=Storage.setMessages.bind(Storage);
    Storage.setMessages=function(chatId,msgs){
      try{
        msgs=arr(msgs).map(function(m){
          if(!m||m.type==='self'||typeof m.text!=='string')return m;
          var nt=rewriteSystemText(m.text);
          if(nt!==m.text){var c=Object.assign({},m);c.text=nt;return c}
          return m;
        });
      }catch(e){}
      return old(chatId,msgs);
    };
  }
}


/* ---------- Exact content-write hooks ----------
   The unread system must react to the actual persistent write, not to a toast/log.
   This catches background/free-will writes immediately. */
function patchContentWriters(){
  if(!window.Storage||Storage.__rl7UnreadWriterHooks)return;
  Storage.__rl7UnreadWriterHooks=1;

  if(typeof Storage.addWhereaboutReport==='function'){
    var oldWA=Storage.addWhereaboutReport.bind(Storage);
    Storage.addWhereaboutReport=function(report){
      var r=oldWA(report);
      setTimeout(renderBadges,0);
      return r;
    };
  }

  if(typeof Storage.set==='function'){
    var oldSet=Storage.set.bind(Storage);
    Storage.set=function(key,val){
      var r=oldSet(key,val);
      if(key==='momentsFeed_v1'||key==='rl7_partner_purchases_v1'||key==='whereaboutReports'||
         /mailbox|letter/i.test(String(key))||/favorite/i.test(String(key))){
        setTimeout(renderBadges,0);
      }
      return r;
    };
  }
}
/* Storage mutations can happen while the user is elsewhere; polling makes badge
   recovery deterministic after iOS wakes the PWA or background timers resume. */
function boot(){
  patchNavigation();
  patchReplyTiming();
  patchSystemReplies();
  patchContentWriters();
  bindStudyBounce();
  renderBadges();
  setInterval(function(){
    patchNavigation();patchReplyTiming();patchSystemReplies();patchContentWriters();
    currentChatSeen();renderBadges();bindStudyBounce();
  },1200);
  document.addEventListener('visibilitychange',function(){if(!document.hidden){setTimeout(renderBadges,100)}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,900)},{once:true});
else setTimeout(boot,900);
})();