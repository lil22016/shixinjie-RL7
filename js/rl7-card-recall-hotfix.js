/* RL7 Card + Recall Hotfix
 * 2026-09-16
 * - Wider shop/gift cards + real button styling
 * - Per-message recall reveal when global "show recalled content" is OFF
 */
(function () {
  'use strict';

  if (window.__RL7_CARD_RECALL_HOTFIX_1__) return;
  window.__RL7_CARD_RECALL_HOTFIX_1__ = true;

  var REVEAL_KEY = 'rl7_recall_revealed_v1';

  function getState() {
    try {
      var v = Storage.get(REVEAL_KEY, {});
      return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch (e) {
      try {
        var raw = localStorage.getItem(REVEAL_KEY);
        var obj = raw ? JSON.parse(raw) : {};
        return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
      } catch (_) {
        return {};
      }
    }
  }

  function setState(v) {
    try {
      Storage.set(REVEAL_KEY, v);
    } catch (e) {
      try { localStorage.setItem(REVEAL_KEY, JSON.stringify(v)); } catch (_) {}
    }
  }

  function currentChatId() {
    var page = document.getElementById('page-chat-room');
    return page && page.dataset ? (page.dataset.chatId || '') : '';
  }

  function recallKey(msgId) {
    return currentChatId() + ':' + String(msgId);
  }

  function isRevealed(msgId) {
    var s = getState();
    return !!s[recallKey(msgId)];
  }

  window.RL7ToggleRecallReveal = function (msgId) {
    try {
      /* When the global switch is ON, the original site already shows
         all recalled content. The per-message reveal is only for OFF mode. */
      if (Storage.getShowRecallContent && Storage.getShowRecallContent()) return;
    } catch (_) {}

    var key = recallKey(msgId);
    var state = getState();

    if (state[key]) delete state[key];
    else state[key] = true;

    setState(state);

    try {
      var cid = currentChatId();
      if (cid && typeof renderChatMessages === 'function') {
        renderChatMessages(cid, { preserveScroll: true });
      }
    } catch (_) {}
  };

  function injectRecallToggle(html, msg, open) {
    if (!html || !msg) return html;

    var id = String(msg.id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var marker = '<div class="message-recall recall-near"';

    if (html.indexOf(marker) === -1) return html;

    return html.replace(
      marker,
      '<div class="message-recall recall-near rl7-recall-toggle' +
        (open ? ' rl7-recall-open' : '') +
        '" role="button" aria-label="' +
        (open ? 'Hide recalled message' : 'Show recalled message') +
        '" onclick="event.stopPropagation();RL7ToggleRecallReveal(\'' + id + '\')"'
    );
  }

  function installRecallPatch() {
    if (window.__RL7_RECALL_TOGGLE_PATCHED__) return true;
    if (typeof window._buildSingleMessageHtml !== 'function') return false;

    var previous = window._buildSingleMessageHtml;

    window._buildSingleMessageHtml = function (msg, ctx) {
      if (!msg || !msg.isRecall || !msg.recalledContent) {
        return previous(msg, ctx);
      }

      var globalShow = false;
      try {
        globalShow = !!(Storage.getShowRecallContent && Storage.getShowRecallContent());
      } catch (_) {}

      if (globalShow) {
        return previous(msg, ctx);
      }

      var open = isRevealed(msg.id);

      /* The original renderer only reveals recalled content when
         Storage.getShowRecallContent() returns true. For this one message,
         temporarily report true while rendering, then restore immediately. */
      if (open && Storage.getShowRecallContent) {
        var originalGetter = Storage.getShowRecallContent;
        try {
          Storage.getShowRecallContent = function () { return true; };
          return injectRecallToggle(previous(msg, ctx), msg, true);
        } finally {
          Storage.getShowRecallContent = originalGetter;
        }
      }

      return injectRecallToggle(previous(msg, ctx), msg, false);
    };

    window.__RL7_RECALL_TOGGLE_PATCHED__ = true;
    return true;
  }

  function installCSS() {
    if (document.getElementById('rl7-card-recall-hotfix-style')) return;

    var style = document.createElement('style');
    style.id = 'rl7-card-recall-hotfix-style';
    style.textContent = `
      /* ---------- Wider shop / gift cards ---------- */
      #page-chat-room .gift-bubble {
        width: min(310px, calc(100vw - 82px)) !important;
        max-width: min(310px, calc(100vw - 82px)) !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }

      #page-chat-room .gift-card,
      #page-chat-room .rl7-action-card {
        width: 100% !important;
        box-sizing: border-box !important;
      }

      #page-chat-room .gift-card-name {
        word-break: normal !important;
        overflow-wrap: anywhere !important;
      }

      #page-chat-room .gift-card-greeting {
        word-break: normal !important;
        overflow-wrap: break-word !important;
        line-height: 1.45 !important;
      }

      /* ---------- Actual action buttons ---------- */
      #page-chat-room .rl7-card-actions {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        gap: 8px !important;
        margin-top: 14px !important;
      }

      #page-chat-room .rl7-card-actions button {
        appearance: none !important;
        -webkit-appearance: none !important;
        min-height: 40px !important;
        width: 100% !important;
        padding: 9px 10px !important;
        border: 1px solid rgba(190, 24, 93, 0.24) !important;
        border-radius: 11px !important;
        background: rgba(255, 240, 246, 0.94) !important;
        color: #9d174d !important;
        box-shadow:
          0 2px 8px rgba(190, 24, 93, 0.08),
          inset 0 1px 0 rgba(255,255,255,.85) !important;
        font: inherit !important;
        font-size: 13px !important;
        font-weight: 650 !important;
        line-height: 1.25 !important;
        text-align: center !important;
        cursor: pointer !important;
        -webkit-tap-highlight-color: transparent !important;
      }

      #page-chat-room .rl7-card-actions button:active {
        transform: scale(.97) !important;
        opacity: .82 !important;
      }

      /* The third "I'll pay for you" choice becomes the clear primary action. */
      #page-chat-room .rl7-card-actions button:nth-child(3) {
        grid-column: 1 / -1 !important;
        background: linear-gradient(135deg, #d92f73, #be185d) !important;
        border-color: transparent !important;
        color: #fff !important;
        box-shadow: 0 4px 12px rgba(190, 24, 93, .22) !important;
      }

      /* Two-button payment request stays neatly side-by-side. */
      #page-chat-room .rl7-card-status {
        margin-top: 10px !important;
        padding: 7px 9px !important;
        border-radius: 9px !important;
        background: rgba(190, 24, 93, .07) !important;
      }

      /* ---------- Recalled-message manual reveal ---------- */
      #page-chat-room .message-recall.rl7-recall-toggle {
        cursor: pointer !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }

      #page-chat-room .message-recall.rl7-recall-toggle::after {
        content: " · tap to view";
        opacity: .52;
        font-size: .88em;
      }

      #page-chat-room .message-recall.rl7-recall-toggle.rl7-recall-open::after {
        content: " · tap to hide";
      }
    `;
    document.head.appendChild(style);
  }

  function boot() {
    installCSS();

    if (!installRecallPatch()) {
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        if (installRecallPatch() || tries > 30) clearInterval(timer);
      }, 300);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(boot, 200);
    }, { once: true });
  } else {
    setTimeout(boot, 200);
  }
})();
