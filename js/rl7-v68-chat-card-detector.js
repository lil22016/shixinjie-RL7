/* RL7 V71 — persistent feature-card detector.
   Re-evaluates existing/history rows AND newly rendered rows.
   A feature card is a non-standard chat payload: message-body without a normal
   text/image/sticker/etc bubble. This is safer than guessing feature class names. */
(function(){
'use strict';
if(window.__RL7_V71_CARD_DETECTOR__)return;
window.__RL7_V71_CARD_DETECTOR__=1;

var STANDARD=[
 '.message-bubble','.message-sticker-direct','.message-image','.redpacket-bubble',
 '.voice-bubble','.message-pat','.message-call','.message-black-notice',
 '.message-punish','.mail-announce-bubble','.recall-near',
 '.rl7-private-frequency-card'
].join(',');

function visible(el){
 if(!el||!el.getBoundingClientRect)return false;
 var r=el.getBoundingClientRect(),s=getComputedStyle(el);
 return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';
}
function mark(row){
 if(!row||!visible(row))return;
 var body=row.querySelector('.message-body');
 if(!body||!visible(body))return;
 /* normal messages must stay untouched */
 if(body.querySelector(STANDARD))return;

 var text=(body.innerText||body.textContent||'').trim();
 var r=body.getBoundingClientRect();
 if(!text||r.width<170||r.height<46)return;

 /* These non-standard payloads are the game/recipe/shop/invite-style cards.
    Mark the full message body so old persisted messages receive the same CSS. */
 body.classList.add('rl7-chat-feature-card');

 /* If the payload has one wide inner card, mark it too so an inner transparent
    background cannot visually punch through the body surface. */
 var kids=Array.from(body.children||[]);
 kids.forEach(function(k){
   if(!visible(k))return;
   var kr=k.getBoundingClientRect();
   if(kr.width>=r.width*.62&&kr.height>=42)k.classList.add('rl7-chat-feature-card-inner');
 });
}
function scan(root){
 var scope=root&&root.querySelectorAll?root:document;
 if(scope.matches&&scope.matches('.message-row'))mark(scope);
 scope.querySelectorAll&&scope.querySelectorAll('#page-chat-room .message-row').forEach(mark);
}
function boot(){
 scan(document);
 new MutationObserver(function(ms){
   ms.forEach(function(m){
     if(m.target&&m.target.closest){
       var row=m.target.closest('.message-row'); if(row)mark(row);
     }
     (m.addedNodes||[]).forEach(function(n){if(n.nodeType===1)scan(n)});
   });
 }).observe(document.body,{childList:true,subtree:true,characterData:true});
 document.addEventListener('click',function(){setTimeout(function(){scan(document)},50)},true);
 /* Covers history reload / innerHTML replacement / page re-entry. */
 setInterval(function(){scan(document)},700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();