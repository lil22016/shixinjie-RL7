/* RL7 v35 — mobile-safe cloud control: no modal required */
(function(){'use strict';
const READY='__rl7_cloud_ready_v3';
function toast(s){if(window.Core&&Core.toast){Core.toast(s);return}let x=document.createElement('div');x.className='rl7-cloud-toast';x.textContent=s;document.body.appendChild(x);setTimeout(()=>x.remove(),2200)}
function render(){
 let row=document.getElementById('rl7-cloud-settings-entry');if(!row)return;
 let on=!!localStorage.getItem(READY);
 row.innerHTML='<div class="s-icon"><i class="fas fa-cloud"></i></div><div class="s-content"><div class="s-label">云端同步</div><div class="s-value" id="rl7-cloud-settings-state">'+(on?'同步开启 · 点击暂停':'同步暂停 · 点击开启')+'</div></div><div id="rl7-cloud-switch" style="width:44px;height:26px;border-radius:14px;padding:3px;box-sizing:border-box;background:'+(on?'var(--primary,#7eb6d8)':'rgba(120,120,130,.22)')+';transition:.2s"><div style="width:20px;height:20px;border-radius:50%;background:white;box-shadow:0 1px 4px rgba(0,0,0,.18);transform:'+(on?'translateX(18px)':'translateX(0)')+';transition:.2s"></div></div>';
 row.style.pointerEvents='auto';row.style.touchAction='manipulation';row.style.cursor='pointer';
 row.onclick=function(e){e.preventDefault();e.stopPropagation();toggle()};
}
function toggle(){
 let on=!!localStorage.getItem(READY);
 if(on){
   localStorage.removeItem(READY);
   if(window.RL7CloudSync&&RL7CloudSync.disable)RL7CloudSync.disable();
   toast('云端同步已暂停');
 }else{
   localStorage.setItem(READY,'1');
   if(window.RL7CloudSync&&RL7CloudSync.enable)RL7CloudSync.enable();
   if(window.RL7CloudSync&&RL7CloudSync.syncNow)setTimeout(()=>RL7CloudSync.syncNow(),150);
   toast('云端同步已开启');
 }
 render();
}
function install(){
 let row=document.getElementById('rl7-cloud-settings-entry');
 if(!row){setTimeout(install,300);return}
 /* Replace the entire node once. This removes v30/v34's conflicting mobile handlers. */
 let fresh=row.cloneNode(false);row.replaceWith(fresh);fresh.id='rl7-cloud-settings-entry';fresh.className='settings-item';
 render();
}
window.RL7CloudToggle=toggle;
setTimeout(install,600);
})();