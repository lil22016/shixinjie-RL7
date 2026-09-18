/* RL7 v3 — home/call fixes + NYX card library */
(function(){
'use strict';
const K='rl7_nyx_cards_v1';
const buckets=[
 ['0-10','0–10%'],['11-25','11–25%'],['26-50','26–50%'],['51-75','51–75%'],['76-99','76–99%'],['100','100%'],
 ['success-up','Request success · stronger'],['success-down','Request success · weaker'],['success-stop','Request success · stop'],
 ['fail-up','Request refused · stronger'],['fail-down','Request refused · weaker'],['fail-stop','Request refused · stop'],['bonus','Refusal event · Loki changes it again']
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
 'fail-stop':["Nice try. I'm not finished.","You said stop. I heard you."],
 'bonus':["Actually, I have a better idea.","No. And since you asked—let's make this interesting.","Trying to negotiate? Wrong move.","You wanted my attention. You have it.","Mm. I think I'll choose the setting now."]
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

/* ===== v27: 镜界 Tarot history → 日常聊天，零额外 HTML 注入 ===== */
(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function findLokiChat(){
    try{
      var room=document.getElementById('page-chat-room');
      if(room&&room.dataset&&room.dataset.chatId)return String(room.dataset.chatId);
      var chats=(window.Storage&&Storage.getChats)?(Storage.getChats()||[]):[];
      var c=chats.find(function(x){return !x.isGroup && !x.groupMembers}) || chats[0];
      return c&&c.id!=null?String(c.id):null;
    }catch(e){return null}
  }
  function sendReading(r){
    if(!r||!window.Storage)return;
    var cid=findLokiChat(); if(!cid){ if(window.Core&&Core.toast)Core.toast('没有找到可转发的聊天'); return; }
    var msg={id:Date.now(),type:'self',time:Date.now(),read:false,msgType:'jingjieReading',
      text:'[境界 Tarot] '+(r.question||r.spreadName||'Tarot reading'),
      reading:{id:r.id,question:r.question||'',deckName:r.deckName||'',spreadName:r.spreadName||'',dateStr:r.dateStr||'',
        cards:(r.cards||[]).map(function(c){return {name:c.name||'',position:c.position||'',isReversed:!!c.isReversed}})}};
    var ms=Storage.getMessages(cid)||[]; ms.push(msg); Storage.setMessages(cid,ms);
    try{if(typeof updateLastMsg==='function')updateLastMsg(cid,msg.text)}catch(e){}
    try{if(typeof closeJingJie==='function')closeJingJie()}catch(e){}
    try{if(typeof openChat==='function')openChat(cid)}catch(e){}
    setTimeout(function(){
      try{if(typeof renderChatMessages==='function')renderChatMessages(cid)}catch(e){}
      try{
        if(typeof simulateReply==='function')simulateReply(cid);
        else if(typeof scheduleAutoReply==='function')scheduleAutoReply(cid);
      }catch(e){}
    },120);
  }
  function decorateFrame(){
    var fr=document.getElementById('jingjie-embed-container-frame'); if(!fr)return;
    var w,d; try{w=fr.contentWindow;d=fr.contentDocument||w.document}catch(e){return}
    if(!d||!w)return;
    function decorate(){
      var list=d.getElementById('divine-history-list'); if(!list)return;
      var rec=[]; try{rec=JSON.parse(w.localStorage.getItem('mirror_divine_records')||'[]')}catch(e){}
      list.querySelectorAll('.divine-record-item').forEach(function(el,i){
        if(el.querySelector('.rl7-jj-forward'))return;
        var r=rec[i];if(!r)return;
        var b=d.createElement('button');b.className='rl7-jj-forward';
        b.innerHTML='<i class="fa-solid fa-share"></i> 转发到聊天';
        b.style.cssText='margin-top:10px;border:0;border-radius:999px;padding:7px 11px;background:rgba(var(--theme-primary-rgb),.12);color:var(--theme-primary);font-size:11px;';
        b.onclick=function(e){e.stopPropagation();sendReading(r)};
        el.appendChild(b);
      });
    }
    decorate();
    if(!fr.__rl7TarotObserver){fr.__rl7TarotObserver=new MutationObserver(decorate);fr.__rl7TarotObserver.observe(d.documentElement,{childList:true,subtree:true})}
  }
  var oldOpen=window.openJingJie;
  if(typeof oldOpen==='function')window.openJingJie=function(){var x=oldOpen.apply(this,arguments);setTimeout(decorateFrame,250);setTimeout(decorateFrame,900);return x};
  setInterval(function(){var c=document.getElementById('jingjie-embed-container');if(c&&c.style.display!=='none')decorateFrame()},1500);

  var oldBuild=window._buildNormalMessageHtml;
  if(typeof oldBuild==='function')window._buildNormalMessageHtml=function(msg,isSelf,selfAvatar,otherAvatar,suffix,senderName,senderStatus,rowGroupCls){
    if(msg&&msg.msgType==='jingjieReading'){
      var r=msg.reading||{};
      var pills=(r.cards||[]).map(function(c){return '<span style="font-size:10px;padding:5px 7px;border-radius:999px;background:rgba(255,255,255,.08)">'+esc(c.position?c.position+': ':'')+esc(c.name)+(c.isReversed?' · Reversed':'')+'</span>'}).join('');
      return '<div class="message-row self '+(rowGroupCls||'')+'" data-msg-id="'+msg.id+'">'+selfAvatar+
        '<div class="message-body"><div style="width:min(285px,74vw);padding:16px;border-radius:20px;background:linear-gradient(145deg,#2b202f,#17131b);border:1px solid rgba(195,138,164,.2);color:#f0e7f1">'+
        '<div style="font-size:9px;letter-spacing:.18em;color:#c38aa4;font-weight:800">TAROT · FROM 境界</div>'+
        '<div style="font-family:Georgia,serif;font-size:16px;line-height:1.4;margin:8px 0">'+esc(r.question||'Tarot reading')+'</div>'+
        '<div style="font-size:10px;color:#9f91a5">'+esc(r.deckName)+(r.spreadName?' · '+esc(r.spreadName):'')+'</div>'+
        '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:11px">'+pills+'</div></div>'+(suffix||'')+
        '<div class="message-meta"><div class="message-time">'+(window.Core&&Core.formatTime?Core.formatTime(msg.time):'')+'</div></div></div></div>';
    }
    return oldBuild.apply(this,arguments);
  };
})();
