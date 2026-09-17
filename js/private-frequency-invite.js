/* Private Frequency invitation — load AFTER chat.js and partner-freewill.js */
(function(){
'use strict';
var TARGET='https://lil22016.github.io/shixinjie-RL7/nyx-control.html';
var COPY=[
  "Come here. I found something more interesting than texting.",
  "I have an idea. You may regret accepting it.",
  "Let me have the controls for a while.",
  "Feeling brave, darling?",
  "I’m bored. Entertain me.",
  "You trust me with the controls, don’t you?"
];
function chatId(){
 try{var el=document.getElementById('page-chat-room');if(el&&el.dataset&&el.dataset.chatId)return String(el.dataset.chatId);}catch(e){}
 try{var ps=Storage.getPartnerProfiles?Storage.getPartnerProfiles():[];if(ps&&ps.length)return 'partner_'+ps[0].id;}catch(e){}
 return null;
}
window.openPrivateFrequencyInvite=function(){
 if(typeof window.openPrivateFrequency==='function'){window.openPrivateFrequency();return;}
 if(navigator.bluetooth){location.href=TARGET;return;}
 var ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 location.href=ios?'bluefy://open?url='+encodeURIComponent(TARGET):TARGET;
};
window.sendPrivateFrequencyInvite=function(){
 var cid=chatId(); if(!cid||!window.Storage)return false;
 var text=COPY[Math.floor(Math.random()*COPY.length)];
 var msgs=Storage.getMessages(cid)||[];
 var m={id:Date.now()+Math.floor(Math.random()*99),type:'other',text:text,time:Date.now(),msgType:'privateFrequencyInvite'};
 msgs.push(m);Storage.setMessages(cid,msgs);
 if(typeof updateLastMsg==='function')updateLastMsg(cid,'[Private Frequency] '+text);
 if(typeof renderChatMessages==='function')try{renderChatMessages(cid,{preserveScroll:true});}catch(e){}
 return true;
};
/* low-frequency autonomous invitation: roughly once every 8–16h check window, and only 18% when due */
function schedule(){
 var key='rl7_private_frequency_next_invite',now=Date.now(),next=+(localStorage.getItem(key)||0);
 if(!next){localStorage.setItem(key,String(now+(8+Math.random()*8)*3600000));return;}
 if(now<next)return;
 localStorage.setItem(key,String(now+(8+Math.random()*8)*3600000));
 if(Math.random()<.18)window.sendPrivateFrequencyInvite();
}
setTimeout(schedule,5000);setInterval(schedule,10*60*1000);
document.addEventListener('visibilitychange',function(){if(!document.hidden)schedule();});

/* Add renderer without rewriting chat.js: wrap its normal-message builder. */
var old=window._buildNormalMessageHtml;
if(typeof old==='function'){
 window._buildNormalMessageHtml=function(msg,isSelf,selfAvatar,otherAvatar,suffix,senderName,senderStatus,rowGroupCls){
  if(msg&&msg.msgType==='privateFrequencyInvite'){
   var sender=senderName?'<div class="message-sender-name">'+Core.escapeHtml(senderName)+(senderStatus||'')+'</div>':'';
   return '<div class="message-row other'+(rowGroupCls||'')+'" data-msg-id="'+msg.id+'">'+otherAvatar+
    '<div class="message-body">'+sender+
    '<div class="pf-invite-card" onclick="openPrivateFrequencyInvite()">'+
    '<div class="pf-invite-kicker">PRIVATE FREQUENCY</div>'+
    '<div class="pf-invite-title">Loki wants the controls.</div>'+
    '<div class="pf-invite-copy">'+Core.escapeHtml(msg.text||'Come here.')+'</div>'+
    '<div class="pf-invite-foot"><span>NYX CONTROL</span><span>ENTER ›</span></div></div>'+
    (suffix||'')+'<div class="message-meta"><div class="message-time">'+Core.formatTime(msg.time)+'</div></div></div></div>';
  }
  return old.apply(this,arguments);
 };
}
})();