/* RL7 v61 — top canvas + chat keyboard repair */
(function(){
'use strict';
if(window.__RL7_V61__) return; window.__RL7_V61__=1;

var st=document.createElement('style');
st.id='rl7-v61-style';
st.textContent=`
/* Keep the document/root transparent and full-bleed. Do not move page content. */
html,body{margin:0!important;min-height:100%!important}
html.liquid-theme,html.liquid-theme body{background:transparent!important}
html.liquid-theme body>#app,
html.liquid-theme .phone-frame{background:transparent!important}

/* Normal pages: safe area belongs to content, never to the wallpaper geometry. */
html.liquid-theme .page{background:transparent!important}

/* v53 hard-coded 100dvh prevented the visualViewport-driven chat height from winning.
   v61 makes --chat-h the single authoritative chat height. */
html.rl7-chat-v53 #page-chat-room.page-fullscreen.active,
html.rl7-v55-kbd #page-chat-room.page-fullscreen.active,
#page-chat-room.page-fullscreen.active{
  position:fixed!important;
  left:0!important;right:0!important;
  top:var(--rl7-v61-chat-top,0px)!important;
  bottom:auto!important;
  width:100vw!important;
  height:var(--rl7-v61-chat-h,100dvh)!important;
  min-height:0!important;
  max-height:none!important;
  margin:0!important;
  padding:0!important;
  overflow:hidden!important;
  display:flex!important;
  flex-direction:column!important;
}
#page-chat-room .chat-input-zone{
  position:relative!important;
  flex:0 0 auto!important;
  z-index:40!important;
}
`;
document.head.appendChild(st);

function syncChatViewport(){
  var p=document.getElementById('page-chat-room');
  var vv=window.visualViewport;
  if(!p||!vv||!p.classList.contains('active')) return;
  var h=Math.round(vv.height||window.innerHeight);
  var top=Math.max(0,Math.round(vv.offsetTop||0));
  document.documentElement.style.setProperty('--rl7-v61-chat-h',h+'px');
  document.documentElement.style.setProperty('--rl7-v61-chat-top',top+'px');
  var input=document.getElementById('chat-input');
  if(input && document.activeElement===input){
    requestAnimationFrame(function(){
      var zone=p.querySelector('.chat-input-zone');
      if(zone) zone.scrollIntoView({block:'end',inline:'nearest',behavior:'auto'});
    });
  }
}
function resetIfClosed(){
  var p=document.getElementById('page-chat-room');
  if(!p||!p.classList.contains('active')){
    document.documentElement.style.removeProperty('--rl7-v61-chat-h');
    document.documentElement.style.removeProperty('--rl7-v61-chat-top');
  }
}
if(window.visualViewport){
  visualViewport.addEventListener('resize',syncChatViewport,{passive:true});
  visualViewport.addEventListener('scroll',syncChatViewport,{passive:true});
}
window.addEventListener('resize',syncChatViewport,{passive:true});
document.addEventListener('focusin',function(e){
  if(e.target && (e.target.id==='chat-input'||e.target.closest&&e.target.closest('#page-chat-room .chat-input-zone'))){
    setTimeout(syncChatViewport,0);setTimeout(syncChatViewport,80);setTimeout(syncChatViewport,250);
  }
},true);
document.addEventListener('focusout',function(){setTimeout(function(){syncChatViewport();resetIfClosed()},120)},true);
new MutationObserver(function(){syncChatViewport();resetIfClosed()}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});
setTimeout(syncChatViewport,0);
})();
