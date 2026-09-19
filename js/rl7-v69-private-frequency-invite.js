/* RL7 V69 — Private Frequency invitation card + proactive send.
   Reuses the site's existing openPrivateFrequency() redirect path exactly. */
(function(){
'use strict';
if(window.__RL7_V69_PRIVATE_FREQUENCY__)return;
window.__RL7_V69_PRIVATE_FREQUENCY__=1;

var PROBABILITY = 0.08; // 8% of each proactive-send tick, single chats only.
var NORMAL_REPLY_PROBABILITY = 0.02; // 2% of ordinary Loki replies become a Private Frequency invite.

var lines=[
  "Come here. I have something more interesting in mind.",
  "Private Frequency. You know where to find me.",
  "I require your undivided attention.",
  "A private channel. Just you and me.",
  "Consider this an invitation, darling.",
  "I think we should take this somewhere more private."
];
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function esc(s){
  try{return window.Core&&Core.escapeHtml?Core.escapeHtml(String(s)):String(s)}
  catch(e){return String(s)}
}

/* Clicking the card is deliberately the same action as tapping the existing
   Private Frequency entry. private-frequency-bluefy.js remains the single
   owner of Safari/PWA -> Bluefy -> nyx-control redirect behavior. */
window.RL7OpenPrivateFrequencyInvite=function(){
  if(typeof window.openPrivateFrequency==='function'){
    window.openPrivateFrequency();
    return;
  }
  /* Cache/order fallback only; normally never used because the existing file
     is loaded before this one. */
  var target='https://lil22016.github.io/shixinjie-RL7/nyx-control.html';
  var isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(isiOS) location.href='bluefy://open?url='+encodeURIComponent(target);
  else location.href='nyx-control.html';
};

function cardHtml(msg,isSelf,selfAvatarHtml,otherAvatarHtml,suffixHtml,senderHtml,rowGroupCls){
  var line=(msg.privateFrequency&&msg.privateFrequency.line)||msg.text||lines[0];
  return '<div class="message-row '+(isSelf?'self':'other'+(rowGroupCls||''))+'" data-msg-id="'+msg.id+'">'
    +(isSelf?selfAvatarHtml:otherAvatarHtml)
    +'<div class="message-body">'+(senderHtml||'')
    +'<button type="button" class="rl7-private-frequency-card" onclick="RL7OpenPrivateFrequencyInvite()">'
    +'<span class="rl7-pf-icon"><i class="fas fa-wave-square"></i></span>'
    +'<span class="rl7-pf-copy"><strong>Private Frequency</strong><span>'+esc(line)+'</span></span>'
    +'<i class="fas fa-chevron-right rl7-pf-arrow"></i>'
    +'</button>'
    +(suffixHtml||'')
    +'<div class="message-meta"><div class="message-time">'+
      (window.Core&&Core.formatTime?Core.formatTime(msg.time):'')+'</div></div>'
    +'</div></div>';
}

/* Integrate into the existing message renderer so cards persist after refresh,
   history reload, and switching chats. */
function installRenderer(){
  if(typeof window._buildNormalMessageHtml!=='function')return false;
  if(window._buildNormalMessageHtml.__rl7pf69)return true;
  var old=window._buildNormalMessageHtml;
  function wrapped(msg,isSelf,selfAvatarHtml,otherAvatarHtml,suffixHtml,senderName,senderStatusHtml,rowGroupCls){
    if(msg&&msg.msgType==='private_frequency'){
      var senderHtml=senderName
        ? '<div class="message-sender-name">'+esc(senderName)+(senderStatusHtml||'')+'</div>'
        : '';
      return cardHtml(msg,isSelf,selfAvatarHtml,otherAvatarHtml,suffixHtml,senderHtml,rowGroupCls);
    }
    return old.apply(this,arguments);
  }
  wrapped.__rl7pf69=1;
  window._buildNormalMessageHtml=wrapped;
  return true;
}

function sendInvite(cid){
  if(!cid || (typeof window.isGroupChatId==='function'&&isGroupChatId(cid)))return false;
  var now=Date.now();
  var line=pick(lines);
  var msg={
    id:now,
    type:'other',
    text:line,
    time:now,
    msgType:'private_frequency',
    privateFrequency:{line:line}
  };
  var messages=Storage.getMessages(cid)||[];
  messages.push(msg);
  Storage.setMessages(cid,messages);
  if(typeof window.updateLastMsg==='function')updateLastMsg(cid,'[Private Frequency]');
  if(typeof window._safeAppendMessage==='function')_safeAppendMessage(cid,msg);
  else if(typeof window._safeRenderChat==='function')_safeRenderChat(cid);
  try{if(window.App&&App.playSound)App.playSound('receive')}catch(e){}
  try{if(typeof window.showBackgroundPush==='function')showBackgroundPush('Private Frequency · '+line)}catch(e){}
  return true;
}
window.RL7SendPrivateFrequencyInvite=sendInvite;

/* Ordinary reply path: 2% chance to replace that reply with the invitation card.
   Proactive sends are excluded here because they already have their own 8% roll. */
function installNormalReply(){
  if(typeof window.doAutoReply!=='function')return false;
  if(window.doAutoReply.__rl7pf70)return true;
  var old=window.doAutoReply;
  function wrapped(cid){
    var single=cid && !(typeof window.isGroupChatId==='function'&&isGroupChatId(cid));
    if(single && !window.__RL7_PF_PROACTIVE_PENDING__ && Math.random()<NORMAL_REPLY_PROBABILITY){
      try{if(typeof window.hideTypingIndicator==='function')hideTypingIndicator()}catch(e){}
      if(sendInvite(cid))return;
    }
    return old.apply(this,arguments);
  }
  wrapped.__rl7pf70=1;
  window.doAutoReply=wrapped;
  return true;
}

/* Add Private Frequency as a genuine proactive-send outcome.
   It does NOT run its own extra timer: it participates in the user's existing
   proactive-send schedule, so it cannot create a second spammy scheduler. */
function installProactive(){
  if(typeof window._doProactiveSend!=='function')return false;
  if(window._doProactiveSend.__rl7pf69)return true;
  var old=window._doProactiveSend;
  function wrapped(){
    var cid=window._proactiveChatId||'';
    var room=document.getElementById('page-chat-room');
    if(!cid&&room)cid=room.dataset.chatId||'';
    if(!cid){
      try{
        var chats=Storage.getChats()||[];
        if(chats.length){
          var best=chats[0];
          for(var i=1;i<chats.length;i++)if((chats[i].lastTime||0)>(best.lastTime||0))best=chats[i];
          cid=best.id;
        }
      }catch(e){}
    }
    var single=cid && !(typeof window.isGroupChatId==='function'&&isGroupChatId(cid));
    if(single && Math.random()<PROBABILITY){
      try{if(typeof window.hideTypingIndicator==='function')hideTypingIndicator()}catch(e){}
      if(sendInvite(cid))return;
    }
    /* The original proactive path may call doAutoReply after a typing delay.
       Suppress the separate 2% ordinary-reply roll for that scheduled call. */
    window.__RL7_PF_PROACTIVE_PENDING__=true;
    setTimeout(function(){window.__RL7_PF_PROACTIVE_PENDING__=false},6500);
    return old.apply(this,arguments);
  }
  wrapped.__rl7pf69=1;
  window._doProactiveSend=wrapped;
  return true;
}

function boot(){
  installRenderer();
  installNormalReply();
  installProactive();
}
boot();
var tries=0,t=setInterval(function(){
  boot();
  if((installRenderer()&&installNormalReply()&&installProactive())||++tries>80)clearInterval(t);
},250);
})();
