/* RL7 release notice + home stacking fix v9 */
(function(){
'use strict';
var RELEASE='20260917-v9';
var KEY='rl7_last_shown_release_v1';

function installFix(){
  if(document.getElementById('rl7-home-layer-v9')) return;
  var s=document.createElement('style');
  s.id='rl7-home-layer-v9';
  s.textContent=`
    /* Restore original home app Y-position. Only stacking is changed. */
    #page-home #app-swipe-wrapper.home-widgets-wrap{
      margin-top:auto !important;
      padding:14px 18px 32px !important;
      overflow:visible !important;
      position:relative !important;
      z-index:40 !important;
    }
    #page-home .home-core-row,
    #page-home .home-feature-grid{
      overflow:visible !important;
      position:relative !important;
      z-index:41 !important;
    }
    #page-home .home-feature-item{
      position:relative !important;
      z-index:42 !important;
      overflow:visible !important;
    }
    #page-home .home-feature-label{
      position:relative !important;
      z-index:43 !important;
      overflow:visible !important;
      display:block !important;
    }

    /* Release popup must be a real fixed modal and must never affect home layout. */
    #rl7-release-overlay{
      position:fixed !important;
      inset:0 !important;
      z-index:99999 !important;
      display:flex !important;
      align-items:center !important;
      justify-content:center !important;
      padding:24px !important;
      box-sizing:border-box !important;
      background:rgba(20,20,30,.38) !important;
      backdrop-filter:blur(8px) !important;
      -webkit-backdrop-filter:blur(8px) !important;
    }
    #rl7-release-overlay .rl7-update-card{
      position:relative !important;
      width:min(86vw,360px) !important;
      max-height:70vh !important;
      overflow:auto !important;
      margin:0 !important;
      transform:none !important;
      box-sizing:border-box !important;
    }
  `;
  document.head.appendChild(s);
}

function show(){
  var old=document.getElementById('rl7-release-overlay'); if(old)old.remove();
  var ov=document.createElement('div'); ov.id='rl7-release-overlay';
  ov.innerHTML='<div class="rl7-update-card"><div class="rl7-update-title">Updated</div><div class="rl7-update-copy">Home layout layer has been corrected.</div><div class="rl7-update-actions"><button id="rl7-release-ok">OK</button></div></div>';
  document.body.appendChild(ov);
  document.getElementById('rl7-release-ok').onclick=function(){ov.remove()};
}
function boot(){
  installFix();
  var old='';
  try{old=localStorage.getItem(KEY)||''}catch(e){}
  if(old===RELEASE)return;
  setTimeout(function(){
    show();
    try{localStorage.setItem(KEY,RELEASE)}catch(e){}
  },700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
