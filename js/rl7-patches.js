/* RL7 HARD FIX v21
 * - robust iOS viewport + white chat input
 * - working MediaSession keepalive
 * - status-bar/safe-area color follows app background
 * - shared one-line poke vocabulary, no parentheses around names
 * - whereabouts = independent Location pool + Activity pool, batch editable
 *   report generation pairs them randomly at use time
 */
(function () {
  'use strict';

  var RL7 = window.RL7 = window.RL7 || {};
  var VERSION = '20260915-hardfix21';
  var LOC_KEY = 'rl7_whereabout_locations_v2';
  var ACT_KEY = 'rl7_whereabout_actions_v2';

  function esc(s) {
    try { if (window.Core && Core.escapeHtml) return Core.escapeHtml(String(s == null ? '' : s)); } catch (_) {}
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }
  function toast(s) { try { if (window.Core && Core.toast) Core.toast(s); } catch (_) {} }
  function uniq(lines) {
    var seen = {};
    return (lines || []).map(function(x){ return String(x || '').trim(); }).filter(function(x){
      if (!x || seen[x]) return false;
      seen[x] = 1; return true;
    });
  }
  function readArray(key) {
    try {
      var x = JSON.parse(localStorage.getItem(key) || 'null');
      return Array.isArray(x) ? uniq(x) : [];
    } catch (_) { return []; }
  }
  function writeArray(key, arr) {
    arr = uniq(arr);
    localStorage.setItem(key, JSON.stringify(arr));
    return arr;
  }

  /* =========================================================
     STATUS BAR / SAFE AREA COLOR
     ========================================================= */
  function syncChromeColor() {
    var chat = false;
    var apple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (apple) apple.setAttribute('content', 'default');
    try {
      var page = document.getElementById('page-chat-room');
      chat = !!(page && page.classList.contains('active'));
    } catch (_) {}
    var color = chat ? '#0d0f10' : '#e9f7ed';

    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);

    try {
      document.documentElement.style.setProperty('--rl7-chrome-bg', color);
      document.documentElement.style.setProperty('background-color', color, 'important');
      document.body.style.setProperty('background-color', color, 'important');
      var app = document.getElementById('app');
      if (app && !chat) app.style.setProperty('background-color', '#e9f7ed', 'important');
      if (app && chat) app.style.removeProperty('background-color');
    } catch (_) {}
  }

  /* =========================================================
     HARD CSS + iOS VIEWPORT
     ========================================================= */
  function installCSS() {
    var old = document.getElementById('rl7-hardfix3-style');
    if (old) old.remove();

    var st = document.createElement('style');
    st.id = 'rl7-hardfix3-style';
    st.textContent = `
      /* v19: DO NOT override html/body/#app/chat geometry.
         The site's own app.js + pages-chatroom.css are the only viewport engine. */
      #app.phone-frame,
      .page,
      .page-fullscreen {
        isolation:isolate;
      }

      /* force the actual chat editor to readable white */
      html.rl7-ios-fix #chat-input,
      html.rl7-ios-fix .chat-input-bar #chat-input,
      html.rl7-ios-fix .chat-input-bar textarea#chat-input,
      html.rl7-ios-fix .chat-input-bar input#chat-input {
        color:#fff !important;
        -webkit-text-fill-color:#fff !important;
        caret-color:#fff !important;
        opacity:1 !important;
        font-size:16px !important;
        text-shadow:0 1px 2px rgba(0,0,0,.2) !important;
      }
      html.rl7-ios-fix #chat-input::placeholder,
      html.rl7-ios-fix .chat-input-bar textarea#chat-input::placeholder,
      html.rl7-ios-fix .chat-input-bar input#chat-input::placeholder {
        color:rgba(255,255,255,.62) !important;
        -webkit-text-fill-color:rgba(255,255,255,.62) !important;
        opacity:1 !important;
      }



      /* Chat topbar readability */
      #page-chat-room .chat-room-title {
        color:#ffffff !important;
        text-shadow:0 1px 2px rgba(0,0,0,.95), 0 0 5px rgba(0,0,0,.70) !important;
      }
      #page-chat-room .chat-room-status {
        color:rgba(255,255,255,.84) !important;
        text-shadow:0 1px 3px rgba(0,0,0,.92) !important;
      }
      #page-chat-room .chat-room-status .chat-room-status-sep {
        color:rgba(255,255,255,.68) !important;
      }
      #page-chat-room .chat-room-back,
      #page-chat-room .chat-room-action,
      #page-chat-room .chat-room-back i,
      #page-chat-room .chat-room-action i {
        color:rgba(255,255,255,.92) !important;
        text-shadow:0 1px 3px rgba(0,0,0,.88) !important;
      }

      /* 心流：保留原本 semantic color，只增加同色系毛玻璃 */
      #page-chat-room .chat-mood-intent,
      #page-chat-room .message-tags-row .chat-mood-intent {
        background:color-mix(in srgb, currentColor 16%, rgba(28,31,33,.38)) !important;
        border:1px solid color-mix(in srgb, currentColor 42%, rgba(255,255,255,.20)) !important;
        border-radius:12px !important;
        padding:5px 10px !important;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.18),
          0 3px 10px rgba(0,0,0,.16) !important;
        -webkit-backdrop-filter:blur(14px) saturate(135%) !important;
        backdrop-filter:blur(14px) saturate(135%) !important;
        text-shadow:0 1px 2px rgba(0,0,0,.78), 0 0 4px rgba(0,0,0,.46) !important;
      }


      /* 只放大图标，不改变首页网格和底栏的位置 */
      #page-home .home-feature-icon {
        width:48px !important;
        height:48px !important;
        border-radius:17px !important;
        font-size:22px !important;
      }
      .bottom-nav .nav-icon-circle {
        width:48px !important;
        height:48px !important;
        border-radius:17px !important;
        font-size:22px !important;
      }


      /* v21 — two targeted fixes only */

      /* CHAT:
         On this iPhone/PWA, --chat-h already has the correct full visual height,
         but the fixed chat page was starting at y=0 under the status bar.
         Shifting the whole chat by safe-top reproduces the user's manual pull:
         top clears the iOS UI and the unchanged height reaches the physical bottom. */
      html.rl7-ios-fix #page-chat-room.page-fullscreen,
      html.rl7-ios-fix #page-chat-room.page-fullscreen.active {
        top:calc(env(safe-area-inset-top, 0px) + var(--chat-offset, 0px)) !important;
      }

      /* While keyboard is open, subtract safe-top from chat height so the bottom
         remains exactly at the keyboard top instead of extending behind it. */
      html.rl7-kbd-open #page-chat-room.page-fullscreen,
      html.rl7-kbd-open #page-chat-room.page-fullscreen.active {
        height:calc(var(--chat-h, 100dvh) - env(safe-area-inset-top, 0px)) !important;
      }

      /* HOME NAV PORTAL:
         The nav is moved out of #app at runtime and becomes a top-level body child.
         That avoids #app/page clipping and makes its stacking order unambiguous. */
      body > .bottom-nav.rl7-nav-portal {
        position:fixed !important;
        left:0 !important;
        right:0 !important;
        top:auto !important;
        bottom:calc(0px - env(safe-area-inset-top, 0px)) !important;
        margin:0 auto !important;
        padding:6px 18px 8px !important;
        z-index:100000 !important;
        transform:none !important;
        translate:none !important;
        background:transparent !important;
        background-image:none !important;
        backdrop-filter:none !important;
        -webkit-backdrop-filter:none !important;
        pointer-events:none !important;
      }
      body > .bottom-nav.rl7-nav-portal .nav-item {
        pointer-events:auto !important;
      }
      html.rl7-chat-pinned body > .bottom-nav.rl7-nav-portal {
        visibility:hidden !important;
        pointer-events:none !important;
      }

      /* Blend the formerly visible bottom strip into the actual app background. */
      html.rl7-ios-fix:not(.rl7-chat-pinned),
      html.rl7-ios-fix:not(.rl7-chat-pinned) body {
        background-color:var(--bg-main, #e9f7ed) !important;
        background-image:var(--bg-gradient, none) !important;
        background-attachment:fixed !important;
        background-repeat:no-repeat !important;
        background-size:cover !important;
      }

      /* Portal icon sizing: keep the requested larger icons. */
      body > .bottom-nav.rl7-nav-portal .nav-icon-circle {
        width:48px !important;
        height:48px !important;
        border-radius:17px !important;
        font-size:22px !important;
      }

      /* chat bottom "+" panel: glass background + readable labels */
      #chat-panel-area.open-plus,
      #plus-panel,
      #plus-panel.active,
      .plus-panel,
      .plus-menu-panel {
        background:rgba(24,28,29,.66) !important;
        -webkit-backdrop-filter:blur(24px) saturate(135%) !important;
        backdrop-filter:blur(24px) saturate(135%) !important;
      }

      #plus-panel.active {
        border-top:1px solid rgba(255,255,255,.12) !important;
        box-shadow:0 -10px 28px rgba(0,0,0,.18) !important;
      }

      #plus-panel .plus-menu-item,
      #plus-panel .plus-menu-item *,
      .plus-menu-panel .plus-menu-item,
      .plus-menu-panel .plus-menu-item * {
        color:rgba(255,255,255,.96) !important;
      }

      #plus-panel .plus-menu-item span,
      #plus-panel .plus-menu-item .label,
      #plus-panel .plus-menu-label,
      #plus-panel .plus-item-label,
      .plus-menu-panel .plus-menu-item span,
      .plus-menu-panel .plus-menu-label {
        color:#fff !important;
        opacity:1 !important;
        text-shadow:0 1px 3px rgba(0,0,0,.75) !important;
      }

      #plus-panel .plus-menu-item i,
      #plus-panel .plus-menu-item svg,
      .plus-menu-panel .plus-menu-item i,
      .plus-menu-panel .plus-menu-item svg {
        color:#fff !important;
        fill:currentColor;
      }

      #plus-panel .plus-menu-item > div:first-child,
      #plus-panel .plus-menu-icon,
      #plus-panel .plus-item-icon,
      .plus-menu-panel .plus-menu-icon {
        background:rgba(255,255,255,.10) !important;
        border:1px solid rgba(255,255,255,.06) !important;
      }

      /* keep the text input bar itself lightly glassy as well */
      .chat-input-bar {
        background:rgba(24,28,29,.42) !important;
        -webkit-backdrop-filter:blur(18px) saturate(125%) !important;
        backdrop-filter:blur(18px) saturate(125%) !important;
        border-top:1px solid rgba(255,255,255,.08) !important;
      }

      /* generic sheets */
      .rl7-sheet {
        position:fixed; inset:0; z-index:100000;
        display:flex; align-items:flex-end; justify-content:center;
        padding:14px; background:rgba(0,0,0,.28);
      }
      .rl7-sheet-card {
        width:min(540px,100%); max-height:82dvh; overflow:auto;
        box-sizing:border-box; border-radius:24px; padding:18px;
        background:rgba(246,255,249,.97); color:#25362f;
        box-shadow:0 18px 60px rgba(0,0,0,.24);
        -webkit-backdrop-filter:blur(22px); backdrop-filter:blur(22px);
      }
      .rl7-title {font-size:18px;font-weight:750;margin-bottom:4px}
      .rl7-sub {font-size:12px;opacity:.62;margin-bottom:14px;line-height:1.5}
      .rl7-label {font-size:13px;font-weight:700;margin:14px 0 7px}
      .rl7-textarea {
        width:100%; min-height:160px; resize:vertical; box-sizing:border-box;
        border:1px solid rgba(40,80,60,.16); border-radius:14px;
        padding:12px; background:rgba(255,255,255,.86);
        color:#26342f !important; -webkit-text-fill-color:#26342f !important;
        font:inherit; font-size:16px !important; outline:none;
      }
      .rl7-actions{display:flex;gap:10px;margin-top:14px}
      .rl7-actions button{flex:1;border:0;border-radius:14px;padding:12px;font-weight:700}
      .rl7-secondary{background:rgba(80,100,90,.10);color:#365749}
      .rl7-primary{background:#8bcdb0;color:#15392b}
      .rl7-link{border:0;background:transparent;color:#477a65;text-decoration:underline;font-size:12px;padding:3px 0 10px}

      /* whereabouts pools */
      .rl7-wa-wrap{padding:4px 2px 20px}
      .rl7-wa-section{
        background:rgba(255,255,255,.56); border-radius:20px;
        padding:15px; margin:12px 0; border:1px solid rgba(255,255,255,.45);
      }
      .rl7-wa-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
      .rl7-wa-head strong{font-size:16px}
      .rl7-wa-count{font-size:12px;opacity:.55}
      .rl7-wa-chips{display:flex;flex-wrap:wrap;gap:8px}
      .rl7-wa-chip{
        display:inline-flex;align-items:center;gap:6px;border-radius:999px;
        padding:8px 11px;background:rgba(116,190,155,.14);font-size:13px;
      }
      .rl7-wa-chip button{border:0;background:transparent;padding:0;color:#7d9188;font-size:12px}
      .rl7-wa-edit{
        border:0;border-radius:999px;padding:7px 11px;background:rgba(130,202,169,.22);
        color:#315543;font-size:12px
      }
      .rl7-wa-preview{
        margin-top:13px;padding:12px 14px;border-radius:15px;
        background:rgba(130,202,169,.10);font-size:13px;line-height:1.55;color:#50685d;
      }

      /* poke one line */
      .rl7-pat-single{display:flex!important;align-items:center!important;min-height:44px;padding:0 4px}
      .rl7-pat-single .rl7-pat-text{font-size:1rem;color:var(--text-dark,#26342f);word-break:break-word}
      .rl7-chip-grid{display:flex;flex-wrap:wrap;gap:8px}
      .rl7-chip-btn{
        border:0;border-radius:999px;padding:9px 12px;
        background:rgba(68,119,93,.12);color:#315543;font:inherit;font-size:13px;
      }

      /* optional keepalive status pill injected beside settings label */
      .rl7-ka-status{font-size:11px;margin-left:8px;opacity:.65}
    `;
    document.head.appendChild(st);
    document.documentElement.classList.add('rl7-ios-fix');
  }

  function hardInputWhite() {
    var x = document.getElementById('chat-input');
    if (!x) return;
    x.style.setProperty('color','#fff','important');
    x.style.setProperty('-webkit-text-fill-color','#fff','important');
    x.style.setProperty('caret-color','#fff','important');
    x.style.setProperty('font-size','16px','important');
    x.style.setProperty('opacity','1','important');
  }

  var lastFullH = 0, keyboard = false, raf = 0;
  function chatActive() {
    var p = document.getElementById('page-chat-room');
    return !!(p && p.classList.contains('active'));
  }
  function zeroScroll() {
    try { window.scrollTo(0,0); } catch(_){}
    try { document.documentElement.scrollTop=0; document.body.scrollTop=0; } catch(_){}
  }

  function keyboardOpenNow() {
    try {
      var vv = window.visualViewport;
      var ih = window.innerHeight || document.documentElement.clientHeight || 0;
      var vh = vv && vv.height ? vv.height : ih;
      var diff = Math.max(0, ih - vh);
      var kind = (vv && vv.type) || '';
      return kind === 'virtual-keyboard' || (ih > 0 && diff >= 120 && diff / ih >= 0.15);
    } catch (_) {
      return false;
    }
  }

  function syncKeyboardClass() {
    document.documentElement.classList.toggle('rl7-kbd-open', keyboardOpenNow());
  }

  function portalHomeNav() {
    try {
      var nav = document.querySelector('.bottom-nav');
      if (!nav) return;
      if (!nav.classList.contains('rl7-nav-portal')) {
        nav.classList.add('rl7-nav-portal');
        document.body.appendChild(nav);
      }
    } catch (_) {}
  }

  function syncChatStateClass() {
    var active = chatActive();
    document.documentElement.classList.toggle('rl7-chat-pinned', active);
    syncKeyboardClass();
  }

  function syncViewport() {
    /* v19: layout intentionally left to the original app.js.
       This helper only re-applies visual input styling. */
    hardInputWhite();
  }

  function releaseLayoutControl() {
    try {
      document.documentElement.style.removeProperty('--rl7-chat-height');
      var page = document.getElementById('page-chat-room');
      if (page) {
        ['top','right','bottom','left','width','height','min-height','max-height',
         'transform','translate','margin','padding-top','padding-bottom',
         'box-sizing','position'].forEach(function(prop){
          page.style.removeProperty(prop);
        });
      }
    } catch (_) {}
  }

  function stagedRecovery(){
    [0,60,180,420].forEach(function(ms){
      setTimeout(function(){
        releaseLayoutControl();
        hardInputWhite();
        syncChromeColor();
      },ms);
    });
  }

  /* =========================================================
     KEEPALIVE: explicitly load the library and own start/stop
     ========================================================= */
  var keeper = null, keepLoading = null;
  function ensureKeepLib() {
    if (window.createBackgroundKeepAlive) return Promise.resolve();
    if (keepLoading) return keepLoading;
    keepLoading = new Promise(function(resolve,reject){
      var old=document.getElementById('rl7-keepalive-lib');
      if(old) old.remove();
      var s=document.createElement('script');
      s.id='rl7-keepalive-lib';
      s.src='js/background-keepalive.js?v='+VERSION;
      s.onload=function(){resolve();};
      s.onerror=function(){reject(new Error('keepalive library failed to load'));};
      document.head.appendChild(s);
    });
    return keepLoading;
  }
  function keepStatus(st) {
    window.__rl7KeepAliveStatus = st || {};
    try {
      document.querySelectorAll('.rl7-ka-status').forEach(function(x){
        x.textContent = st && st.playing ? 'Playing' : (st && st.error ? 'Retrying' : 'Ready');
      });
    } catch(_){}
  }
  function makeKeeper() {
    if (keeper) return keeper;
    if (!window.createBackgroundKeepAlive) return null;
    keeper = window.createBackgroundKeepAlive({
      title:'Background keepalive',
      artist:'拾心界',
      manageMediaSession:true,
      onStatus:keepStatus
      /* intentionally no isOtherAudioPlaying:
         maximum keepalive priority, as requested */
    });
    return keeper;
  }
  function startKeepAliveStrong() {
    return ensureKeepLib().then(function(){
      var k=makeKeeper();
      if(!k) return false;
      return k.enable();
    }).catch(function(e){
      keepStatus({enabled:true,playing:false,error:String(e)});
      return false;
    });
  }
  function stopKeepAliveStrong() {
    if(keeper) keeper.disable();
  }
  window.startKeepAliveAudio = startKeepAliveStrong;
  window.stopKeepAliveAudio = stopKeepAliveStrong;

  /* user gesture fallback: if the setting was already on at boot, iOS may have
     rejected autoplay. First tap anywhere resumes it. */
  function settingWantsKeepalive(){
    try { return !!(Storage.getBackgroundKeepAlive && Storage.getBackgroundKeepAlive()); } catch(_){return false;}
  }
  function gestureResume(){
    if(settingWantsKeepalive()) startKeepAliveStrong();
  }
  document.addEventListener('pointerdown',gestureResume,{passive:true});
  document.addEventListener('touchstart',gestureResume,{passive:true});
  document.addEventListener('click',gestureResume,{passive:true});

  /* =========================================================
     POKE: single shared phrase, batch editor, NAME WITHOUT ()
     ========================================================= */
  function splitLegacyPat(text){
    text=String(text==null?'':text).trim();
    if(!text) return '';
    try {
      if(typeof window._splitPatTemplate==='function'){
        var p=window._splitPatTemplate(text);
        if(p){
          var a=String(p.a||'').trim(), b=String(p.b||'').trim();
          if(a) return a;
          if(b) return b;
        }
      }
    } catch(_){}
    return text.replace(/^[（(]?\s*对方\s*[）)]?\s*[:：]?\s*/i,'')
      .replace(/[（(]?\s*我方\s*[）)]?\s*[:：]?\s*.*$/i,'').trim();
  }
  function patPhrase(p){
    if(!p)return '';
    return String(p.phrase||p.a||p.b||splitLegacyPat(p.text)||'').trim();
  }
  function pats(){try{return Storage.getPats?Storage.getPats():[];}catch(_){return[];}}
  function savePats(list){try{if(Storage.setPats)Storage.setPats(list);}catch(_){}}
  function partnerName(){
    try{if(typeof _getCurrentPartnerName==='function'){var n=_getCurrentPartnerName();if(n)return n;}}catch(_){}
    return '对方';
  }
  function selfName(){
    try{var p=Storage.getMyProfile();return(p&&p.nickname)||'我';}catch(_){return'我';}
  }
  function chatId(){
    try{if(typeof _currentChatId==='function')return _currentChatId()||'';}catch(_){}
    var p=document.getElementById('page-chat-room');return p&&p.dataset?p.dataset.chatId:'';
  }
  function closeSheet(){var x=document.getElementById('rl7-sheet');if(x)x.remove();}
  function sheet(inner){
    closeSheet();
    var x=document.createElement('div');x.id='rl7-sheet';x.className='rl7-sheet';
    x.innerHTML='<div class="rl7-sheet-card" onclick="event.stopPropagation()">'+inner+'</div>';
    x.onclick=closeSheet;document.body.appendChild(x);return x;
  }
  function sendPat(mode, phrase){
    phrase=String(phrase||'').trim();if(!phrase)return;
    var id=chatId();if(!id){toast('请先进入聊天');return;}
    var actor=mode==='other'?partnerName():selfName();
    /* NO parentheses */
    var text=actor+' '+phrase;
    try{
      var m=Storage.getMessages(id)||[];
      m.push({id:Date.now(),type:mode==='other'?'other':'self',text:text,time:Date.now(),msgType:'pat',isPat:true});
      Storage.setMessages(id,m);
      if(typeof updateLastMsg==='function')updateLastMsg(id,text);
      if(typeof renderChatMessages==='function')renderChatMessages(id);
      if(window.App&&App.playSound)App.playSound(mode==='other'?'receive':'send');
    }catch(e){console.error(e);}
  }
  function savePatLines(lines){
    var phrases=uniq(lines), old=pats(), group=window._patCurrentGroup||'基础';
    var next=phrases.map(function(q,i){
      var o=old[i]||{};
      return {id:o.id||('pat_'+Date.now()+'_'+i),group:o.group||group,phrase:q,a:q,b:'',text:q};
    });
    savePats(next);return next;
  }
  function openPatEditor(mode){
    var phrases=pats().map(patPhrase).filter(Boolean);
    var x=sheet('<div class="rl7-title">批量编辑拍一拍</div>'+
      '<div class="rl7-sub">一行一个。两边共享同一个词库。发送时只会自动加名字，例如：Loki pokes your cheek。</div>'+
      '<textarea class="rl7-textarea" id="rl7-pat-lines">'+esc(phrases.join('\n'))+'</textarea>'+
      '<div class="rl7-actions"><button class="rl7-secondary" id="rl7-pat-back">返回</button><button class="rl7-primary" id="rl7-pat-save">保存</button></div>');
    x.querySelector('#rl7-pat-back').onclick=function(){openPatPanelStrong(mode);};
    x.querySelector('#rl7-pat-save').onclick=function(){
      savePatLines(x.querySelector('#rl7-pat-lines').value.split(/\r?\n/));
      toast('已保存');openPatPanelStrong(mode);decoratePats();
    };
  }
  function openPatPanelStrong(mode){
    mode=mode==='other'?'other':'self';
    var phrases=pats().map(patPhrase).filter(Boolean);
    if(!phrases.length)phrases=['pokes your cheek','boops your nose','ruffles your hair','tugs your sleeve'];
    var actor=mode==='other'?partnerName():selfName();
    var x=sheet('<div class="rl7-title">'+esc(actor)+' · 拍一拍</div>'+
      '<div class="rl7-sub">格式：'+esc(actor)+' + 词条（不加括号）</div>'+
      '<button class="rl7-link" id="rl7-pat-edit">批量编辑词库</button>'+
      '<div class="rl7-chip-grid">'+phrases.map(function(q,i){return'<button class="rl7-chip-btn" data-i="'+i+'">'+esc(q)+'</button>';}).join('')+'</div>'+
      '<div class="rl7-actions"><button class="rl7-secondary" id="rl7-pat-cancel">取消</button></div>');
    x.querySelector('#rl7-pat-edit').onclick=function(){openPatEditor(mode);};
    x.querySelector('#rl7-pat-cancel').onclick=closeSheet;
    x.querySelectorAll('[data-i]').forEach(function(b){b.onclick=function(){sendPat(mode,phrases[+b.dataset.i]);closeSheet();};});
  }
  function decoratePats(){
    var map={};pats().forEach(function(p){map[String(p.id)]=patPhrase(p);});
    document.querySelectorAll('.card-list-item[data-pat-id]').forEach(function(item){
      var q=map[String(item.dataset.patId)];if(!q)return;
      var box=item.querySelector('.pat-parts');if(!box)return;
      /* Important: do not rewrite innerHTML repeatedly.
         The previous observer could rewrite -> trigger observer -> rewrite forever,
         which is why opening “基础” could freeze the whole app. */
      if (box.getAttribute('data-rl7-pat') === q) return;
      box.setAttribute('data-rl7-pat', q);
      box.className='pat-parts rl7-pat-single';
      box.innerHTML='<span class="rl7-pat-text">'+esc(q)+'</span>';
    });
  }

  function defaultPatGroup(){
    var ps=pats();
    if(window._patCurrentGroup) return window._patCurrentGroup;
    if(ps.length && ps[0].group) return ps[0].group;
    return '基础';
  }

  function appendPatLines(lines){
    var add=uniq(lines);
    if(!add.length){toast('请输入至少一条拍一拍');return 0;}
    var ps=pats().slice();
    var existing={};
    ps.forEach(function(x){existing[patPhrase(x)]=1;});
    var group=defaultPatGroup();
    var now=Date.now(), n=0;
    add.forEach(function(q,i){
      if(existing[q]) return;
      ps.push({
        id:'pat_'+now+'_'+i,
        group:group,
        phrase:q,
        a:q,
        b:'',
        text:q
      });
      existing[q]=1;n++;
    });
    savePats(ps);
    return n;
  }

  function openBulkAddPat(){
    var x=sheet(
      '<div class="rl7-title">批量添加拍一拍</div>'+
      '<div class="rl7-sub">只需要填写对方动作。一行一个，可以一次粘贴很多条。不会再要求“我方动作”，也不会再拼接“：想你了”。</div>'+
      '<textarea class="rl7-textarea" id="rl7-pat-add-lines" placeholder="pokes your cheek\nboops your nose\nruffles your hair"></textarea>'+
      '<div class="rl7-actions"><button class="rl7-secondary" id="rl7-pat-add-cancel">取消</button><button class="rl7-primary" id="rl7-pat-add-save">批量添加</button></div>'
    );
    x.querySelector('#rl7-pat-add-cancel').onclick=closeSheet;
    x.querySelector('#rl7-pat-add-save').onclick=function(){
      var n=appendPatLines(x.querySelector('#rl7-pat-add-lines').value.split(/\r?\n/));
      if(!n)return;
      closeSheet();
      try{ if(typeof renderWordCardPat==='function') renderWordCardPat(); }catch(_){}
      try{ if(typeof renderWordCardPatGroup==='function' && window._patCurrentGroup) renderWordCardPatGroup(); }catch(_){}
      setTimeout(decoratePats,20);
      toast('已批量添加 '+n+' 条');
    };
  }

  function openSinglePatEdit(id){
    var ps=pats(), idx=-1;
    for(var i=0;i<ps.length;i++) if(String(ps[i].id)===String(id)){idx=i;break;}
    if(idx<0)return;
    var q=patPhrase(ps[idx]);
    var x=sheet(
      '<div class="rl7-title">编辑拍一拍</div>'+
      '<div class="rl7-sub">只保留一条动作文本。</div>'+
      '<textarea class="rl7-textarea" id="rl7-pat-edit-one">'+esc(q)+'</textarea>'+
      '<div class="rl7-actions"><button class="rl7-secondary" id="rl7-pat-edit-cancel">取消</button><button class="rl7-primary" id="rl7-pat-edit-save">保存</button></div>'
    );
    x.querySelector('#rl7-pat-edit-cancel').onclick=closeSheet;
    x.querySelector('#rl7-pat-edit-save').onclick=function(){
      var v=x.querySelector('#rl7-pat-edit-one').value.trim();
      if(!v){toast('内容不能为空');return;}
      ps[idx].phrase=v; ps[idx].a=v; ps[idx].b=''; ps[idx].text=v;
      savePats(ps);closeSheet();
      try{if(typeof renderWordCardPatGroup==='function')renderWordCardPatGroup();}catch(_){}
      setTimeout(decoratePats,20);
      toast('已保存');
    };
  }
  function installPats(){
    window.openPatPanel=openPatPanelStrong;
    /* Top-level “添加” and group-level “添加” now both use one bulk textarea.
       No group-name field, no self-action field. */
    window.addPatGroup=openBulkAddPat;
    window.addPatToGroup=openBulkAddPat;
    window.editPatItem=openSinglePatEdit;
    window.sendPat=function(mode){
      var a=document.getElementById('pat-custom-a'),b=document.getElementById('pat-custom-b');
      var q=(a&&a.value||'').trim()||(b&&b.value||'').trim();
      if(!q&&pats().length)q=patPhrase(pats()[0]);
      sendPat(mode==='other'?'other':'self',q);
      try{if(typeof closePatPanel==='function')closePatPanel();}catch(_){}
    };
    window.sendPatFromWordcard=function(id){
      var ps=pats(),t=null;for(var i=0;i<ps.length;i++)if(String(ps[i].id)===String(id)){t=ps[i];break;}
      if(t)sendPat('other',patPhrase(t));
    };
    window._sendPatAutoReply=function(cid){
      var ps=pats();if(!ps.length)return;var q=patPhrase(ps[Math.floor(Math.random()*ps.length)]);
      var p=document.getElementById('page-chat-room'),old=p&&p.dataset?p.dataset.chatId:'';
      if(p&&p.dataset&&cid)p.dataset.chatId=cid;sendPat('other',q);
      if(p&&p.dataset&&old)p.dataset.chatId=old;
    };
    decoratePats();
  }

  /* =========================================================
     WHEREABOUTS: independent pools
     ========================================================= */
  function migratePools(){
    var loc=readArray(LOC_KEY),act=readArray(ACT_KEY);
    if(loc.length||act.length)return {locations:loc,actions:act};
    try{
      var old=Storage.getWhereabouts?Storage.getWhereabouts():[];
      loc=uniq(old.map(function(x){return x&&x.place;}));
      act=uniq(old.map(function(x){return x&&x.action;}));
    }catch(_){}
    if(!loc.length)loc=['图书馆','咖啡店','公园','健身房','书店','电影院','海边','家里'];
    if(!act.length)act=['安静看书','喝咖啡','散步','锻炼身体','逛书店','看电影','看海发呆','听音乐'];
    writeArray(LOC_KEY,loc);writeArray(ACT_KEY,act);
    return {locations:loc,actions:act};
  }
  function pools(){var p=migratePools();return{locations:readArray(LOC_KEY).length?readArray(LOC_KEY):p.locations,actions:readArray(ACT_KEY).length?readArray(ACT_KEY):p.actions};}
  function syncLegacyPairs(){
    var p=pools(),loc=p.locations,act=p.actions;
    var n=Math.max(loc.length,act.length),out=[];
    if(!n)return;
    for(var i=0;i<n;i++){
      out.push({id:Date.now()+i,place:loc[i%loc.length]||'',action:act[(i*3+Math.floor(Math.random()*Math.max(1,act.length)))%act.length]||'',group:'我的行踪'});
    }
    try{if(Storage.setWhereabouts)Storage.setWhereabouts(out);}catch(_){}
  }
  function randomSource(){
    var p=pools(),loc=p.locations,act=p.actions;
    if(!loc.length&&!act.length)return[];
    /* multiple samples so original reporter can choose one randomly; each sample independently pairs pools */
    var out=[];
    for(var i=0;i<24;i++){
      out.push({
        id:'rl7_'+i,
        group:'我的行踪',
        place:loc.length?loc[Math.floor(Math.random()*loc.length)]:'某个地方',
        action:act.length?act[Math.floor(Math.random()*act.length)]:''
      });
    }
    return out;
  }
  function renderPools(){
    var c=document.getElementById('whereabout-group-list');if(!c)return;
    var p=pools();
    var chip=function(q,type,i){return'<span class="rl7-wa-chip">'+esc(q)+'<button data-rm="'+type+'" data-i="'+i+'">×</button></span>';};
    c.innerHTML='<div class="rl7-wa-wrap">'+
      '<div class="rl7-wa-section"><div class="rl7-wa-head"><div><strong>Locations</strong><div class="rl7-wa-count">'+p.locations.length+' locations</div></div><button class="rl7-wa-edit" data-edit="locations">批量编辑</button></div>'+
      '<div class="rl7-wa-chips">'+p.locations.map(function(q,i){return chip(q,'locations',i);}).join('')+'</div></div>'+
      '<div class="rl7-wa-section"><div class="rl7-wa-head"><div><strong>Activities</strong><div class="rl7-wa-count">'+p.actions.length+' activities</div></div><button class="rl7-wa-edit" data-edit="actions">批量编辑</button></div>'+
      '<div class="rl7-wa-chips">'+p.actions.map(function(q,i){return chip(q,'actions',i);}).join('')+'</div></div>'+
      '<div class="rl7-wa-preview"><b>随机组合：</b> 每次行踪汇报时，会从 Location 和 Activity 两个词库里各随机抽一个，它们不固定配对。<br>'+
      (p.locations.length&&p.actions.length?'例如：'+esc(p.locations[Math.floor(Math.random()*p.locations.length)])+' · '+esc(p.actions[Math.floor(Math.random()*p.actions.length)]):'')+
      '</div></div>';
    c.querySelectorAll('[data-edit]').forEach(function(b){b.onclick=function(){openWhereaboutEditor();};});
    c.querySelectorAll('[data-rm]').forEach(function(b){b.onclick=function(){
      var pp=pools(),type=b.dataset.rm,i=+b.dataset.i;
      if(type==='locations'){pp.locations.splice(i,1);writeArray(LOC_KEY,pp.locations);}
      else{pp.actions.splice(i,1);writeArray(ACT_KEY,pp.actions);}
      syncLegacyPairs();renderPools();
    };});
  }
  function openWhereaboutEditor(){
    var p=pools();
    var x=sheet('<div class="rl7-title">编辑行踪词库</div>'+
      '<div class="rl7-sub">地点和行为完全分开保存，不需要一一配对。汇报时会各随机抽一个。</div>'+
      '<div class="rl7-label">Locations · 一行一个地点</div>'+
      '<textarea class="rl7-textarea" id="rl7-wa-locs" placeholder="TVA\nLibrary\nHome">'+esc(p.locations.join('\n'))+'</textarea>'+
      '<div class="rl7-label">Activities · 一行一个行为</div>'+
      '<textarea class="rl7-textarea" id="rl7-wa-acts" placeholder="reading\nworking\nplanning something">'+esc(p.actions.join('\n'))+'</textarea>'+
      '<div class="rl7-actions"><button class="rl7-secondary" id="rl7-wa-cancel">取消</button><button class="rl7-primary" id="rl7-wa-save">保存</button></div>');
    x.querySelector('#rl7-wa-cancel').onclick=closeSheet;
    x.querySelector('#rl7-wa-save').onclick=function(){
      writeArray(LOC_KEY,x.querySelector('#rl7-wa-locs').value.split(/\r?\n/));
      writeArray(ACT_KEY,x.querySelector('#rl7-wa-acts').value.split(/\r?\n/));
      syncLegacyPairs();closeSheet();renderPools();toast('行踪词库已保存');
    };
  }
  function installWhereabouts(){
    migratePools();
    window.addWhereabout=function(){openWhereaboutEditor();};
    window.renderWhereaboutGroup=function(){renderPools();};
    window._getWhereaboutSource=function(){return randomSource();};
    /* if user is currently on the page, repaint immediately */
    var c=document.getElementById('whereabout-group-list');
    if(c && c.offsetParent!==null)renderPools();
  }


  /* =========================================================
     CHAT INPUT HIT AREA
     ========================================================= */
  function installChatInputHitArea(){
    if(window.__rl7ChatInputHitAreaInstalled)return;
    window.__rl7ChatInputHitAreaInstalled=true;

    function shouldIgnore(target){
      if(!target)return false;
      /* Keep actual controls working normally: mic / emoji / plus / send / links / buttons. */
      return !!(target.closest && target.closest(
        'button, .input-btn, .send-btn, .input-btn-voice, ' +
        '.chat-sticker-btn, .chat-plus-btn, a, [role="button"]'
      ));
    }

    function focusEditor(e){
      var bar=e.target && e.target.closest ? e.target.closest('.chat-input-bar') : null;
      if(!bar || shouldIgnore(e.target))return;

      var input=document.getElementById('chat-input');
      if(!input)return;

      /* Tapping anywhere in the empty/input portion of the whole bottom bar
         should behave exactly like tapping the text field itself. */
      try{
        input.focus({preventScroll:true});
      }catch(_){
        try{input.focus();}catch(__){}
      }
      hardInputWhite();
      setTimeout(function(){
        hardInputWhite();
      },40);
    }

    document.addEventListener('pointerdown',focusEditor,true);
    document.addEventListener('touchend',focusEditor,true);
    document.addEventListener('click',focusEditor,true);
  }

  /* =========================================================
     LISTENERS / BOOT
     ========================================================= */
  function installViewport(){
    if(window.__rl7v21Installed)return;
    window.__rl7v21Installed=true;

    portalHomeNav();
    syncChatStateClass();

    var chatPage = document.getElementById('page-chat-room');
    if (chatPage) {
      var obs = new MutationObserver(function(){
        syncChatStateClass();
      });
      obs.observe(chatPage, {attributes:true, attributeFilter:['class']});
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncKeyboardClass, {passive:true});
      window.visualViewport.addEventListener('scroll', syncKeyboardClass, {passive:true});
    }
    window.addEventListener('resize', syncKeyboardClass, {passive:true});
    window.addEventListener('pageshow',function(){
      portalHomeNav();
      syncChatStateClass();
      hardInputWhite();
    },{passive:true});

    document.addEventListener('visibilitychange',function(){
      if(!document.hidden) {
        portalHomeNav();
        syncChatStateClass();
      }
    });

    document.addEventListener('focusin',function(e){
      if(e.target && e.target.id==='chat-input') {
        hardInputWhite();
        setTimeout(syncKeyboardClass,20);
        setTimeout(syncKeyboardClass,120);
      }
    },true);
    document.addEventListener('focusout',function(e){
      if(e.target && e.target.id==='chat-input') {
        setTimeout(syncKeyboardClass,80);
        setTimeout(syncKeyboardClass,260);
      }
    },true);

    setInterval(function(){
      portalHomeNav();
      syncChatStateClass();
      hardInputWhite();
      syncChromeColor();
    },1500);
  }

  function boot(){
    var staleStrip=document.getElementById('rl7-status-strip');
    if(staleStrip) staleStrip.remove();
    document.documentElement.classList.remove('rl7-chat-active','rl7-keyboard-open');
    var staleCap=document.getElementById('rl7-safe-top');
    if(staleCap) staleCap.remove();
    installCSS();releaseLayoutControl();syncChromeColor();hardInputWhite();installViewport();installChatInputHitArea();portalHomeNav();syncChatStateClass();
    installPats();installWhereabouts();

    ensureKeepLib().then(function(){
      /* re-install globals after library is ready */
      window.startKeepAliveAudio=startKeepAliveStrong;
      window.stopKeepAliveAudio=stopKeepAliveStrong;
      if(settingWantsKeepalive()) startKeepAliveStrong();
    }).catch(function(){});

    [50,160,400,900,1800,3500].forEach(function(ms){
      setTimeout(function(){
        releaseLayoutControl();syncChromeColor();hardInputWhite();
        installPats();installWhereabouts();
        window.startKeepAliveAudio=startKeepAliveStrong;
        window.stopKeepAliveAudio=stopKeepAliveStrong;
      },ms);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0);});
  else setTimeout(boot,0);

  RL7.version=VERSION;
  RL7.keepAliveStatus=function(){return window.__rl7KeepAliveStatus||{};};
  RL7.bulkAddPat=openBulkAddPat;
  RL7.editWhereabouts=openWhereaboutEditor;
  RL7.recoverViewport=stagedRecovery;
})();
