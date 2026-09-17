/* RL7 v3 — home/call fixes + NYX card library */
(function(){
'use strict';
const K='rl7_nyx_cards_v1';
const buckets=[
 ['0-10','0–10%'],['11-25','11–25%'],['26-50','26–50%'],['51-75','51–75%'],['76-99','76–99%'],['100','100%'],
 ['success-up','Request success · stronger'],['success-down','Request success · weaker'],['success-stop','Request success · stop'],
 ['fail-up','Request refused · stronger'],['fail-down','Request refused · weaker'],['fail-stop','Request refused · stop']
];
const defaults={
 '0-10':["Easy. I barely started.","That little? You’re being cautious."],
 '11-25':["There you are. Paying attention now?","Still comfortable? How disappointing."],
 '26-50':["Mm. That got your attention.","Don't look at me like that. You agreed to this."],
 '51-75':["Getting difficult to ignore me, isn't it?","Good. Stay right there."],
 '76-99':["Now we're getting somewhere.","Careful, darling. I might decide I like this setting."],
 '100':["There. No more pretending you can ignore me.","One hundred. Brave choice."],
 'success-up':["Greedy thing. I’ll allow it.","You wanted more. Don't complain now."],
 'success-down':["Fine. Catch your breath.","I suppose I can be merciful. Briefly."],
 'success-stop':["Fine. We're done—for now.","Mercy granted. Don't get used to it."],
 'fail-up':["No. You don't get to rush me.","Impatient. I noticed."],
 'fail-down':["Not yet.","Trying to escape my settings? Adorable."],
 'fail-stop':["Nice try. I'm not finished.","You said stop. I heard you."]
};
function load(){try{let x=JSON.parse(localStorage.getItem(K)||'null');if(x&&typeof x==='object')return x}catch(e){};return JSON.parse(JSON.stringify(defaults))}
function save(x){localStorage.setItem(K,JSON.stringify(x));}
window.NyxCards={
 get:function(key){let d=load(),a=d[key]||[];return a.length?a[Math.floor(Math.random()*a.length)]:''},
 all:load,
 save:save,
 keyForIntensity:function(v){v=+v||0;if(v<=10)return'0-10';if(v<=25)return'11-25';if(v<=50)return'26-50';if(v<=75)return'51-75';if(v<100)return'76-99';return'100'}
};
window.openNyxCardLibrary=function(){
 let old=document.getElementById('nyx-card-editor');if(old)old.remove();
 let d=load(), ov=document.createElement('div');ov.id='nyx-card-editor';ov.className='nyx-editor-overlay';
 let tabs=buckets.map((b,i)=>'<button class="nyx-editor-tab'+(i===0?' active':'')+'" data-k="'+b[0]+'">'+b[1]+'</button>').join('');
 ov.innerHTML='<div class="nyx-editor"><div class="nyx-editor-head"><b>NYX 字卡</b><button id="nyxEditorClose">×</button></div><div class="nyx-editor-tabs">'+tabs+'</div><div class="nyx-editor-help">一行一条。直接粘贴多行即可批量导入。</div><textarea id="nyxEditorText"></textarea><div class="nyx-editor-actions"><button id="nyxEditorReset">恢复默认</button><button id="nyxEditorSave">保存</button></div></div>';
 document.body.appendChild(ov);let cur=buckets[0][0],ta=ov.querySelector('#nyxEditorText');
 function fill(){ta.value=(d[cur]||[]).join('\n')}
 fill();
 ov.querySelectorAll('.nyx-editor-tab').forEach(b=>b.onclick=()=>{ov.querySelectorAll('.nyx-editor-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');cur=b.dataset.k;fill()});
 ov.querySelector('#nyxEditorClose').onclick=()=>ov.remove();
 ov.querySelector('#nyxEditorSave').onclick=()=>{d[cur]=ta.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);save(d);if(window.Core&&Core.toast)Core.toast('NYX 字卡已保存')};
 ov.querySelector('#nyxEditorReset').onclick=()=>{d[cur]=(defaults[cur]||[]).slice();save(d);fill()};
 ov.onclick=e=>{if(e.target===ov)ov.remove()};
};
/* Inject NYX entry into 字卡库 */
function injectEntry(){
 let page=document.getElementById('page-wordcard-lib');if(!page||page.querySelector('.nyx-card-entry'))return;
 let list=page.querySelector('.discover-list');if(!list)return;
 let div=document.createElement('div');div.className='nyx-card-entry-wrap';
 div.innerHTML='<div class="list-divider"></div><div class="discover-item nyx-card-entry" onclick="openNyxCardLibrary()"><div class="discover-icon"><i class="fas fa-wave-square"></i></div><div class="discover-info"><div class="discover-title">NYX 字卡</div><div class="discover-desc">按 intensity 与 request 结果管理 Loki 的随机台词</div></div><i class="fas fa-chevron-right discover-arrow"></i></div>';
 list.appendChild(div);
}
/* Calls are system activity, never unread messages. Also keep call UI globally mounted. */
function patchCalls(){
 if(typeof window._getCallMountRoot==='function')window._getCallMountRoot=()=>document.getElementById('app')||document.body;
 if(typeof window.minimizeCall==='function'){
  let old=window.minimizeCall;window.minimizeCall=function(){old.apply(this,arguments);let b=document.getElementById('call-mini-bubble'),app=document.getElementById('app');if(b&&app&&b.parentNode!==app)app.appendChild(b);}
 }
 if(typeof window._addCallNotice==='function'){
  let old=window._addCallNotice;window._addCallNotice=function(){let r=old.apply(this,arguments);try{let cid=document.getElementById('page-chat-room')?.dataset.chatId,ch=Storage.getChats();ch.forEach(c=>{if(c.id===cid)c.unread=0});Storage.setChats(ch);if(typeof renderChatList==='function')renderChatList()}catch(e){}return r}
 }
}
function boot(){injectEntry();patchCalls()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
})();