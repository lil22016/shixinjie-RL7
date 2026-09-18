/* RL7 v31 — chat wallpaper swatch + safe photo/solid switching */
(function(){
'use strict';
var installed=false, PHOTO_ACTIVE='__idb__';
function chatId(){var p=document.getElementById('page-chat-room');return p&&p.dataset?p.dataset.chatId:''}
function toast(s){if(window.Core&&Core.toast)Core.toast(s)}
function renderPhotoSwatch(){
 var panel=document.querySelector('#chat-bg-overlay .chat-bg-panel'),opts=panel&&panel.querySelector('.chat-bg-options'),id=chatId();
 if(!opts||!id||opts.querySelector('.rl7-photo-bg-swatch')||!window.ChatBgDB)return;
 ChatBgDB.get(id).then(function(img){
  if(!img||String(img).indexOf('data:')!==0)return;
  var sw=document.createElement('div');
  sw.className='chat-bg-swatch rl7-photo-bg-swatch'+(Storage.getChatBgCustom(id)===PHOTO_ACTIVE?' selected':'');
  sw.title='已上传的图片';sw.setAttribute('aria-label','已上传的图片');
  sw.style.backgroundImage='url("'+String(img).replace(/"/g,'%22')+'")';
  sw.onclick=function(e){e.stopPropagation();ChatBgDB.get(id).then(function(saved){
   if(!saved){toast('没有找到已上传的图片背景');return}
   Storage.setChatBgCustom(id,PHOTO_ACTIVE);applyChatBackground(saved);closeChatBgPicker();toast('已切回图片背景')
  }).catch(function(){toast('没有找到已上传的图片背景')})};
  opts.appendChild(sw)
 }).catch(function(){})
}
function install(){
 if(installed||typeof window.showChatBgPicker!=='function'||typeof window.applyChatBg!=='function'||typeof window.pickCustomChatBg!=='function')return;
 installed=true;
 var originalShow=window.showChatBgPicker, originalApply=window.applyChatBg;
 window.showChatBgPicker=function(){var r=originalShow.apply(this,arguments);setTimeout(renderPhotoSwatch,0);return r};
 window.applyChatBg=function(value){
  var id=chatId();if(!id)return;
  if(typeof value==='string'&&value.indexOf('data:')===0)return originalApply.apply(this,arguments);
  /* IMPORTANT: do not ChatBgDB.del(id) when choosing a color. */
  Storage.setChatBgCustom(id,value);applyChatBackground(value);closeChatBgPicker();
  var n={'default':'跟随主题','#FFE4E1':'暖粉','#E3F2FD':'浅蓝','#E8F5E9':'淡绿','#FFF8E1':'奶油','#F3E5F5':'薰衣草','#1a1a2e':'深夜','#1b2a1b':'墨绿'};
  toast('聊天背景已设为'+(n[value]||value))
 };
 window.pickCustomChatBg=function(){
  var input=document.createElement('input');input.type='file';input.accept='image/*';input.style.position='fixed';input.style.left='-9999px';document.body.appendChild(input);
  input.addEventListener('change',function(){
   var file=input.files&&input.files[0];if(!file){input.remove();return}
   var reader=new FileReader();
   reader.onload=function(e){var raw=e.target.result,finish=function(data){originalApply.call(window,data);setTimeout(function(){input.remove()},0)};
    if(typeof window.compressImageData==='function')compressImageData(raw,1600,0.9,false).then(finish).catch(function(){finish(raw)});else finish(raw)};
   reader.onerror=function(){toast('图片读取失败，请重新选择');input.remove()};reader.readAsDataURL(file)
  },{once:true});input.click()
 }
}
setTimeout(install,100);setInterval(install,1000)
})();