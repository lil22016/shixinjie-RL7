/* RL7 v53 — chat/nav/menu + wallpaper top-edge hotfix */
(function () {
  'use strict';
  if (window.__RL7_V53__) return;
  window.__RL7_V53__ = true;

  function addStyle() {
    var old = document.getElementById('rl7-v53-style');
    if (old) old.remove();

    var s = document.createElement('style');
    s.id = 'rl7-v53-style';
    s.textContent = `
/* Wallpaper only: do not change normal page padding/layout. */
html.liquid-theme #rl7-liquid-wallpaper,
#rl7-liquid-wallpaper {
  position: fixed !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100dvh !important;
  min-height: 100dvh !important;
  margin: 0 !important;
  padding: 0 !important;
  z-index: 0 !important;
  background-size: cover !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  transform: none !important;
}
html.liquid-theme,
html.liquid-theme body {
  background: transparent !important;
}
html.liquid-theme body > #app {
  position: relative !important;
  z-index: 1 !important;
  background: transparent !important;
}
html.liquid-theme #app-bg {
  background: transparent !important;
}

/* Chat room: bottom index bar must not exist visually while chat is active. */
html.rl7-chat-v53 .bottom-nav,
body.rl7-chat-v53 .bottom-nav,
html.rl7-chat-v53 #app > .bottom-nav {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* Chat itself occupies the viewport, independent of the normal bottom nav. */
html.rl7-chat-v53 #page-chat-room.page-fullscreen.active {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100dvh !important;
  min-height: 100dvh !important;
  max-height: 100dvh !important;
  margin: 0 !important;
  padding: 0 !important;
  z-index: 10000 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}
html.rl7-chat-v53 #page-chat-room .chat-room-header {
  padding-top: env(safe-area-inset-top, 0px) !important;
  flex: 0 0 auto !important;
}
html.rl7-chat-v53 #page-chat-room .chat-input-zone {
  padding-bottom: env(safe-area-inset-bottom, 0px) !important;
  flex: 0 0 auto !important;
}

/* Three-dot menu: explicit colors; do not inherit Liquid's white foreground/surface variables. */
html.rl7-chat-v53 #page-chat-room .chat-menu-panel,
html.rl7-chat-v53 .chat-menu-panel {
  background: rgba(28,29,34,.96) !important;
  background-color: rgba(28,29,34,.96) !important;
  color: #fff !important;
  border: 1px solid rgba(255,255,255,.18) !important;
  box-shadow: 0 14px 42px rgba(0,0,0,.38) !important;
  -webkit-backdrop-filter: blur(20px) saturate(115%) !important;
  backdrop-filter: blur(20px) saturate(115%) !important;
}
html.rl7-chat-v53 #page-chat-room .chat-menu-item,
html.rl7-chat-v53 #page-chat-room .chat-menu-item *,
html.rl7-chat-v53 .chat-menu-panel .chat-menu-item,
html.rl7-chat-v53 .chat-menu-panel .chat-menu-item * {
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
  text-shadow: none !important;
}
html.rl7-chat-v53 #page-chat-room .chat-menu-item + .chat-menu-item {
  border-top-color: rgba(255,255,255,.12) !important;
}
html.rl7-chat-v53 #page-chat-room .menu-toggle {
  background: rgba(255,255,255,.20) !important;
}
html.rl7-chat-v53 #page-chat-room .menu-toggle::after {
  background: #fff !important;
}
`;
    document.head.appendChild(s);
  }

  function isChatActive() {
    var p = document.getElementById('page-chat-room');
    return !!(p && p.classList.contains('active'));
  }

  function sync() {
    var on = isChatActive();
    document.documentElement.classList.toggle('rl7-chat-v53', on);
    document.body && document.body.classList.toggle('rl7-chat-v53', on);

    /* Direct fallback: even if another stylesheet wins specificity, hide the nav inline. */
    document.querySelectorAll('.bottom-nav').forEach(function (nav) {
      if (on) {
        if (!nav.dataset.rl7V53Display) nav.dataset.rl7V53Display = nav.style.display || '';
        nav.style.setProperty('display', 'none', 'important');
      } else {
        nav.style.removeProperty('display');
        if (nav.dataset.rl7V53Display) {
          nav.style.display = nav.dataset.rl7V53Display;
          delete nav.dataset.rl7V53Display;
        }
      }
    });
  }

  function boot() {
    /* Insert after all existing runtime theme styles so this patch wins. */
    setTimeout(addStyle, 300);
    setTimeout(addStyle, 1200);
    sync();

    var app = document.getElementById('app');
    if (app) {
      new MutationObserver(sync).observe(app, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });
    }

    if (window.Navigation && typeof Navigation._navigateTo === 'function' && !Navigation.__rl7v53) {
      Navigation.__rl7v53 = true;
      var original = Navigation._navigateTo;
      Navigation._navigateTo = function () {
        var result = original.apply(this, arguments);
        sync();
        return result;
      };
    }

    window.addEventListener('pageshow', function(){ setTimeout(addStyle, 50); sync(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();