/* RL7 v34 — cloud settings click fix + safe per-device enable */
(function(){'use strict';
function toast(s){if(window.Core&&Core.toast)return Core.toast(s);let x=document.createElement('div');x.className='rl7-cloud-toast';x.textContent=s;document.body.appendChild(x);setTimeout(()=>x.remove(),2200)}
function openCloud(e){if(e){e.preventDefault();e.stopPropagation()}if(window.RL7CloudSync&&typeof RL7CloudSync.open==='function'){RL7CloudSync.open();return}toast('云端同步模块还没有加载，请重新打开页面')}
function repair(){
 let list=document.querySelectorAll('#page-settings .settings-list')[1];if(!list)return;
 let old=document.getElementById('rl7-cloud-settings-entry');
 if(old){let clone=old.cloneNode(true);old.replaceWith(clone);old=clone}
 else{let sep=document.createElement('div');sep.className='list-divider';list.appendChild(sep);old=document.createElement('div');old.className='settings-item';old.id='rl7-cloud-settings-entry';list.appendChild(old)}
 old.innerHTML='<div class="s-icon"><i class="fas fa-cloud"></i></div><div class="s-content"><div class="s-label">云端同步</div><div class="s-value" id="rl7-cloud-settings-state">'+(localStorage.getItem('__rl7_cloud_ready_v3')?'同步开启':'同步暂停')+'</div></div><i class="fas fa-chevron-right s-arrow"></i>';
 old.style.pointerEvents='auto';old.style.cursor='pointer';old.removeAttribute('onclick');
 old.addEventListener('click',openCloud,true);old.addEventListener('touchend',openCloud,{capture:true,passive:false});
}
window.openRL7CloudSettings=openCloud;
setTimeout(repair,300);setInterval(repair,2500);
})();