/* RL7 V80B — PF uses the exact home-screen icon DOM; rich-card timestamps stay outside. */
(function(){'use strict';if(window.__RL7_V80B_PF_CARD__)return;window.__RL7_V80B_PF_CARD__=1;
function esc(s){try{return Core&&Core.escapeHtml?Core.escapeHtml(String(s)):String(s)}catch(e){return String(s)}}
function homePFIconHTML(){
 var el=document.querySelector('.home-feature-item[onclick*="openPrivateFrequency"] .home-feature-icon');
 if(el)return '<span class="rl7-pf-home-icon">'+el.innerHTML+'</span>';
 return '<span class="rl7-pf-home-icon"><i class="fas fa-wave-square"></i></span>';
}
function install(){if(typeof window._buildNormalMessageHtml!=='function')return false;if(window._buildNormalMessageHtml.__rl7v80bpf)return true;var old=window._buildNormalMessageHtml;
 function wrapped(msg,isSelf,selfAvatarHtml,otherAvatarHtml,suffixHtml,senderName,senderStatusHtml,rowGroupCls){
  if(msg&&msg.msgType==='private_frequency'){
   var line=(msg.privateFrequency&&msg.privateFrequency.line)||msg.text||'A private channel. Just you and me.';
   var senderHtml=senderName?'<div class="message-sender-name">'+esc(senderName)+(senderStatusHtml||'')+'</div>':'';
   return '<div class="message-row '+(isSelf?'self':'other'+(rowGroupCls||''))+' rl7-pf-row" data-msg-id="'+msg.id+'">'+(isSelf?selfAvatarHtml:otherAvatarHtml)+'<div class="message-body">'+senderHtml+'<button type="button" class="rl7-private-frequency-card rl7-pf-game-card" onclick="RL7OpenPrivateFrequencyInvite()">'+homePFIconHTML()+'<span class="rl7-pf-copy"><strong>Private Frequency</strong><span>'+esc(line)+'</span></span><i class="fas fa-chevron-right rl7-pf-arrow"></i></button>'+(suffixHtml||'')+'<div class="message-meta"><div class="message-time">'+(window.Core&&Core.formatTime?Core.formatTime(msg.time):'')+'</div></div></div></div>';
  } return old.apply(this,arguments);
 } wrapped.__rl7v80bpf=1;window._buildNormalMessageHtml=wrapped;return true}
function norm(row){if(!row||!row.classList.contains('rl7-game-invite-row'))return;var body=row.querySelector(':scope > .message-body')||row.querySelector('.message-body');if(!body)return;body.classList.remove('rl7-game-invite-shell');var card=body.querySelector('.rl7-game-invite-card,.message-bubble,[class*="game"][class*="card"],[class*="invite"][class*="card"]');if(card)card.classList.add('rl7-game-card-v80')}
function scan(r){var s=r&&r.querySelectorAll?r:document;if(s.matches&&s.matches('.rl7-game-invite-row'))norm(s);s.querySelectorAll&&s.querySelectorAll('.rl7-game-invite-row').forEach(norm)}
function boot(){install();scan(document);var n=0,t=setInterval(function(){install();scan(document);if(++n>40)clearInterval(t)},250);new MutationObserver(function(ms){ms.forEach(function(m){(m.addedNodes||[]).forEach(function(n){if(n.nodeType===1)scan(n)})})}).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();})();