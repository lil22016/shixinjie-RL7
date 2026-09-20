/* RL7 V85 — safe game render tagger. No MutationObserver, no DOM scan. */
(function(){'use strict';
if(window.__RL7_V85_GAME_RENDER__)return;window.__RL7_V85_GAME_RENDER__=1;
var H=/\b2048\b|羊了个羊|连连看|消消乐|抓大鹅|记忆翻牌|memory|let'?s see if you can beat me|play with me|beat me|game invite|游戏邀请|挑战/i;
function plain(h){var d=document.createElement('div');d.innerHTML=h||'';return(d.textContent||'').replace(/\s+/g,' ').trim()}
function install(){if(typeof window._buildNormalMessageHtml!=='function')return false;if(window._buildNormalMessageHtml.__rl7v85)return true;var old=window._buildNormalMessageHtml;function wrapped(){var h=old.apply(this,arguments);if(h&&H.test(plain(h))){h=h.replace(/class="message-row ([^"]*)"/,'class="message-row $1 rl7-game-row-v85"');h=h.replace(/class="message-bubble([^"]*)"/,'class="message-bubble$1 rl7-game-card-v85"')}return h}wrapped.__rl7v85=1;wrapped.__rl7v75=1;window._buildNormalMessageHtml=wrapped;return true}
if(!install()){var n=0,t=setInterval(function(){if(install()||++n>80)clearInterval(t)},250)}
})();
