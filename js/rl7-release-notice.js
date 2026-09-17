/* RL7 release notice + home safe-layout v8 */
(function(){
'use strict';
var RELEASE='20260917-v8';
var KEY='rl7_last_shown_release_v1';

function installHomeLayoutFix(){
  if(document.getElementById('rl7-home-layout-v8')) return;
  var s=document.createElement('style');
  s.id='rl7-home-layout-v8';
  s.textContent=`
    /* Do not pin the app grid to the bottom: long English quote/message may grow safely. */
    #page-home.page.active{
      overflow-y:auto !important;
      overflow-x:hidden !important;
      -webkit-overflow-scrolling:touch;
      padding-bottom:calc(96px + var(--safe-bottom, 0px)) !important;
    }
    #page-home #app-swipe-wrapper.home-widgets-wrap{
      margin-top:0 !important;
      padding-top:24px !important;
      padding-bottom:34px !important;
      flex:0 0 auto !important;
      overflow:visible !important;
    }
    #page-home .home-core-row,
    #page-home .home-feature-grid{
      overflow:visible !important;
    }
    #page-home .home-feature-grid{
      position:relative !important;
      z-index:8 !important;
      row-gap:24px !important;
      padding-bottom:12px !important;
    }
    #page-home .home-feature-item,
    #page-home .home-feature-label{
      position:relative !important;
      z-index:9 !important;
      overflow:visible !important;
    }
    #page-home .home-feature-label{
      min-height:12px !important;
      display:block !important;
    }
    #page-home .bottom-nav{z-index:1000 !important;}
  `;
  document.head.appendChild(s);
}

function show(){
  var old=document.getElementById('rl7-release-overlay'); if(old)old.remove();
  var ov=document.createElement('div'); ov.id='rl7-release-overlay';
  ov.innerHTML='<div class="rl7-update-card"><div class="rl7-update-title">Updated</div><div class="rl7-update-copy">Tarot / Lenormand and home layout have been updated.</div><div class="rl7-update-actions"><button id="rl7-release-ok">OK</button></div></div>';
  document.body.appendChild(ov);
  document.getElementById('rl7-release-ok').onclick=function(){ov.remove()};
}
function boot(){
  installHomeLayoutFix();
  var old='';
  try{old=localStorage.getItem(KEY)||''}catch(e){}
  if(old===RELEASE)return;
  /* Mark as seen only after the popup is actually shown. */
  setTimeout(function(){
    show();
    try{localStorage.setItem(KEY,RELEASE)}catch(e){}
  },700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
