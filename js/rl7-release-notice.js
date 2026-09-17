/* RL7 release notice — deterministic once-per-release popup */
(function(){
'use strict';
var RELEASE='20260916-v6';
var KEY='rl7_last_shown_release_v1';
function show(){
  var old=document.getElementById('rl7-release-overlay'); if(old)old.remove();
  var ov=document.createElement('div'); ov.id='rl7-release-overlay';
  ov.innerHTML='<div class="rl7-update-card"><div class="rl7-update-title">已更新</div><div class="rl7-update-copy">RL7 has been updated to the latest version.</div><div class="rl7-update-actions"><button id="rl7-release-ok">OK</button></div></div>';
  document.body.appendChild(ov);
  document.getElementById('rl7-release-ok').onclick=function(){ov.remove()};
}
function boot(){
  var old='';
  try{old=localStorage.getItem(KEY)||''}catch(e){}
  if(old===RELEASE)return;
  try{localStorage.setItem(KEY,RELEASE)}catch(e){}
  setTimeout(show,700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();