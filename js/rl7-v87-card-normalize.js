/* RL7 V87 — card normalization. Private Frequency is deliberately untouched. */
(function(){'use strict';if(window.__RL7_V87__)return;window.__RL7_V87__=1;
var GAME=/\b2048\b|羊了个羊|连连看|消消乐|抓大鹅|记忆翻牌|memory|play with me|beat me|game invite|游戏邀请|挑战/i;
var KNOW=/小常识|常识|科普|curious mind|little something|三维|3d\s*(?:fact|knowledge)|dimensional\s+(?:fact|knowledge)|recipe|菜谱|食谱/i;
function textOf(h){var d=document.createElement('div');d.innerHTML=h||'';return(d.textContent||'').replace(/\s+/g,' ').trim()}
function install(){
 if(typeof window._buildNormalMessageHtml!=='function')return false;
 if(window._buildNormalMessageHtml.__rl7v87)return true;
 var old=window._buildNormalMessageHtml;
 function wrapped(msg){
   var h=old.apply(this,arguments); if(!h||!msg||msg.msgType==='private_frequency')return h;
   var t=textOf(h), rich=GAME.test(t)||KNOW.test(t)||msg.msgType==='forward';
   if(!rich)return h;
   h=h.replace(/class="message-row ([^"]*)"/,'class="message-row $1 rl7-card-row-v87"');
   var before=h;
   h=h.replace(/class="message-bubble([^"]*)"/,'class="message-bubble$1 rl7-card-v87"');
   /* Some structured cards are not message-bubble; mark first direct card-like element. */
   if(h===before){
     h=h.replace(/class="([^"]*(?:game-card|game-invite-card|invite-card|recipe-card|recipe-shell|knowledge-card|fact-card|forward-bubble)[^"]*)"/,
                 'class="$1 rl7-card-v87"');
   }
   return h;
 }
 wrapped.__rl7v87=1;
 /* prevent V75's late retry from replacing our final renderer */
 wrapped.__rl7v75=1;
 window._buildNormalMessageHtml=wrapped; return true;
}
install();var n=0,t=setInterval(function(){if(install()||++n>80)clearInterval(t)},250);
})();