/* RL7 V83 — safe renderer-only Private Frequency + game card fix.
   IMPORTANT: no MutationObserver, no DOM scanning, no characterData observer,
   no recurring whole-chat scan. Existing message/history DOM is never rewritten. */
(function () {
  'use strict';
  if (window.__RL7_V83_SAFE_CARDS__) return;
  window.__RL7_V83_SAFE_CARDS__ = 1;

  var GAME_HINT = /\b2048\b|羊了个羊|连连看|消消乐|抓大鹅|记忆翻牌|memory|let'?s see if you can beat me|play with me|beat me|game invite|游戏邀请|挑战/i;

  function install() {
    if (typeof window._buildNormalMessageHtml !== 'function') return false;
    if (window._buildNormalMessageHtml.__rl7v83) return true;

    var old = window._buildNormalMessageHtml;

    function wrapped(msg, isSelf, selfAvatarHtml, otherAvatarHtml, suffixHtml, senderName, senderStatusHtml, rowGroupCls) {
      var html = old.apply(this, arguments);
      if (!msg || !html) return html;

      /* Private Frequency:
         V69 already owns persistence/click behavior. We only replace its visual
         icon markup with the exact icon markup used by the home-screen entry
         and add a stable card class. No live DOM replacement occurs. */
      if (msg.msgType === 'private_frequency') {
        html = html
          .replace('class="rl7-private-frequency-card"', 'class="rl7-private-frequency-card rl7-pf-card-v83"')
          .replace(
            '<span class="rl7-pf-icon"><i class="fas fa-wave-square"></i></span>',
            '<span class="home-feature-icon rl7-pf-home-icon-v83"><i class="fas fa-wave-square"></i></span>'
          );
        return html;
      }

      /* Game invite:
         Tag the HTML while that message is being rendered. The Liquid Glass
         belongs to the actual message bubble, NOT message-body, so message-meta
         / timestamp remains a normal sibling outside the card. */
      var text = String(msg.text || '');
      if (GAME_HINT.test(text)) {
        html = html.replace(
          /class="message-row ([^"]*)"/,
          'class="message-row $1 rl7-game-row-v83"'
        );
        html = html.replace(
          /class="message-bubble([^"]*)"/,
          'class="message-bubble$1 rl7-game-card-v83"'
        );
      }
      return html;
    }

    wrapped.__rl7v83 = true;
    window._buildNormalMessageHtml = wrapped;
    return true;
  }

  if (!install()) {
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (install() || tries >= 80) clearInterval(timer);
    }, 250);
  }
})();
