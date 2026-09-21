/* RL7 V86: no observer / no live DOM scan */
(function(){'use strict';if(window.__RL7_V86__)return;window.__RL7_V86__=1;
var GAME=/\b2048\b|羊了个羊|连连看|消消乐|抓大鹅|记忆翻牌|memory|let'?s see if you can beat me|play with me|beat me|game invite|游戏邀请|挑战/i;
var RICH=/菜谱|食谱|recipe|三维常识|3d\s*(?:fact|knowledge)|dimensional\s+(?:fact|knowledge)/i;
function plain(h){var d=document.createElement('div');d.innerHTML=h||'';return(d.textContent||'').replace(/\s+/g,' ').trim()}
function installRenderer(){if(typeof window._buildNormalMessageHtml!=='function')return false;if(window._buildNormalMessageHtml.__rl7v86)return true;var old=window._buildNormalMessageHtml;
 function wrapped(msg){var h=old.apply(this,arguments);if(!h||!msg)return h;var t=plain(h);
  if(GAME.test(t)){h=h.replace(/class="message-row ([^"]*)"/,'class="message-row $1 rl7-card-row-v86 rl7-game-row-v86"');h=h.replace(/class="message-bubble([^"]*)"/,'class="message-bubble$1 rl7-rich-card-v86 rl7-game-card-v86"')}
  else if(msg.msgType==='forward'||RICH.test(t)){h=h.replace(/class="message-row ([^"]*)"/,'class="message-row $1 rl7-card-row-v86 rl7-forward-row-v86"');h=h.replace(/class="message-bubble([^"]*)"/,'class="message-bubble$1 rl7-rich-card-v86"')}return h}
 wrapped.__rl7v86=1;wrapped.__rl7v75=1;window._buildNormalMessageHtml=wrapped;return true}
function patchBackground(){if(typeof window.applyChatBackground!=='function'||window.applyChatBackground.__rl7v86)return false;
 function apply(value){var page=document.getElementById('page-chat-room'),messages=document.getElementById('chat-messages');if(!page||!messages)return;
  page.classList.remove('chat-room-bg-dark','rl7-chat-bg-none');['.chat-room-topbar','.chat-input-zone','.chat-input-bar'].forEach(function(s){var e=document.querySelector(s);if(e)e.classList.remove('chat-room-bg-dark')});
  page.style.removeProperty('background');page.style.removeProperty('background-color');page.style.removeProperty('background-image');messages.style.setProperty('background','transparent','important');
  if(value==='none'){page.classList.add('rl7-chat-bg-none');return}if(!value||value==='default')value='#F5F1F4';
  var img=String(value).indexOf('data:')===0||/\.(png|jpg|jpeg|gif|webp)(?:$|\?)/i.test(String(value));
  if(img)page.style.setProperty('background','url("'+String(value).replace(/"/g,'%22')+'") center/cover no-repeat','important');else page.style.setProperty('background-color',value,'important');
  if(value==='#1a1a2e'||value==='#1b2a1b'){page.classList.add('chat-room-bg-dark');['.chat-room-topbar','.chat-input-zone','.chat-input-bar'].forEach(function(s){var e=document.querySelector(s);if(e)e.classList.add('chat-room-bg-dark')})}}
 apply.__rl7v86=1;window.applyChatBackground=apply;return true}
function patchPicker(){if(typeof window.showChatBgPicker!=='function'||window.showChatBgPicker.__rl7v86)return false;
 function picker(){if(typeof closeChatMenu==='function')closeChatMenu();var room=document.getElementById('page-chat-room'),id=room&&room.dataset.chatId;if(!id)return;var cur=Storage.getChatBgCustom(id);
 var cs=[['无背景','none',''],['柔雾','default','#F5F1F4'],['暖粉','#FFE4E1','#FFE4E1'],['浅蓝','#E3F2FD','#E3F2FD'],['淡绿','#E8F5E9','#E8F5E9'],['奶油','#FFF8E1','#FFF8E1'],['薰衣草','#F3E5F5','#F3E5F5'],['深夜','#1a1a2e','#1a1a2e'],['墨绿','#1b2a1b','#1b2a1b']],sw='';
 cs.forEach(function(c){sw+='<button type="button" class="chat-bg-swatch rl7-bg-choice'+(cur===c[1]?' selected':'')+(c[1]==='none'?' rl7-bg-none-choice':'')+'"'+(c[2]?' style="background:'+c[2]+'"':'')+' onclick="applyChatBg(\''+c[1]+'\')">'+(c[1]==='none'?'<span class="rl7-bg-none-mark">∅</span>':'')+'<span class="rl7-bg-name">'+c[0]+'</span></button>'});
 var h='<div class="chat-bg-overlay" id="chat-bg-overlay" onclick="closeChatBgPicker()"><div class="chat-bg-panel" onclick="event.stopPropagation()"><div class="chat-bg-title">选择聊天背景</div><div class="chat-bg-options">'+sw+'</div><div class="chat-bg-custom" onclick="pickCustomChatBg()"><i class="fas fa-image"></i>从相册选择</div><div class="chat-bg-close" onclick="closeChatBgPicker()">取消</div></div></div>';var x=document.createElement('div');x.innerHTML=h;room.appendChild(x.firstChild)}
 picker.__rl7v86=1;window.showChatBgPicker=picker;return true}
function patchChoice(){if(typeof window.applyChatBg!=='function'||window.applyChatBg.__rl7v86)return false;
 function choose(v){var id=document.getElementById('page-chat-room').dataset.chatId;if(!id)return;Storage.setChatBgCustom(id,v);if(String(v).indexOf('data:')===0){if(window.ChatBgDB)ChatBgDB.set(id,v).then(function(){Storage.setChatBgCustom(id,'__idb__')}).catch(function(){})}else if(window.ChatBgDB)ChatBgDB.del(id).catch(function(){});
 window.applyChatBackground(v);if(typeof closeChatBgPicker==='function')closeChatBgPicker();var n={none:'无背景',default:'柔雾','#FFE4E1':'暖粉','#E3F2FD':'浅蓝','#E8F5E9':'淡绿','#FFF8E1':'奶油','#F3E5F5':'薰衣草','#1a1a2e':'深夜','#1b2a1b':'墨绿'};if(window.Core&&Core.toast)Core.toast('聊天背景已设为'+(n[v]||(String(v).indexOf('data:')===0?'自定义图片':v)))}
 choose.__rl7v86=1;window.applyChatBg=choose;return true}
function boot(){installRenderer();patchBackground();patchPicker();patchChoice()}boot();var n=0,t=setInterval(function(){boot();if(++n>80||(installRenderer()&&patchBackground()&&patchPicker()&&patchChoice()))clearInterval(t)},250);
})();