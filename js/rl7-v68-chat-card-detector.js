/* RL7 V68 — detect feature cards by rendered structure, not guessed class names. */
(function(){
'use strict';
if(window.__RL7_V68_CARD_DETECTOR__)return;
window.__RL7_V68_CARD_DETECTOR__=1;

function visible(el){
  if(!el || !el.getBoundingClientRect)return false;
  var r=el.getBoundingClientRect(), cs=getComputedStyle(el);
  return r.width>0 && r.height>0 && cs.display!=='none' && cs.visibility!=='hidden';
}
function alpha(bg){
  var m=String(bg||'').match(/rgba?\([^)]*(?:,\s*([\d.]+))\)$/);
  if(!m)return String(bg||'').indexOf('rgba')===0 ? 0 : 1;
  return m[1]==null?1:Number(m[1]);
}
function standard(body){
  return !!body.querySelector(
    '.message-bubble,.message-sticker-direct,.message-image,.redpacket-bubble,'+
    '.voice-bubble,.message-pat,.message-call,.message-black-notice,.message-punish,'+
    '.mail-announce-bubble,.recall-near'
  );
}
function semantic(el){
  var c=((el.className||'')+' '+(el.id||'')).toLowerCase();
  return /(game|recipe|invite|frequency|product|shop|gift|card)/.test(c);
}
function markRow(row){
  if(!row || row.classList.contains('rl7-card-checked'))return;
  row.classList.add('rl7-card-checked');
  var body=row.querySelector('.message-body');
  if(!body || !visible(body) || standard(body))return;

  var text=(body.innerText||body.textContent||'').trim();
  if(!text)return;
  var br=body.getBoundingClientRect();
  if(br.width<180 || br.height<48)return;

  var descendants=Array.from(body.querySelectorAll('div,section,article,a,button'));
  var sem=descendants.find(semantic);
  var arrow=body.querySelector(
    '.fa-chevron-right,.fa-angle-right,.fa-caret-right,[class*="chevron"],[class*="arrow"]'
  );

  /* Feature cards in this app are wide, non-standard chat payloads and normally
     contain a chevron/arrow. Semantic names are accepted when present. */
  if(!sem && !arrow)return;

  var target=sem;
  if(!target && arrow){
    var n=arrow;
    while(n && n!==body){
      var r=n.getBoundingClientRect();
      if(r.width>=Math.min(220,br.width*.72) && r.height>=48){target=n;break}
      n=n.parentElement;
    }
  }
  if(!target)target=body;

  /* If the selected semantic node is only a tiny inner piece, use message body. */
  var tr=target.getBoundingClientRect();
  if(tr.width<br.width*.55 || tr.height<48)target=body;

  target.classList.add('rl7-chat-feature-card');
}
function scan(root){
  var scope=root&&root.querySelectorAll?root:document;
  if(scope.matches && scope.matches('.message-row'))markRow(scope);
  scope.querySelectorAll && scope.querySelectorAll('#page-chat-room .message-row').forEach(markRow);
}
function boot(){
  scan(document);
  var timer=0;
  new MutationObserver(function(ms){
    clearTimeout(timer);
    timer=setTimeout(function(){
      ms.forEach(function(m){
        m.addedNodes&&m.addedNodes.forEach(function(n){
          if(n.nodeType===1)scan(n);
        });
      });
      /* rendering can replace innerHTML of an existing row */
      scan(document.getElementById('page-chat-room')||document);
    },35);
  }).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',function(){setTimeout(function(){scan(document)},80)},true);
  setInterval(function(){scan(document.getElementById('page-chat-room')||document)},1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();