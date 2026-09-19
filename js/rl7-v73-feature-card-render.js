/* RL7 V73 — deterministic feature-card shell tagging.
   This replaces the old size-based V72 detector. It styles the actual message-body
   when a chat row contains a non-native rich card, so cards with no stable class
   (including game invitations) cannot remain visually transparent. */
(function(){'use strict';
if(window.__RL7_V73_CARD_RENDER__)return;window.__RL7_V73_CARD_RENDER__=1;
var NATIVE=[
 '.message-bubble','.message-sticker-direct','.message-image','.redpacket-bubble','.voice-bubble',
 '.message-pat','.message-call','.message-black-notice','.message-punish','.mail-announce-bubble',
 '.recall-near','.rl7-private-frequency-card','.decision-card','.forward-bubble','.gift-bubble'
].join(',');
var FEATURE_HINT=/2048|连连看|羊了个羊|大鹅|记忆|memory|game|recipe|private frequency|nyx|shop|product|invite|邀请|挑战|beat me/i;
function clean(row){
 if(!row||!row.querySelector)return;
 var body=row.querySelector(':scope > .message-body')||row.querySelector('.message-body');
 if(!body)return;
 body.classList.remove('rl7-feature-card-shell');
 if(body.querySelector(NATIVE))return;
 var text=(body.innerText||body.textContent||'').replace(/\s+/g,' ').trim();
 if(!text)return;
 var children=Array.from(body.children||[]).filter(function(n){return !n.classList.contains('message-meta')&&!n.classList.contains('message-tags-row')&&!n.classList.contains('message-sender-name')});
 var explicit=body.querySelector('[class*="game"],[class*="invite"],[class*="recipe"],[class*="shop"],[class*="product"],[class*="frequency"],[data-game],[data-game-id],[data-card],[data-type*="game"]');
 var visual=body.querySelector('img,svg,[class*="icon"]');
 if(explicit||FEATURE_HINT.test(text)||(children.length>=2&&visual))body.classList.add('rl7-feature-card-shell');
}
function scan(root){
 var r=root&&root.querySelectorAll?root:document;
 if(r.matches&&r.matches('#page-chat-room .message-row'))clean(r);
 r.querySelectorAll&&r.querySelectorAll('#page-chat-room .message-row').forEach(clean);
}
function boot(){
 scan(document);
 new MutationObserver(function(ms){ms.forEach(function(m){var row=m.target&&m.target.closest&&m.target.closest('#page-chat-room .message-row');if(row)clean(row);(m.addedNodes||[]).forEach(function(n){if(n.nodeType===1)scan(n)})})}).observe(document.body,{childList:true,subtree:true,characterData:true});
 document.addEventListener('click',function(e){var row=e.target&&e.target.closest&&e.target.closest('#page-chat-room .message-row');if(row)setTimeout(function(){clean(row)},0)},true);
 setInterval(function(){scan(document)},1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
