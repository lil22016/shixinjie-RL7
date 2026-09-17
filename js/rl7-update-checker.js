/* RL7 update checker — restores in-app update prompt */
(function(){
'use strict';
if(!('serviceWorker' in navigator)) return;
var prompted=false;
function promptUpdate(reg){
  if(prompted)return; prompted=true;
  var old=document.getElementById('rl7-update-overlay'); if(old)old.remove();
  var ov=document.createElement('div'); ov.id='rl7-update-overlay';
  ov.innerHTML='<div class="rl7-update-card"><div class="rl7-update-title">Update available</div><div class="rl7-update-copy">A new version of RL7 is ready.</div><div class="rl7-update-actions"><button id="rl7-update-later">Later</button><button id="rl7-update-now">Update</button></div></div>';
  document.body.appendChild(ov);
  document.getElementById('rl7-update-later').onclick=function(){ov.remove();prompted=false};
  document.getElementById('rl7-update-now').onclick=function(){
    var w=reg.waiting;
    if(w) w.postMessage({type:'SKIP_WAITING'});
    else location.reload();
  };
}
window.addEventListener('load',function(){
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(function(reg){
    if(reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg);
    reg.addEventListener('updatefound',function(){
      var w=reg.installing;if(!w)return;
      w.addEventListener('statechange',function(){
        if(w.state==='installed' && navigator.serviceWorker.controller) promptUpdate(reg);
      });
    });
    /* Force a network update check on each fresh app launch. */
    reg.update().catch(function(){});
  }).catch(function(){});
});
var refreshing=false;
navigator.serviceWorker.addEventListener('controllerchange',function(){
  if(refreshing)return; refreshing=true; location.reload();
});
})();