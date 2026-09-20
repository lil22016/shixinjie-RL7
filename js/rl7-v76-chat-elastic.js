/* RL7 V81 — chat history stability
   V76 edge elasticity intentionally removed.
   Chat scrolling is now left entirely to the browser + chat.js history loader.
   No message data/storage behavior is changed. */
(function () {
  'use strict';

  function cleanLegacyState() {
    var box = document.getElementById('chat-messages');
    if (!box) return;
    box.style.removeProperty('transform');
    box.style.removeProperty('transition');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanLegacyState, { once: true });
  } else {
    cleanLegacyState();
  }

  document.addEventListener('pageshow', cleanLegacyState);
})();
