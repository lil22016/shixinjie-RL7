/* RL7 HARD FIX v2
 * Direct runtime overrides for:
 * 1) iOS keyboard/background viewport jump
 * 2) chat input text visibility
 * 3) one-line shared poke vocabulary
 *
 * This file intentionally overrides the original behavior AFTER all project scripts load.
 */
(function () {
  'use strict';

  var RL7 = window.RL7 = window.RL7 || {};
  var V = '20260915-hardfix2';

  function toast(s) {
    try { if (window.Core && Core.toast) Core.toast(s); } catch (_) {}
  }
  function esc(s) {
    try { if (window.Core && Core.escapeHtml) return Core.escapeHtml(String(s == null ? '' : s)); } catch (_) {}
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  /* =========================================================
     1. iOS viewport hard fix
     ========================================================= */
  function installHardCSS() {
    var old = document.getElementById('rl7-hardfix2-style');
    if (old) old.remove();

    var st = document.createElement('style');
    st.id = 'rl7-hardfix2-style';
    st.textContent = `
      html.rl7-ios-fix,
      html.rl7-ios-fix body {
        width:100% !important;
        max-width:100% !important;
        overflow:hidden !important;
        overscroll-behavior:none !important;
      }

      html.rl7-ios-fix body {
        position:fixed !important;
        inset:0 !important;
        margin:0 !important;
        padding:0 !important;
      }

      html.rl7-ios-fix #app.phone-frame {
        position:fixed !important;
        inset:0 !important;
        width:100% !important;
        height:100% !important;
        min-height:0 !important;
        max-height:none !important;
        overflow:hidden !important;
        transform:none !important;
        translate:none !important;
        margin:0 !important;
      }

      html.rl7-ios-fix #page-chat-room.page-fullscreen,
      html.rl7-ios-fix #page-chat-room.page-fullscreen.active {
        position:fixed !important;
        top:0 !important;
        right:0 !important;
        bottom:auto !important;
        left:0 !important;
        width:100% !important;
        height:var(--rl7-chat-height, 100dvh) !important;
        min-height:0 !important;
        max-height:none !important;
        transform:none !important;
        translate:none !important;
        margin:0 !important;
        padding-top:0 !important;
        padding-bottom:0 !important;
        overflow:hidden !important;
      }

      /* IMPORTANT: direct target for the actual textarea/input used by this site */
      html.rl7-ios-fix #chat-input,
      html.rl7-ios-fix .chat-input-bar #chat-input,
      html.rl7-ios-fix .chat-input-bar textarea#chat-input,
      html.rl7-ios-fix .chat-input-bar input#chat-input {
        color:#ffffff !important;
        -webkit-text-fill-color:#ffffff !important;
        caret-color:#ffffff !important;
        opacity:1 !important;
        font-size:16px !important;
        text-shadow:0 1px 2px rgba(0,0,0,.20) !important;
      }

      html.rl7-ios-fix #chat-input::placeholder,
      html.rl7-ios-fix .chat-input-bar textarea#chat-input::placeholder,
      html.rl7-ios-fix .chat-input-bar input#chat-input::placeholder {
        color:rgba(255,255,255,.62) !important;
        -webkit-text-fill-color:rgba(255,255,255,.62) !important;
        opacity:1 !important;
      }

      /* prevent WebKit focus zoom */
      html.rl7-ios-fix input,
      html.rl7-ios-fix textarea,
      html.rl7-ios-fix select {
        font-size:16px;
      }

      /* one-line poke card display */
      .rl7-pat-single {
        display:flex !important;
        align-items:center !important;
        min-height:44px;
        padding:0 4px;
      }
      .rl7-pat-single .rl7-pat-text {
        font-size:1rem;
        color:var(--text-dark,#26342f);
        word-break:break-word;
      }

      .rl7-pat-sheet {
        position:fixed; inset:0; z-index:100000;
        display:flex; align-items:flex-end; justify-content:center;
        padding:14px;
        background:rgba(0,0,0,.28);
      }
      .rl7-pat-sheet-card {
        width:min(520px,100%);
        max-height:75dvh;
        overflow:auto;
        box-sizing:border-box;
        border-radius:24px;
        padding:18px;
        background:rgba(245,255,249,.97);
        color:#25362f;
        box-shadow:0 18px 60px rgba(0,0,0,.24);
        -webkit-backdrop-filter:blur(20px);
        backdrop-filter:blur(20px);
      }
      .rl7-pat-title { font-weight:700; font-size:18px; margin-bottom:4px; }
      .rl7-pat-sub { font-size:12px; opacity:.62; margin-bottom:12px; }
      .rl7-pat-grid { display:flex; flex-wrap:wrap; gap:8px; }
      .rl7-pat-chip {
        border:0; border-radius:999px; padding:9px 12px;
        background:rgba(68,119,93,.12); color:#315543;
        font:inherit; font-size:13px;
      }
      .rl7-pat-editor {
        width:100%; min-height:190px; resize:vertical; box-sizing:border-box;
        border:1px solid rgba(40,80,60,.16); border-radius:14px;
        background:rgba(255,255,255,.85); color:#26342f !important;
        -webkit-text-fill-color:#26342f !important;
        padding:12px; font:inherit; font-size:16px !important; outline:none;
      }
      .rl7-pat-actions { display:flex; gap:10px; margin-top:14px; }
      .rl7-pat-actions button {
        flex:1; border:0; border-radius:14px; padding:12px; font-weight:650;
      }
      .rl7-pat-cancel { background:rgba(80,100,90,.10); color:#365749; }
      .rl7-pat-save { background:#8bcdb0; color:#15392b; }
      .rl7-pat-manage {
        border:0; background:transparent; color:#487b66;
        text-decoration:underline; padding:0 0 12px; font-size:12px;
      }
    `;
    document.head.appendChild(st);
    document.documentElement.classList.add('rl7-ios-fix');
  }

  function hardSetInputColor() {
    var input = document.getElementById('chat-input');
    if (!input) return;
    input.style.setProperty('color', '#ffffff', 'important');
    input.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
    input.style.setProperty('caret-color', '#ffffff', 'important');
    input.style.setProperty('font-size', '16px', 'important');
    input.style.setProperty('opacity', '1', 'important');
  }

  var _lastGoodFullHeight = 0;
  var _keyboardLikely = false;
  var _viewportRAF = 0;

  function chatIsActive() {
    var page = document.getElementById('page-chat-room');
    return !!(page && page.classList.contains('active'));
  }

  function resetRootScroll() {
    try { window.scrollTo(0, 0); } catch (_) {}
    try { document.documentElement.scrollTop = 0; } catch (_) {}
    try { document.body.scrollTop = 0; } catch (_) {}
  }

  function syncViewport(force) {
    if (_viewportRAF) cancelAnimationFrame(_viewportRAF);
    _viewportRAF = requestAnimationFrame(function () {
      _viewportRAF = 0;

      var vv = window.visualViewport;
      var innerH = window.innerHeight || document.documentElement.clientHeight || 0;
      var vvH = vv && vv.height ? vv.height : innerH;

      if (!_lastGoodFullHeight || (!_keyboardLikely && vvH > _lastGoodFullHeight)) {
        _lastGoodFullHeight = vvH;
      }

      var diff = _lastGoodFullHeight ? (_lastGoodFullHeight - vvH) : 0;
      _keyboardLikely = diff > 120;

      /* Never use visualViewport.offsetTop here.
         The original project adds it to .page-fullscreen top, which is the source
         of the visible "page shoots upward/downward" behavior on iOS. */
      document.documentElement.style.setProperty('--chat-offset', '0px', 'important');
      document.documentElement.style.setProperty('--kbd', '0px', 'important');

      if (chatIsActive()) {
        var h = vvH > 0 ? Math.round(vvH) : Math.round(innerH);
        document.documentElement.style.setProperty('--rl7-chat-height', h + 'px', 'important');

        var page = document.getElementById('page-chat-room');
        if (page) {
          page.style.setProperty('top', '0px', 'important');
          page.style.setProperty('left', '0px', 'important');
          page.style.setProperty('right', '0px', 'important');
          page.style.setProperty('height', h + 'px', 'important');
          page.style.setProperty('transform', 'none', 'important');
          page.style.setProperty('translate', 'none', 'important');
        }

        resetRootScroll();
      }

      hardSetInputColor();
    });
  }

  function stagedRecovery() {
    [0, 30, 80, 160, 320, 650, 1100].forEach(function (ms) {
      setTimeout(function () {
        syncViewport(true);
        hardSetInputColor();
      }, ms);
    });
  }

  function installViewportListeners() {
    if (window.__rl7ViewportFix2Installed) return;
    window.__rl7ViewportFix2Installed = true;

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncViewport, {passive:true});
      window.visualViewport.addEventListener('scroll', syncViewport, {passive:true});
    }
    window.addEventListener('resize', syncViewport, {passive:true});
    window.addEventListener('orientationchange', stagedRecovery, {passive:true});
    window.addEventListener('pageshow', stagedRecovery, {passive:true});
    window.addEventListener('focus', stagedRecovery, {passive:true});

    document.addEventListener('focusin', function (e) {
      if (e.target && e.target.id === 'chat-input') {
        hardSetInputColor();
        syncViewport(true);
        setTimeout(syncViewport, 60);
        setTimeout(syncViewport, 180);
        setTimeout(syncViewport, 400);
      }
    }, true);

    document.addEventListener('focusout', function (e) {
      if (e.target && e.target.id === 'chat-input') {
        stagedRecovery();
      }
    }, true);

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) stagedRecovery();
    });

    /* Catch any original code that rewrites the input style later. */
    var mo = new MutationObserver(function () {
      hardSetInputColor();
      if (chatIsActive()) syncViewport(false);
    });
    mo.observe(document.documentElement, {
      subtree:true, childList:true,
      attributes:true, attributeFilter:['style','class']
    });

    setInterval(hardSetInputColor, 1000);
  }

  /* =========================================================
     2. One-line shared poke vocabulary
     ========================================================= */
  function splitLegacyPat(text) {
    text = String(text == null ? '' : text).trim();
    if (!text) return '';

    try {
      if (typeof window._splitPatTemplate === 'function') {
        var parts = window._splitPatTemplate(text);
        if (parts) {
          var a = String(parts.a || '').trim();
          var b = String(parts.b || '').trim();
          if (a) return a;
          if (b) return b;
        }
      }
    } catch (_) {}

    /* Common old storage format fallbacks. */
    text = text
      .replace(/^[（(]?\s*对方\s*[）)]?\s*[:：]?\s*/i, '')
      .replace(/[（(]?\s*我方\s*[）)]?\s*[:：]?\s*.*$/i, '')
      .trim();
    return text;
  }

  function patPhrase(p) {
    if (!p) return '';
    if (p.phrase && String(p.phrase).trim()) return String(p.phrase).trim();
    if (p.a && String(p.a).trim()) return String(p.a).trim();
    if (p.b && String(p.b).trim()) return String(p.b).trim();
    return splitLegacyPat(p.text);
  }

  function getPats() {
    try { return (Storage.getPats && Storage.getPats()) || []; } catch (_) { return []; }
  }

  function setPats(list) {
    try {
      if (Storage.setPats) Storage.setPats(list);
      else localStorage.setItem('pats', JSON.stringify(list));
    } catch (_) {}
  }

  function myName() {
    try {
      var p = Storage.getMyProfile();
      return (p && p.nickname) ? p.nickname : '我';
    } catch (_) { return '我'; }
  }

  function partnerName() {
    try {
      if (typeof window._getCurrentPartnerName === 'function') {
        var n = window._getCurrentPartnerName();
        if (n) return n;
      }
    } catch (_) {}
    try {
      var page = document.getElementById('page-chat-room');
      var id = page && page.dataset ? page.dataset.chatId : '';
      var ps = Storage.getPartnerProfiles ? Storage.getPartnerProfiles() : [];
      for (var i=0;i<ps.length;i++) if (ps[i].id === id) return ps[i].nickname || '对方';
    } catch (_) {}
    return '对方';
  }

  function currentChatId() {
    try {
      if (typeof window._currentChatId === 'function') return window._currentChatId() || '';
    } catch (_) {}
    var page = document.getElementById('page-chat-room');
    return page && page.dataset ? (page.dataset.chatId || '') : '';
  }

  function sendPatMessage(mode, phrase) {
    phrase = String(phrase || '').trim();
    if (!phrase) { toast('拍一拍内容不能为空'); return; }

    var chatId = currentChatId();
    if (!chatId) { toast('请先进入聊天'); return; }

    var actor = mode === 'other' ? partnerName() : myName();
    var finalText = '(' + actor + ') ' + phrase;

    try {
      var messages = Storage.getMessages(chatId) || [];
      messages.push({
        id: Date.now(),
        type: mode === 'other' ? 'other' : 'self',
        text: finalText,
        time: Date.now(),
        msgType: 'pat',
        isPat: true
      });
      Storage.setMessages(chatId, messages);
      if (typeof window.updateLastMsg === 'function') updateLastMsg(chatId, finalText);
      if (typeof window.renderChatMessages === 'function') renderChatMessages(chatId);
      try {
        if (window.App && App.playSound) App.playSound(mode === 'other' ? 'receive' : 'send');
      } catch (_) {}
    } catch (e) {
      console.error('[RL7 hardfix pat]', e);
      toast('发送失败');
    }
  }

  function closePatSheet() {
    var el = document.getElementById('rl7-pat-sheet');
    if (el) el.remove();
  }

  function showPatSheet(inner) {
    closePatSheet();
    var el = document.createElement('div');
    el.id = 'rl7-pat-sheet';
    el.className = 'rl7-pat-sheet';
    el.innerHTML = '<div class="rl7-pat-sheet-card" onclick="event.stopPropagation()">' + inner + '</div>';
    el.onclick = closePatSheet;
    document.body.appendChild(el);
    return el;
  }

  function saveSharedPhrases(lines) {
    var phrases = lines.map(function(x){return String(x||'').trim();}).filter(Boolean);
    var seen = {};
    phrases = phrases.filter(function(x){ if (seen[x]) return false; seen[x]=1; return true; });

    var old = getPats();
    var group = (window._patCurrentGroup || '基础');
    var next = phrases.map(function(phrase, i) {
      var existing = old[i] || {};
      return {
        id: existing.id || ('pat_' + Date.now() + '_' + i),
        group: existing.group || group,
        phrase: phrase,
        a: phrase,
        b: '',
        text: phrase
      };
    });

    setPats(next);
    return next;
  }

  function openPatEditor(mode) {
    var pats = getPats();
    var phrases = pats.map(patPhrase).filter(Boolean);
    var el = showPatSheet(
      '<div class="rl7-pat-title">拍一拍词库</div>' +
      '<div class="rl7-pat-sub">两边共享同一个词库，一行一个。系统只会在前面自动加名字，不会再在后面加“我/我方”。</div>' +
      '<textarea id="rl7-pat-editor" class="rl7-pat-editor">' + esc(phrases.join('\n')) + '</textarea>' +
      '<div class="rl7-pat-actions">' +
      '<button class="rl7-pat-cancel" id="rl7-pat-back">返回</button>' +
      '<button class="rl7-pat-save" id="rl7-pat-save">保存</button>' +
      '</div>'
    );
    el.querySelector('#rl7-pat-back').onclick = function(){ window.openPatPanel(mode); };
    el.querySelector('#rl7-pat-save').onclick = function(){
      saveSharedPhrases(el.querySelector('#rl7-pat-editor').value.split(/\r?\n/));
      toast('拍一拍词库已保存');
      window.openPatPanel(mode);
      decoratePatCards();
    };
  }

  function hardOpenPatPanel(mode) {
    mode = mode === 'other' ? 'other' : 'self';
    var phrases = getPats().map(patPhrase).filter(Boolean);

    if (!phrases.length) {
      phrases = ['pokes your cheek','boops your nose','ruffles your hair','tugs your sleeve'];
    }

    var actor = mode === 'other' ? partnerName() : myName();
    var chips = phrases.map(function(p, i){
      return '<button class="rl7-pat-chip" data-i="'+i+'">'+esc(p)+'</button>';
    }).join('');

    var el = showPatSheet(
      '<div class="rl7-pat-title">' + esc(actor) + ' · 拍一拍</div>' +
      '<div class="rl7-pat-sub">发送格式：(' + esc(actor) + ') + 词条</div>' +
      '<button class="rl7-pat-manage" id="rl7-pat-manage">批量编辑词库</button>' +
      '<div class="rl7-pat-grid">' + chips + '</div>' +
      '<div class="rl7-pat-actions"><button class="rl7-pat-cancel" id="rl7-pat-cancel">取消</button></div>'
    );

    el.querySelector('#rl7-pat-manage').onclick = function(){ openPatEditor(mode); };
    el.querySelector('#rl7-pat-cancel').onclick = closePatSheet;
    el.querySelectorAll('.rl7-pat-chip').forEach(function(btn){
      btn.onclick = function(){
        var p = phrases[parseInt(btn.getAttribute('data-i'),10)];
        sendPatMessage(mode, p);
        closePatSheet();
      };
    });
  }

  function hardSendPat(mode) {
    /* Compatibility with old inline button:
       take first non-empty old field but NEVER concatenate the second field. */
    var a = document.getElementById('pat-custom-a');
    var b = document.getElementById('pat-custom-b');
    var phrase = (a && a.value ? a.value : '').trim() ||
                 (b && b.value ? b.value : '').trim();
    if (!phrase) {
      var pats = getPats();
      if (pats.length) phrase = patPhrase(pats[Math.floor(Math.random()*pats.length)]);
    }
    sendPatMessage(mode === 'other' ? 'other' : 'self', phrase);
    try { if (typeof window.closePatPanel === 'function') window.closePatPanel(); } catch (_) {}
  }

  function hardSendPatFromWordcard(id) {
    var pats = getPats();
    var target = null;
    for (var i=0;i<pats.length;i++) {
      if (String(pats[i].id) === String(id)) { target = pats[i]; break; }
    }
    if (!target) return;
    sendPatMessage('other', patPhrase(target));
  }

  function hardAutoPatReply(chatId) {
    var pats = getPats();
    if (!pats.length) return;
    var phrase = patPhrase(pats[Math.floor(Math.random()*pats.length)]);
    if (!phrase) return;

    /* Ensure current room ID is available to shared sender. */
    var page = document.getElementById('page-chat-room');
    var old = page && page.dataset ? page.dataset.chatId : '';
    if (page && page.dataset && chatId) page.dataset.chatId = chatId;
    sendPatMessage('other', phrase);
    if (page && page.dataset && old && old !== chatId) page.dataset.chatId = old;
  }

  function decoratePatCards() {
    try {
      var pats = getPats();
      var byId = {};
      pats.forEach(function(p){ byId[String(p.id)] = patPhrase(p); });

      document.querySelectorAll('.card-list-item[data-pat-id]').forEach(function(item){
        var id = item.getAttribute('data-pat-id');
        var phrase = byId[id] || '';
        if (!phrase) return;
        var parts = item.querySelector('.pat-parts');
        if (!parts) return;
        parts.className = 'pat-parts rl7-pat-single';
        parts.innerHTML = '<span class="rl7-pat-text">' + esc(phrase) + '</span>';
      });
    } catch (_) {}
  }

  function installPatOverrides() {
    /* These names are used by inline onclick and by chat code. */
    window.openPatPanel = hardOpenPatPanel;
    window.sendPat = hardSendPat;
    window.sendPatFromWordcard = hardSendPatFromWordcard;
    window._sendPatAutoReply = hardAutoPatReply;

    /* Wrap renderers so the card UI itself becomes one-line too. */
    if (!window.__rl7PatRenderWrapped) {
      window.__rl7PatRenderWrapped = true;

      if (typeof window.renderWordCardPatGroup === 'function') {
        var oldGroup = window.renderWordCardPatGroup;
        window.renderWordCardPatGroup = function(){
          var r = oldGroup.apply(this, arguments);
          setTimeout(decoratePatCards, 0);
          return r;
        };
      }
      if (typeof window.renderWordCardPat === 'function') {
        var oldPat = window.renderWordCardPat;
        window.renderWordCardPat = function(){
          var r = oldPat.apply(this, arguments);
          setTimeout(decoratePatCards, 0);
          return r;
        };
      }
    }

    decoratePatCards();
  }

  /* =========================================================
     boot AFTER all normal scripts have had a chance to export globals
     ========================================================= */
  function boot() {
    installHardCSS();
    hardSetInputColor();
    installViewportListeners();
    installPatOverrides();
    stagedRecovery();

    /* Re-assert overrides because init.js and other scripts may export the old
       function references after this dynamic file starts loading. */
    [50, 150, 400, 900, 1800, 3500].forEach(function(ms){
      setTimeout(function(){
        installHardCSS();
        hardSetInputColor();
        installPatOverrides();
        syncViewport(true);
      }, ms);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 0); });
  } else {
    setTimeout(boot, 0);
  }

  RL7.version = V;
  RL7.hardFixViewport = stagedRecovery;
  RL7.decoratePatCards = decoratePatCards;
})();
