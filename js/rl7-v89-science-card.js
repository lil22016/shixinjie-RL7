/* RL7 V89 — science/knowledge card presentation.
The science card is generated as a feature-card shell, not a normal message-bubble. */
(function(){'use strict';
var RX=/小常识|科普|curious mind|little something|三维|公交地铁/i;
function txt(h){var d=document.createElement('div');d.innerHTML=h||'';return(d.textContent||'').replace(/\s+/g,' ').trim()}
function install(){if(typeof window._buildNormalMessageHtml!=='function')return false;if(window._buildNormalMessageHtml.__rl7science89)return true;var old=window._buildNormalMessageHtml;
 function w(msg){var h=old.apply(this,arguments);if(!h||!RX.test(txt(h)))return h;
  h=h.replace(/class="message-row ([^"]*)"/,'class="message-row $1 rl7-science89-row"');
  /* Mark the structured card itself when it has no message-bubble. */
  if(h.indexOf('message-bubble')>=0)h=h.replace(/class="message-bubble([^"]*)"/,'class="message-bubble$1 rl7-science89-card"');
  else h=h.replace(/class="([^"]*(?:feature-card|knowledge-card|fact-card|forward-bubble)[^"]*)"/,'class="$1 rl7-science89-card"');
  return h}
 w.__rl7science89=1;w.__rl7v88=1;w.__rl7v75=1;window._buildNormalMessageHtml=w;return true}
install();var n=0,t=setInterval(function(){if(install()||++n>80)clearInterval(t)},200);
})();