/* RL7 V84 — final renderer owner for PF + game cards.
   No MutationObserver. No DOM scan. No live DOM replacement.
   It also carries prior wrapper markers so V69/V75 retry installers cannot wrap over it later. */
(function(){
'use strict';
if(window.__RL7_V84_CARD_RENDER__) return;
window.__RL7_V84_CARD_RENDER__=1;

var GAME_HINT=/\b2048\b|羊了个羊|连连看|消消乐|抓大鹅|记忆翻牌|memory|let'?s see if you can beat me|play with me|beat me|game invite|游戏邀请|挑战/i;

function esc(s){
 try{return window.Core&&Core.escapeHtml?Core.escapeHtml(String(s==null?'':s)):String(s==null?'':s)}
 catch(e){return String(s==null?'':s)}
}
function stripHtml(s){
 var d=document.createElement('div'); d.innerHTML=s||''; return (d.textContent||d.innerText||'').replace(/\s+/g,' ').trim();
}
function pfHtml(msg,isSelf,selfAvatarHtml,otherAvatarHtml,suffixHtml,senderName,senderStatusHtml,rowGroupCls){
 var line=(msg.privateFrequency&&msg.privateFrequency.line)||msg.text||'Private Frequency.';
 var sender=senderName?'<div class="message-sender-name">'+esc(senderName)+(senderStatusHtml||'')+'</div>':'';
 return '<div class="message-row '+(isSelf?'self':'other'+(rowGroupCls||''))+' rl7-pf-row-v84" data-msg-id="'+msg.id+'">'
   +(isSelf?selfAvatarHtml:otherAvatarHtml)
   +'<div class="message-body">'+sender
   +'<button type="button" class="rl7-private-frequency-card rl7-pf-card-v84" onclick="RL7OpenPrivateFrequencyInvite()">'
   /* exact same icon class + FA icon used by the home-screen PF tile */
   +'<span class="home-feature-icon rl7-pf-home-icon-v84"><i class="fas fa-wave-square"></i></span>'
   +'<span class="rl7-pf-copy"><strong>Private Frequency</strong><span>'+esc(line)+'</span></span>'
   +'<i class="fas fa-chevron-right rl7-pf-arrow"></i>'
   +'</button>'
   +(suffixHtml||'')
   +'<div class="message-meta"><div class="message-time">'+(window.Core&&Core.formatTime?Core.formatTime(msg.time):'')+'</div></div>'
   +'</div></div>';
}
function install(){
 if(typeof window._buildNormalMessageHtml!=='function') return false;
 if(window._buildNormalMessageHtml.__rl7v84) return true;
 var old=window._buildNormalMessageHtml;
 function wrapped(msg,isSelf,selfAvatarHtml,otherAvatarHtml,suffixHtml,senderName,senderStatusHtml,rowGroupCls){
   if(msg&&msg.msgType==='private_frequency'){
     return pfHtml(msg,isSelf,selfAvatarHtml,otherAvatarHtml,suffixHtml,senderName,senderStatusHtml,rowGroupCls);
   }
   var html=old.apply(this,arguments);
   if(!msg||!html) return html;
   /* Detect games from the ACTUAL rendered card text, matching V75's successful detection method. */
   if(GAME_HINT.test(stripHtml(html))){
     html=html.replace(/class="message-row ([^"]*)"/,'class="message-row $1 rl7-game-row-v84"');
     html=html.replace(/class="message-bubble([^"]*)"/,'class="message-bubble$1 rl7-game-card-v84"');
   }
   return html;
 }
 /* Critical: V69 and V75 have retry installers. These markers stop them from
    installing another outer wrapper after V84 and bypassing these changes. */
 wrapped.__rl7v84=1;
 wrapped.__rl7pf69=1;
 wrapped.__rl7v75=1;
 wrapped.__rl7v83=1;
 window._buildNormalMessageHtml=wrapped;
 return true;
}
if(!install()){
 var n=0,t=setInterval(function(){if(install()||++n>80)clearInterval(t)},250);
}
})();
