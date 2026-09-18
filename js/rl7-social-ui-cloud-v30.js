/* RL7 v29 */
(function(){'use strict';
function partner(m){try{var p=Storage.getPartnerProfiles?Storage.getPartnerProfiles():[];return p.find(x=>String(x.id)===String(m.authorId))||p[0]||null}catch(e){return null}}
function line(){var a=["You really had to say that where everyone can see it?","Mm. I was wondering when you'd show up.","Careful, darling. I can reply here too.","Noted. Loud and clear.","You’re very bold in my comments today.","I saw that. Obviously.","And here I thought you’d behave.","That’s what you decided to leave under my post?","Cute. Keep talking.","I knew that would get your attention."];return a[Math.floor(Math.random()*a.length)]}
function moments(){
 if(!window.MomentsApp||MomentsApp.__reply29)return;MomentsApp.__reply29=1;
 var old=MomentsApp.submitMomentComment;
 MomentsApp.submitMomentComment=function(){
  var mid=this._commentMomentId,h=this._findMoment(mid),ok=!!(h&&h.moment&&this._isPartnerId(h.moment.authorId)),n=h&&h.moment.comments?h.moment.comments.length:0,r=old.apply(this,arguments);
  if(ok&&Math.random()<.70)setTimeout(function(){var x=MomentsApp._findMoment(mid);if(!x||x.moment.comments.length<=n)return;var p=partner(x.moment);if(!p)return,mine=x.moment.comments[x.moment.comments.length-1];
   x.moment.comments.push({id:'c_loki_'+Date.now(),authorId:p.id,name:p.nickname||p.name||x.moment.authorName||'Loki',avatar:p.avatar||'',color:p.avatarColor||p.color||'',avatarImage:p.avatarImage||'',text:line(),time:Date.now(),replyTo:mine.name||''});
   MomentsApp._saveFeed(x.data);MomentsApp._renderFeed()},900+Math.random()*2200);return r};
 var card=MomentsApp._momentCardHtml;MomentsApp._momentCardHtml=function(m){var h=card.call(this,m);(m.comments||[]).forEach(function(c){if(c.replyTo){var a='<span class="c-name">'+Core.escapeHtml(c.name)+'：</span>',b='<span class="c-name">'+Core.escapeHtml(c.name)+'</span><span class="c-reply"> 回复 '+Core.escapeHtml(c.replyTo)+'：</span>';h=h.replace(a,b)}});return h}
}
function cloud(){
 if(!window.RL7CloudSync||document.getElementById('rl7-cloud-settings-entry'))return;
 var b=document.getElementById('rl7-cloud-btn');if(!b)return;b.style.display='none';
 var lists=document.querySelectorAll('#page-settings .settings-list'),list=lists[1]||lists[0];if(!list)return;
 var div=document.createElement('div');div.className='list-divider';list.appendChild(div);
 var x=document.createElement('div');x.className='settings-item';x.id='rl7-cloud-settings-entry';x.innerHTML='<div class="s-icon"><i class="fas fa-cloud"></i></div><div class="s-content"><div class="s-label">云端同步</div><div class="s-value">备份、同步与跨设备恢复</div></div><i class="fas fa-chevron-right s-arrow"></i>';x.onclick=function(){b.click()};list.appendChild(x)
}
function boot(){moments();cloud()}setTimeout(boot,400);setInterval(boot,1500)})();
/* v30 — keep uploaded chat wallpaper while temporarily using a solid color */
(function(){
function installSavedWallpaper(){
 if(typeof window.showChatBgPicker!=='function'||window.__rl7SavedWallpaper30)return;
 window.__rl7SavedWallpaper30=1;
 var oldShow=window.showChatBgPicker;
 window.showChatBgPicker=function(){
   var r=oldShow.apply(this,arguments);
   setTimeout(function(){
     var panel=document.querySelector('#chat-bg-overlay .chat-bg-panel');
     if(!panel||panel.querySelector('.rl7-saved-chat-bg'))return;
     var custom=panel.querySelector('.chat-bg-custom');
     var btn=document.createElement('div');
     btn.className='chat-bg-custom rl7-saved-chat-bg';
     btn.innerHTML='<i class="fas fa-images"></i>已上传的图片';
     btn.onclick=function(e){
       e.stopPropagation();
       var id=document.getElementById('page-chat-room')?.dataset.chatId;
       if(!id||!window.ChatBgDB)return;
       ChatBgDB.get(id).then(function(img){
         if(!img){Core.toast('这个聊天还没有上传过图片背景');return}
         /* Restore without rewriting/deleting the stored image. */
         Storage.setChatBgCustom(id,'__idb__');
         applyChatBackground(img);closeChatBgPicker();Core.toast('已切回上传的图片背景');
       }).catch(function(){Core.toast('没有找到已上传的图片背景')});
     };
     if(custom)panel.insertBefore(btn,custom); else panel.appendChild(btn);
   },0);return r;
 };
 /* Critical behavior change: choosing a solid preset must NOT delete ChatBgDB.
    This is what makes photo ↔ readable solid background a reversible quick switch. */
 var oldApply=window.applyChatBg;
 window.applyChatBg=function(value){
   var id=document.getElementById('page-chat-room')?.dataset.chatId;
   if(!id)return;
   if(value&&value.indexOf('data:')===0){
     return oldApply.apply(this,arguments); // uploading a new photo replaces saved photo normally
   }
   Storage.setChatBgCustom(id,value);
   applyChatBackground(value);closeChatBgPicker();
   var names={'default':'跟随主题','#FFE4E1':'暖粉','#E3F2FD':'浅蓝','#E8F5E9':'淡绿','#FFF8E1':'奶油','#F3E5F5':'薰衣草','#1a1a2e':'深夜','#1b2a1b':'墨绿'};
   Core.toast('聊天背景已设为'+(names[value]||value));
 };
}
setTimeout(installSavedWallpaper,500);setInterval(installSavedWallpaper,1500);
})();
