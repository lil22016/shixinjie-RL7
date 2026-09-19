/* RL7 v62 — authoritative mobile keyboard layout; removes conflicting v52/v53/v55/v61 chat sizing */
(function(){
'use strict';
if(window.__RL7_V62__)return;window.__RL7_V62__=1;

function install(){
  /* Remove runtime styles from older keyboard experiments where possible. */
  var old55=document.getElementById('rl7-v55-style'); if(old55) old55.remove();
  var old61=document.getElementById('rl7-v61-style'); if(old61) old61.remove();

  var s=document.createElement('style');s.id='rl7-v62-style';
  s.textContent=`
#page-chat-room.page-fullscreen.active{
 position:fixed!important;
 left:0!important;right:auto!important;
 top:var(--v62-top,0px)!important;bottom:auto!important;
 width:100vw!important;
 height:var(--v62-h,100dvh)!important;
 min-height:0!important;max-height:none!important;
 margin:0!important;padding:0!important;
 display:flex!important;flex-direction:column!important;
 overflow:hidden!important;z-index:10000!important;
}
#page-chat-room .chat-messages{
 flex:1 1 auto!important;
 min-height:0!important;
 overflow-y:auto!important;
}
#page-chat-room .chat-input-zone{
 position:relative!important;
 flex:0 0 auto!important;
 bottom:auto!important;
 transform:none!important;
 z-index:40!important;
}
`;
  document.head.appendChild(s);
}
function sync(){
 var p=document.getElementById('page-chat-room'),vv=window.visualViewport;
 if(!p||!p.classList.contains('active'))return;
 var h=vv&&vv.height?vv.height:window.innerHeight;
 var top=vv?vv.offsetTop||0:0;
 document.documentElement.style.setProperty('--v62-h',Math.round(h)+'px');
 document.documentElement.style.setProperty('--v62-top',Math.max(0,Math.round(top))+'px');
 if(document.activeElement&&document.activeElement.id==='chat-input'){
   var zone=p.querySelector('.chat-input-zone');
   if(zone) requestAnimationFrame(function(){zone.scrollIntoView({block:'end',behavior:'auto'});});
 }
}
install();
if(window.visualViewport){
 visualViewport.addEventListener('resize',sync,{passive:true});
 visualViewport.addEventListener('scroll',sync,{passive:true});
}
window.addEventListener('resize',sync,{passive:true});
document.addEventListener('focusin',function(e){if(e.target&&e.target.id==='chat-input'){setTimeout(sync,20);setTimeout(sync,180);setTimeout(sync,450)}},true);
document.addEventListener('focusout',function(e){if(e.target&&e.target.id==='chat-input')setTimeout(sync,180)},true);
document.addEventListener('DOMContentLoaded',sync);
setTimeout(sync,0);
})();
