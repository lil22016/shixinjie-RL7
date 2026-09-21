/* RL7 V89 — chat background restore. */
(function(){'use strict';
function install(){
 if(typeof window.showChatBgPicker!=='function'||!window.Storage)return false;
 window.showChatBgPicker=function(){
  if(typeof closeChatMenu==='function')closeChatMenu();
  var page=document.getElementById('page-chat-room'),id=page&&page.dataset.chatId;if(!id)return;
  var cur=Storage.getChatBgCustom(id)||'none';
  var cs=[['无背景','none',''],['柔雾','default','#F5F1F4'],['暖粉','#FFE4E1','#FFE4E1'],['浅蓝','#E3F2FD','#E3F2FD'],['淡绿','#E8F5E9','#E8F5E9'],['奶油','#FFF8E1','#FFF8E1'],['薰衣草','#F3E5F5','#F3E5F5'],['深夜','#1a1a2e','#1a1a2e'],['墨绿','#1b2a1b','#1b2a1b']],sw='';
  cs.forEach(function(c){sw+='<div class="chat-bg-swatch'+(cur===c[1]?' selected':'')+'" '+(c[2]?'style="background:'+c[2]+'"':'style="background:transparent;border:1px dashed rgba(255,255,255,.55)"')+' onclick="applyChatBg(\''+c[1]+'\')" title="'+c[0]+'">'+(c[1]==='none'?'<span style="font-size:22px">∅</span>':'')+'</div>'});
  var h='<div class="chat-bg-overlay" id="chat-bg-overlay" onclick="closeChatBgPicker()"><div class="chat-bg-panel" onclick="event.stopPropagation()"><div class="chat-bg-title">选择聊天背景</div><div class="chat-bg-options">'+sw+'</div><div class="chat-bg-custom" onclick="pickCustomChatBg()"><i class="fas fa-image"></i>从相册选择</div><div class="chat-bg-close" onclick="closeChatBgPicker()">取消</div></div></div>';
  var x=document.createElement('div');x.innerHTML=h;page.appendChild(x.firstChild);
 };
 window.applyChatBg=function(v){
  var page=document.getElementById('page-chat-room'),id=page&&page.dataset.chatId;if(!id)return;
  Storage.setChatBgCustom(id,v);
  if(v.indexOf('data:')===0&&window.ChatBgDB)ChatBgDB.set(id,v).then(function(){Storage.setChatBgCustom(id,'__idb__')}).catch(function(){});
  else if(window.ChatBgDB)ChatBgDB.del(id).catch(function(){});
  window.applyChatBackground(v);if(typeof closeChatBgPicker==='function')closeChatBgPicker();
 };
 window.applyChatBackground=function(v){
  var p=document.getElementById('page-chat-room'),m=document.getElementById('chat-messages');if(!p||!m)return;
  p.classList.remove('chat-room-bg-dark');p.style.removeProperty('background');p.style.removeProperty('background-color');p.style.removeProperty('background-image');m.style.setProperty('background','transparent','important');
  if(!v||v==='none'){p.style.setProperty('background','transparent','important');return}
  if(v==='default')v='#F5F1F4';
  var img=v.indexOf('data:')===0||/\.(png|jpg|jpeg|gif|webp)(?:$|\?)/i.test(v);
  if(img)p.style.setProperty('background','url("'+v.replace(/"/g,'%22')+'") center/cover no-repeat','important');else p.style.setProperty('background-color',v,'important');
  if(v==='#1a1a2e'||v==='#1b2a1b')p.classList.add('chat-room-bg-dark');
 };
 return true;
}
install();var n=0,t=setInterval(function(){if(install()||++n>80)clearInterval(t)},200);
})();