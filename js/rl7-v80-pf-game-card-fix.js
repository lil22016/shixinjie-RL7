/* RL7 V80C — direct DOM repair, independent of renderer wrapper order. */
(function(){'use strict';
function homeIcon(){
 var src=document.querySelector('.home-feature-item[onclick*="openPrivateFrequency"] .home-feature-icon');
 if(!src)return null;
 var clone=src.cloneNode(true); clone.removeAttribute('class'); clone.className='rl7-pf-home-icon-exact';
 return clone;
}
function fixPF(row){
 if(!row||!row.querySelector)return;
 var card=row.querySelector('.rl7-private-frequency-card'); if(!card)return;
 row.classList.add('rl7-pf-row');
 var old=card.querySelector('.rl7-pf-icon,.rl7-pf-home-icon,.rl7-pf-home-icon-exact');
 var icon=homeIcon();
 if(icon){ if(old)old.replaceWith(icon); else card.insertBefore(icon,card.firstChild); }
 card.classList.add('rl7-pf-game-card');
}
function fixGame(row){
 if(!row||!row.querySelector)return;
 var body=row.querySelector(':scope > .message-body')||row.querySelector('.message-body'); if(!body)return;
 var text=(body.innerText||body.textContent||'').replace(/\s+/g,' ').trim();
 if(!(/\b2048\b|羊了个羊|连连看|消消乐|抓大鹅|记忆翻牌|memory|play with me|beat me|game invite|游戏邀请|挑战/i.test(text)))return;
 row.classList.add('rl7-game-invite-row','rl7-game-v80c');
 body.classList.remove('rl7-game-invite-shell','rl7-feature-card-shell');
 var card=body.querySelector('.message-bubble,.rl7-game-invite-card,[class*="game"][class*="card"],[class*="invite"][class*="card"]');
 if(card)card.classList.add('rl7-game-card-v80c');
}
function scan(root){
 var s=root&&root.querySelectorAll?root:document;
 if(s.matches&&s.matches('#page-chat-room .message-row')){fixPF(s);fixGame(s)}
 if(s.querySelectorAll)s.querySelectorAll('#page-chat-room .message-row').forEach(function(r){fixPF(r);fixGame(r)});
}
function boot(){scan(document);new MutationObserver(function(ms){ms.forEach(function(m){if(m.target&&m.target.closest){var r=m.target.closest('#page-chat-room .message-row');if(r){fixPF(r);fixGame(r)}}(m.addedNodes||[]).forEach(function(n){if(n.nodeType===1)scan(n)})})}).observe(document.body,{childList:true,subtree:true,characterData:true});setInterval(function(){scan(document)},1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();