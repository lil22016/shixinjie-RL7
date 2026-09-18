/* RL7 Cloud Repair v37 — permanent Settings row + correct MessageDB merge/apply */
(function(){'use strict';
const READY='__rl7_cloud_ready_v3';
function toast(s){try{if(window.Core&&Core.toast)return Core.toast(s)}catch(e){}}
function mergeMsgs(a,b){
 let out=[],seen=new Set();
 for(let m of [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])]){if(!m)continue;let k=m.id!=null?'id:'+m.id:'t:'+String(m.time||0)+':'+String(m.text||'')+':'+String(m.type||'');if(seen.has(k))continue;seen.add(k);out.push(m)}
 out.sort((x,y)=>(x.time||0)-(y.time||0)||String(x.id||'').localeCompare(String(y.id||'')));return out
}
async function reconcileMessages(){
 if(!window.MessageDB)return;
 let rows=await MessageDB.getAll();
 for(let r of rows){
   if(!r||!r.chatId||String(r.chatId).startsWith('__meta_')||!Array.isArray(r.messages))continue;
   let id=r.chatId,local=(window.Storage&&Storage._msgCache&&Storage._msgCache['msg_'+id])||[];
   let merged=mergeMsgs(local,r.messages);
   if(window.Storage){Storage._msgCache['msg_'+id]=merged;Storage._msgUpdatedAt['msg_'+id]=Date.now();try{Storage._scheduleMessagesMirror(id)}catch(e){}}
   await MessageDB.set(id,merged);
 }
 let page=document.getElementById('page-chat-room'),id=page&&page.dataset.chatId;
 if(id&&typeof window.renderChatMessages==='function')renderChatMessages(id);
}
function row(){
 let list=document.querySelectorAll('#page-settings .settings-list')[1];if(!list)return;
 let old=document.getElementById('rl7-cloud-settings-entry');
 if(!old){old=document.createElement('div');old.id='rl7-cloud-settings-entry';old.className='settings-item';list.appendChild(old)}
 let on=!!localStorage.getItem(READY);
 old.innerHTML='<div class="s-icon"><i class="fas fa-cloud"></i></div><div class="s-content"><div class="s-label">云端同步</div><div class="s-value" id="rl7-cloud-settings-state">'+(on?'同步开启 · 合并模式':'同步暂停 · 点击开启')+'</div></div><div style="font-size:.8rem;color:var(--text-lighter)">'+(on?'ON':'OFF')+'</div>';
 old.style.cssText='pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important;';
 old.onclick=async function(e){e.preventDefault();e.stopPropagation();let now=!!localStorage.getItem(READY);if(now){localStorage.removeItem(READY);window.RL7CloudSync?.disable?.();toast('云端同步已暂停')}else{localStorage.setItem(READY,'1');window.RL7CloudSync?.enable?.();await window.RL7CloudSync?.syncNow?.();setTimeout(reconcileMessages,700);toast('云端同步已开启')}row()}
}
async function afterSync(){try{await reconcileMessages()}catch(e){console.error('[v37 reconcile]',e)}}
function hook(){
 row();
 if(window.RL7CloudSync&&!window.RL7CloudSync.__v37){
   window.RL7CloudSync.__v37=1;
   let old=window.RL7CloudSync.syncNow;
   window.RL7CloudSync.syncNow=async function(){let r=await old.apply(this,arguments);await afterSync();return r}
 }
}
setTimeout(hook,400);setInterval(hook,1800);document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(afterSync,1000)});
window.RL7CloudRepair={reconcileMessages,refresh:hook};
})();