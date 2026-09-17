/* RL7 v4 — home icon/layout + chat unread hotfix */
(function(){
'use strict';
function chatItem(){
 var items=document.querySelectorAll('#home-widgets-grid .home-feature-item');
 for(var i=0;i<items.length;i++){var l=items[i].querySelector('.home-feature-label');if(l&&l.textContent.trim()==='日常聊天')return items[i]}
 return null;
}
function pfItem(){
 var items=document.querySelectorAll('#home-widgets-grid .home-feature-item');
 for(var i=0;i<items.length;i++){var l=items[i].querySelector('.home-feature-label');if(l&&l.textContent.indexOf('Private Frequency')>=0)return items[i]}
 return null;
}
function fixPF(){
 var row=pfItem();if(!row)return;var icon=row.querySelector('.home-feature-icon');if(!icon)return;
 /* Inline SVG: independent of Font Awesome version. */
 icon.innerHTML='<svg class="pf-radio-svg" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 13.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Z"/><path d="M10.8 10.7a7.5 7.5 0 0 0 0 10.6M21.2 10.7a7.5 7.5 0 0 1 0 10.6M6.8 6.8a13 13 0 0 0 0 18.4M25.2 6.8a13 13 0 0 1 0 18.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
}
function clearChatUnread(){
 var row=chatItem();if(row)row.querySelectorAll('.rl7-unread-badge,.chat-badge,.unread-badge,.badge,.red-dot').forEach(x=>x.remove());
 try{
  var chats=Storage.getChats()||[],changed=false;
  chats.forEach(c=>{if(c.unread){c.unread=0;changed=true}});
  if(changed&&Storage.setChats)Storage.setChats(chats);
 }catch(e){}
 try{if(window.RL7UnreadMark)RL7UnreadMark('chat')}catch(e){}
}
document.addEventListener('click',function(e){
 var row=e.target&&e.target.closest&&e.target.closest('#home-widgets-grid .home-feature-item');
 if(row===chatItem()){clearChatUnread();setTimeout(clearChatUnread,80);setTimeout(clearChatUnread,500)}
},true);
function boot(){fixPF();clearChatUnread()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
setTimeout(boot,500);setTimeout(boot,1800);
})();