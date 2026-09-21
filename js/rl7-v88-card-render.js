/* RL7 V88 — final card classifier; no MutationObserver, no document scan. */
(function(){'use strict';if(window.__RL7_V88_CARD__)return;window.__RL7_V88_CARD__=1;
var GAME=/\b2048\b|羊了个羊|连连看|消消乐|抓大鹅|记忆翻牌|memory|play with me|beat me|game invite|游戏邀请|挑战/i;
var SCI=/公交地铁乘车小常识|小常识|科普|curious mind|little something|三维|recipe|菜谱|食谱/i;
function text(h){var d=document.createElement('div');d.innerHTML=h||'';return(d.textContent||'').replace(/\s+/g,' ').trim()}
function install(){if(typeof window._buildNormalMessageHtml!=='function')return false;if(window._buildNormalMessageHtml.__rl7v88)return true;var old=window._buildNormalMessageHtml;
 function w(msg){var h=old.apply(this,arguments);if(!h||!msg||msg.msgType==='private_frequency')return h;var t=text(h);if(!(GAME.test(t)||SCI.test(t)||msg.msgType==='forward'))return h;
  h=h.replace(/class="message-row ([^"]*)"/,'class="message-row $1 rl7-v88-card-row"');
  h=h.replace(/class="message-bubble([^"]*)"/,'class="message-bubble$1 rl7-v88-card"');
  return h}
 w.__rl7v88=1;w.__rl7v75=1;window._buildNormalMessageHtml=w;return true}
install();var n=0,t=setInterval(function(){if(install()||++n>80)clearInterval(t)},250);
})();