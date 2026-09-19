/* RL7 V75 — game-card Liquid Glass + two-choice interactive "ask Loki to pay" card.
   Loaded after chat/modules. No size guessing. */
(function(){'use strict';
if(window.__RL7_V75_CHAT_CARDS__)return;window.__RL7_V75_CHAT_CARDS__=1;

var GAME_HINT=/\b2048\b|羊了个羊|连连看|消消乐|抓大鹅|记忆翻牌|memory|let'?s see if you can beat me|beat me|game invite|游戏邀请|挑战/i;

function tagGameRow(row){
 if(!row||!row.querySelector)return;
 var body=row.querySelector(':scope > .message-body')||row.querySelector('.message-body');
 if(!body)return;
 var text=(body.innerText||body.textContent||'').replace(/\s+/g,' ').trim();
 if(!GAME_HINT.test(text))return;
 /* This is the bug V73 missed: some game invites contain a .message-bubble,
    so V73 classified them as normal chat before testing the game text. */
 row.classList.add('rl7-game-invite-row');
 body.classList.add('rl7-game-invite-shell');
 var bubble=body.querySelector('.message-bubble');
 if(bubble)bubble.classList.add('rl7-game-invite-card');
}
function scan(root){
 var s=root&&root.querySelectorAll?root:document;
 if(s.matches&&s.matches('#page-chat-room .message-row'))tagGameRow(s);
 s.querySelectorAll&&s.querySelectorAll('#page-chat-room .message-row').forEach(tagGameRow);
}

/* ---------- Shop pay request ---------- */
function esc(s){return window.Core&&Core.escapeHtml?Core.escapeHtml(String(s==null?'':s)):String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
function getMsgs(cid){try{return Storage.getMessages(cid)||[]}catch(e){return[]}}
function saveMsgs(cid,a){try{Storage.setMessages(cid,a)}catch(e){}}
function findMsg(cid,id){var a=getMsgs(cid);for(var i=0;i<a.length;i++)if(String(a[i].id)===String(id))return {a:a,m:a[i]};return null}
function partnerName(cid){try{var p=Storage.getPartnerProfiles()||[];for(var i=0;i<p.length;i++)if(String(p[i].id)===String(cid))return p[i].nickname||p[i].name||'Loki'}catch(e){}return'Loki'}

function payCard(msg){
 var q=msg.shopPayRequest||{}, p=q.product||{}, result=q.result;
 var options=[
   {k:'pay',t:"I'll pay"},
   {k:'no',t:"I won't pay"}
 ];
 var opts=options.map(function(o){
   var picked=result===o.k?' picked':'';
   return '<div class="rl7-pay-option'+picked+'"><span>'+esc(o.t)+'</span>'+(picked?'<i class="fas fa-check"></i>':'')+'</div>';
 }).join('');
 var status=result?'<div class="rl7-pay-result">'+esc(q.resultText||options.filter(function(o){return o.k===result})[0].t)+'</div>':'<div class="rl7-pay-wait"><span class="pulse-dot"></span> Waiting for '+esc(q.partnerName||'Loki')+'…</div>';
 return '<div class="rl7-action-card rl7-shop-pay-card">'+
   '<div class="rl7-pay-head"><span class="rl7-pay-icon">'+esc(p.icon||'🛍️')+'</span><div><b>'+esc(p.name||'Item')+'</b><small>¥'+esc(p.price==null?'0':p.price)+'</small></div></div>'+
   (p.desc?'<div class="rl7-pay-desc">'+esc(p.desc)+'</div>':'')+
   '<div class="rl7-pay-question">Will you pay for this for me?</div>'+
   '<div class="rl7-card-actions rl7-pay-options" data-display-only="1">'+opts+'</div>'+status+
   '</div>';
}
function installRenderer(){
 if(typeof window._buildNormalMessageHtml!=='function')return false;
 if(window._buildNormalMessageHtml.__rl7v75)return true;
 var old=window._buildNormalMessageHtml;
 function wrapped(msg,isSelf,selfAvatar,otherAvatar,suffix,senderName,senderStatus,rowGroupCls){
   if(msg&&msg.msgType==='shopPayRequest'){
     var sender=senderName?'<div class="message-sender-name">'+esc(senderName)+(senderStatus||'')+'</div>':'';
     var av=isSelf?selfAvatar:otherAvatar;
     return '<div class="message-row '+(isSelf?'self':'other')+(rowGroupCls||'')+'" data-msg-id="'+msg.id+'">'+av+
       '<div class="message-body">'+sender+payCard(msg)+(suffix||'')+
       '<div class="message-meta"><div class="message-time">'+(Core&&Core.formatTime?Core.formatTime(msg.time):'')+'</div></div></div></div>';
   }
   return old.apply(this,arguments);
 }
 wrapped.__rl7v75=1;window._buildNormalMessageHtml=wrapped;return true;
}
function rerender(cid){
 try{
  var room=document.getElementById('page-chat-room');
  if(room&&String(room.dataset.chatId)===String(cid)&&typeof renderChatMessages==='function')renderChatMessages(cid,{preserveScroll:true});
 }catch(e){}
}
function pushPartnerLine(cid,text){
 if(!text)return;
 var a=getMsgs(cid),now=Date.now();
 var m={id:now,type:'other',text:text,time:now,msgType:'text',read:false};
 a.push(m);saveMsgs(cid,a);
 try{if(typeof updateLastMsg==='function')updateLastMsg(cid,text);if(typeof _safeAppendMessage==='function')_safeAppendMessage(cid,m);else rerender(cid)}catch(e){rerender(cid)}
 try{if(typeof showBackgroundPush==='function')showBackgroundPush(text)}catch(e){}
}
function resolvePay(cid,id){
 var f=findMsg(cid,id);if(!f||!f.m.shopPayRequest||f.m.shopPayRequest.result)return;
 /* Same decision-card idea as “ask whether to buy”, but this request only has two valid outcomes. */
 var result=Math.random()<.75?'pay':'no';
 var q=f.m.shopPayRequest,p=q.product||{};
 q.result=result;
 q.resultText=result==='pay'?"I'll pay":"I won't pay";
 q.resolvedAt=Date.now();
 saveMsgs(cid,f.a);
 if(result==='pay'){
   try{if(window.ShopApp&&ShopApp._addRecord)ShopApp._addRecord({productId:p.id,name:p.name,price:p.price,icon:p.icon,category:p.category,action:'partnerPay',target:'me',label:'对方付款'})}catch(e){}
 }
 rerender(cid);
 var yes=[
   "Fine. Put it on my tab, darling.",
   "Of course I'm paying. You wanted it, didn't you?",
   "Consider it handled. Try not to look so pleased with yourself.",
   "I'll pay. Apparently spoiling you is becoming a habit.",
   "Done. And no, you don't get to pretend you weren't expecting me to say yes.",
   "Very well. I'll cover it. You owe me a kiss, though.",
   "Mine. The bill, I mean. The rest was already obvious.",
   "Go on, then. Get it. I've got this."
 ];
 var no=[
   "Absolutely not. That look isn't going to work on me this time.",
   "No. You can pout if you like; my answer is still no.",
   "Tempting, but no. Even I have limits, darling.",
   "Not this one. Find something worth convincing me about.",
   "I'm declining. Dramatically, if that makes it any better.",
   "No, love. You'll survive this terrible injustice.",
   "I'm not paying for that. Try your luck again later.",
   "Denied. And don't give me that face."
 ];
 var pool=result==='pay'?yes:no,line=pool[Math.floor(Math.random()*pool.length)];
 setTimeout(function(){pushPartnerLine(cid,line)},420+Math.random()*480);
 try{if(typeof updateLastMsg==='function')updateLastMsg(cid,'[代付] '+(p.name||'商品')+' · '+q.resultText)}catch(e){}
}
function sendPayRequest(productId){
 if(!window.ShopApp)return false;
 var p=ShopApp.getProduct&&ShopApp.getProduct(productId);if(!p)return false;
 var cid=ShopApp.resolveTargetChat&&ShopApp.resolveTargetChat();
 if(!cid){Core.toast('对方不在哦，请先添加角色');return false}
 try{ShopApp.closeOverlay('shop-buy-overlay')}catch(e){}
 var id=Date.now(),msg={id:id,type:'self',text:'[代付] '+p.name,time:id,msgType:'shopPayRequest',read:false,
   shopPayRequest:{partnerName:partnerName(cid),product:{id:p.id,name:p.name,price:p.price,icon:p.icon,category:p.category,desc:p.desc||''},result:null}};
 var a=getMsgs(cid);a.push(msg);saveMsgs(cid,a);
 try{updateLastMsg(cid,'[代付] '+p.name);_safeAppendMessage(cid,msg)}catch(e){rerender(cid)}
 try{Core.toast('已发给 '+partnerName(cid)+'，等他选择…')}catch(e){}
 setTimeout(function(){resolvePay(cid,id)},1200+Math.random()*1800);
 return true;
}
function installShop(){
 if(!window.ShopApp||ShopApp.__rl7v75pay)return false;
 ShopApp.__rl7v75pay=1;
 ShopApp.askPartnerPay=function(productId){return sendPayRequest(productId)};
 return true;
}
function resume(){
 try{
  var room=document.getElementById('page-chat-room'),cid=room&&room.dataset.chatId;if(!cid)return;
  getMsgs(cid).forEach(function(m){if(m&&m.msgType==='shopPayRequest'&&m.shopPayRequest&&!m.shopPayRequest.result)setTimeout(function(){resolvePay(cid,m.id)},700+Math.random()*900)});
 }catch(e){}
}
function boot(){
 installRenderer();installShop();scan(document);resume();
 var tries=0,t=setInterval(function(){var a=installRenderer(),b=installShop();scan(document);if((a&&b&&++tries>6)||tries>80)clearInterval(t)},250);
 new MutationObserver(function(ms){ms.forEach(function(m){var row=m.target&&m.target.closest&&m.target.closest('#page-chat-room .message-row');if(row)tagGameRow(row);(m.addedNodes||[]).forEach(function(n){if(n.nodeType===1)scan(n)})})}).observe(document.body,{childList:true,subtree:true,characterData:true});
 document.addEventListener('click',function(){setTimeout(function(){scan(document)},0)},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();