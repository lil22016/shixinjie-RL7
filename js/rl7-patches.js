/* RL7 compatibility + feature patches
 * - iOS viewport/keyboard recovery
 * - high-contrast chat input text
 * - stronger background keepalive integration
 * - shared poke vocabulary
 * - customizable whereabouts activities
 * - two-mode decision entry
 */
(function () {
  'use strict';

  var RL7 = window.RL7 = window.RL7 || {};
  var PAT_KEY = 'rl7_shared_pat_vocab_v1';
  var WA_KEY  = 'rl7_whereabout_activities_v1';

  function esc(s) {
    if (window.Core && Core.escapeHtml) return Core.escapeHtml(String(s == null ? '' : s));
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  /* ---------- CSS / iOS viewport ---------- */
  function injectStyle() {
    if (document.getElementById('rl7-patch-style')) return;
    var st = document.createElement('style');
    st.id = 'rl7-patch-style';
    st.textContent = `
      html, body {
        width:100% !important;
        height:100% !important;
        min-height:100% !important;
        overflow:hidden !important;
        overscroll-behavior:none;
      }
      body {
        position:fixed !important;
        inset:0 !important;
        margin:0 !important;
      }
      #app.phone-frame {
        height:var(--rl7-app-height, 100dvh) !important;
        min-height:var(--rl7-app-height, 100dvh) !important;
        max-height:var(--rl7-app-height, 100dvh) !important;
        overflow:hidden !important;
        transform:none !important;
        top:0 !important;
      }
      #page-chat-room {
        height:var(--rl7-app-height, 100dvh) !important;
        max-height:var(--rl7-app-height, 100dvh) !important;
        overflow:hidden !important;
      }
      #chat-input,
      #page-chat-room input,
      #page-chat-room textarea,
      .chat-input,
      .chat-input input,
      .chat-input textarea,
      .message-input {
        color:#fff !important;
        -webkit-text-fill-color:#fff !important;
        caret-color:#fff !important;
        font-size:16px !important;
      }
      #chat-input::placeholder,
      #page-chat-room input::placeholder,
      #page-chat-room textarea::placeholder,
      .message-input::placeholder {
        color:rgba(255,255,255,.62) !important;
        -webkit-text-fill-color:rgba(255,255,255,.62) !important;
      }
      .rl7-sheet {
        position:fixed; inset:0; z-index:99999;
        display:flex; align-items:flex-end; justify-content:center;
        background:rgba(0,0,0,.28);
        padding:16px;
      }
      .rl7-sheet-card {
        width:min(520px,100%); max-height:78dvh; overflow:auto;
        border-radius:24px; padding:18px;
        background:rgba(245,255,249,.96);
        color:#24352f;
        box-shadow:0 18px 60px rgba(0,0,0,.22);
        -webkit-backdrop-filter:blur(24px); backdrop-filter:blur(24px);
      }
      .rl7-sheet-title {font-size:18px;font-weight:700;margin-bottom:12px}
      .rl7-sheet-sub {font-size:12px;opacity:.65;margin:-6px 0 12px}
      .rl7-choice-grid {display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .rl7-choice {
        border:0;border-radius:18px;padding:16px 12px;
        background:rgba(255,255,255,.78);color:#24352f;
        font-size:14px;font-weight:650;
      }
      .rl7-list {display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}
      .rl7-chip {
        border:0;border-radius:999px;padding:8px 12px;
        background:rgba(74,130,103,.12);color:#365749;font-size:13px;
      }
      .rl7-textarea, .rl7-input {
        width:100%;box-sizing:border-box;border:1px solid rgba(50,90,70,.16);
        border-radius:14px;padding:12px;background:rgba(255,255,255,.78);
        color:#24352f !important;-webkit-text-fill-color:#24352f !important;
        font:inherit;outline:none;
      }
      .rl7-textarea {min-height:150px;resize:vertical}
      .rl7-actions {display:flex;gap:10px;margin-top:14px}
      .rl7-actions button {
        flex:1;border:0;border-radius:14px;padding:12px;font-weight:650;
      }
      .rl7-secondary {background:rgba(80,100,90,.10);color:#365749}
      .rl7-primary {background:#83c8a8;color:#14372a}
      .rl7-mini-link {
        border:0;background:transparent;color:#477a65;font-size:12px;
        text-decoration:underline;padding:4px 0 8px;
      }
    `;
    document.head.appendChild(st);
  }

  var keyboardOpen = false;
  var baselineHeight = 0;

  function updateViewport(force) {
    var vv = window.visualViewport;
    var h = vv ? vv.height : window.innerHeight;
    if (!baselineHeight || (!keyboardOpen && h > baselineHeight)) baselineHeight = h;
    if (vv && baselineHeight) keyboardOpen = h < baselineHeight - 120;

    document.documentElement.style.setProperty('--rl7-app-height', Math.round(h) + 'px');

    if (force || !keyboardOpen) {
      try { window.scrollTo(0, 0); } catch (_) {}
      try { document.documentElement.scrollTop = 0; document.body.scrollTop = 0; } catch (_) {}
      var app = document.getElementById('app');
      if (app) {
        app.style.transform = 'none';
        app.style.top = '0px';
        app.style.marginTop = '0px';
      }
    }
  }

  function scheduleViewportRecovery() {
    [0, 80, 220, 500, 1000].forEach(function(ms){
      setTimeout(function(){ updateViewport(true); }, ms);
    });
  }

  /* ---------- background keepalive ---------- */
  var keeper = null;
  var keepScriptLoading = false;

  function otherAudioPlaying() {
    try {
      var els = document.querySelectorAll('audio,video');
      for (var i=0;i<els.length;i++) {
        var el = els[i];
        if (!el.paused && !el.ended && el.readyState >= 2) return true;
      }
    } catch (_) {}
    return false;
  }

  function ensureKeepAliveLib(cb) {
    if (window.createBackgroundKeepAlive) { cb(); return; }
    if (keepScriptLoading) {
      setTimeout(function(){ ensureKeepAliveLib(cb); }, 150);
      return;
    }
    keepScriptLoading = true;
    var s = document.createElement('script');
    s.src = 'js/background-keepalive.js?v=rl7-20260915b';
    s.onload = function(){ keepScriptLoading=false; cb(); };
    s.onerror = function(){ keepScriptLoading=false; };
    document.head.appendChild(s);
  }

  function getKeeper() {
    if (keeper || !window.createBackgroundKeepAlive) return keeper;
    keeper = window.createBackgroundKeepAlive({
      title: 'Background keepalive',
      artist: '拾心界',
      manageMediaSession: true,
      isOtherAudioPlaying: otherAudioPlaying
    });
    return keeper;
  }

  window.startKeepAliveAudio = function () {
    ensureKeepAliveLib(function(){
      var k = getKeeper();
      if (k) k.enable();
    });
  };
  window.stopKeepAliveAudio = function () {
    if (keeper) keeper.disable();
  };

  function reviveKeepAlive() {
    try {
      var box = document.querySelector('input[type="checkbox"][data-setting="backgroundKeepAlive"], #setting-backgroundKeepAlive, #backgroundKeepAlive');
      if (box && box.checked) window.startKeepAliveAudio();
      else if (keeper && keeper.enabled) keeper.resume();
    } catch (_) {}
  }

  /* ---------- shared poke vocabulary ---------- */
  var defaultPats = [
    'pokes your cheek',
    'boops your nose',
    'ruffles your hair',
    'tugs your sleeve',
    'leans against you',
    'bumps your shoulder',
    'steals a quick kiss',
    'squeezes your hand'
  ];

  function loadPatVocab() {
    try {
      var raw = JSON.parse(localStorage.getItem(PAT_KEY) || 'null');
      if (Array.isArray(raw) && raw.length) return raw;
    } catch (_) {}
    return defaultPats.slice();
  }
  function savePatVocab(v) {
    var seen = {};
    v = v.map(function(x){return String(x||'').trim();}).filter(function(x){
      if (!x || seen[x]) return false; seen[x]=1; return true;
    });
    localStorage.setItem(PAT_KEY, JSON.stringify(v));
    return v;
  }
  function currentPartnerName() {
    try { if (typeof _getCurrentPartnerName === 'function') return _getCurrentPartnerName() || '对方'; } catch (_) {}
    try {
      var id = document.getElementById('page-chat-room').dataset.chatId;
      var p = (Storage.getPartnerProfiles()||[]).find(function(x){return x.id===id;});
      if (p) return p.nickname || '对方';
    } catch (_) {}
    return '对方';
  }
  function currentSelfName() {
    try { var p = Storage.getMyProfile(); return (p && p.nickname) || '我方'; } catch (_) { return '我方'; }
  }
  function closeSheet() {
    var x = document.getElementById('rl7-sheet'); if (x) x.remove();
  }
  function showSheet(html) {
    closeSheet();
    var d=document.createElement('div'); d.id='rl7-sheet'; d.className='rl7-sheet';
    d.innerHTML='<div class="rl7-sheet-card" onclick="event.stopPropagation()">'+html+'</div>';
    d.onclick=closeSheet; document.body.appendChild(d); return d;
  }
  function sendPatPhrase(mode, phrase) {
    var chatId = '';
    try { chatId = _currentChatId(); } catch (_) {
      var pg=document.getElementById('page-chat-room'); chatId=pg&&pg.dataset?pg.dataset.chatId:'';
    }
    if (!chatId) { if (window.Core) Core.toast('请先进入聊天'); return; }
    var actor = mode === 'other' ? currentPartnerName() : currentSelfName();
    var finalText = '(' + actor + ') ' + phrase;
    try {
      var messages = Storage.getMessages(chatId) || [];
      messages.push({
        id: Date.now(), type: mode === 'other' ? 'other':'self',
        text: finalText, time: Date.now(), msgType:'pat', isPat:true
      });
      Storage.setMessages(chatId, messages);
      if (typeof updateLastMsg === 'function') updateLastMsg(chatId, finalText);
      if (typeof renderChatMessages === 'function') renderChatMessages(chatId);
      if (window.App && App.playSound) App.playSound(mode === 'other' ? 'receive' : 'send');
    } catch (e) {
      console.error('[RL7 pat]',e);
    }
    closeSheet();
  }
  function openPatManager(mode) {
    var vocab = loadPatVocab();
    showSheet(
      '<div class="rl7-sheet-title">拍一拍词库</div>'+
      '<div class="rl7-sheet-sub">两边共享同一个词库；一行一个。发送时自动在前面插入当前角色/我的名字。</div>'+
      '<textarea id="rl7-pat-editor" class="rl7-textarea">'+esc(vocab.join('\n'))+'</textarea>'+
      '<div class="rl7-actions"><button class="rl7-secondary" onclick="RL7.openPatPanel(\''+mode+'\')">返回</button>'+
      '<button class="rl7-primary" id="rl7-save-pats">保存</button></div>'
    );
    document.getElementById('rl7-save-pats').onclick=function(){
      var arr=document.getElementById('rl7-pat-editor').value.split(/\r?\n/);
      savePatVocab(arr);
      if (window.Core) Core.toast('拍一拍词库已保存');
      RL7.openPatPanel(mode);
    };
  }
  RL7.openPatPanel = function(mode) {
    mode = mode === 'other' ? 'other' : 'self';
    var vocab=loadPatVocab();
    var chips=vocab.map(function(x){
      return '<button class="rl7-chip" data-pat="'+encodeURIComponent(x)+'">'+esc(x)+'</button>';
    }).join('');
    var who = mode==='other' ? currentPartnerName() : currentSelfName();
    var sheet=showSheet(
      '<div class="rl7-sheet-title">'+esc(who)+' · 拍一拍</div>'+
      '<div class="rl7-sheet-sub">选择一句；会发送成 ('+esc(who)+') + 词条。</div>'+
      '<button class="rl7-mini-link" id="rl7-manage-pats">批量编辑词库</button>'+
      '<div class="rl7-list">'+chips+'</div>'+
      '<div class="rl7-actions"><button class="rl7-secondary" onclick="document.getElementById(\'rl7-sheet\').remove()">取消</button></div>'
    );
    sheet.querySelectorAll('[data-pat]').forEach(function(b){
      b.onclick=function(){ sendPatPhrase(mode, decodeURIComponent(b.getAttribute('data-pat'))); };
    });
    document.getElementById('rl7-manage-pats').onclick=function(){ openPatManager(mode); };
  };
  window.openPatPanel = RL7.openPatPanel;

  /* Best-effort: when entering the old pat list page, add a prominent shared-vocab manager button. */
  function decoratePatPages() {
    document.querySelectorAll('.pat-parts').forEach(function(parts){
      var item=parts.closest('.card-list-item');
      if (!item || item.dataset.rl7PatDecorated) return;
      item.dataset.rl7PatDecorated='1';
      var texts=parts.querySelectorAll('.pat-part-text');
      var phrase='';
      if (texts.length) phrase=(texts[texts.length-1].textContent||texts[0].textContent||'').trim();
      if (phrase) {
        parts.innerHTML='<div class="pat-part"><span class="pat-part-text">'+esc(phrase)+'</span></div>';
      }
    });
  }

  /* ---------- customizable whereabouts ---------- */
  function loadWA() {
    try {
      var v=JSON.parse(localStorage.getItem(WA_KEY)||'null');
      if (Array.isArray(v) && v.length) return v;
    } catch (_) {}
    return ['reading','working','studying','at the TVA','causing trouble','planning something',
            'having coffee','walking','listening to music','resting','out','busy'];
  }
  function applyWA() {
    try { window.WHEREABOUT_ACTIVITIES = loadWA(); WHEREABOUT_ACTIVITIES = window.WHEREABOUT_ACTIVITIES; } catch (_) {}
  }
  function openWAManager() {
    var list=loadWA();
    showSheet(
      '<div class="rl7-sheet-title">自定义行踪活动</div>'+
      '<div class="rl7-sheet-sub">一行一个。以后添加行踪时，这些会成为快捷选项；地点和行动仍可自由输入。</div>'+
      '<textarea id="rl7-wa-editor" class="rl7-textarea">'+esc(list.join('\n'))+'</textarea>'+
      '<div class="rl7-actions"><button class="rl7-secondary" onclick="document.getElementById(\'rl7-sheet\').remove()">取消</button>'+
      '<button class="rl7-primary" id="rl7-save-wa">保存</button></div>'
    );
    document.getElementById('rl7-save-wa').onclick=function(){
      var arr=document.getElementById('rl7-wa-editor').value.split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean);
      localStorage.setItem(WA_KEY, JSON.stringify(arr));
      applyWA(); closeSheet();
      if (window.Core) Core.toast('行踪活动已更新');
    };
  }
  RL7.openWAManager=openWAManager;

  var originalAddWhereabout = null;
  function hookWhereabouts() {
    applyWA();
    if (!originalAddWhereabout && typeof window.addWhereabout === 'function') {
      originalAddWhereabout = window.addWhereabout;
      window.addWhereabout = function(preset) {
        applyWA();
        var r = originalAddWhereabout(preset);
        setTimeout(function(){
          var ov=document.querySelector('.form-modal-overlay');
          if (!ov || ov.querySelector('.rl7-wa-manage')) return;
          var label=ov.querySelector('.whereabout-activity-label');
          if (label) {
            var btn=document.createElement('button');
            btn.type='button'; btn.className='rl7-mini-link rl7-wa-manage';
            btn.textContent='编辑我的快捷活动';
            btn.onclick=function(e){e.preventDefault();e.stopPropagation();openWAManager();};
            label.parentNode.insertBefore(btn,label.nextSibling);
          }
        },0);
        return r;
      };
    }
  }

  /* ---------- decision: choose mode first ---------- */
  var originalOpenDecision = null;
  function openHelpMeDecide() {
    showSheet(
      '<div class="rl7-sheet-title">让 TA 帮我抉择</div>'+
      '<div class="rl7-sheet-sub">这里不需要先写选项。把纠结的事情直接发给 TA，让聊天回复来帮你判断。</div>'+
      '<textarea id="rl7-decide-question" class="rl7-textarea" style="min-height:110px" placeholder="比如：I can’t decide whether I should go out tonight or stay home..."></textarea>'+
      '<div class="rl7-actions"><button class="rl7-secondary" onclick="document.getElementById(\'rl7-sheet\').remove()">取消</button>'+
      '<button class="rl7-primary" id="rl7-decide-send">发送</button></div>'
    );
    document.getElementById('rl7-decide-send').onclick=function(){
      var q=(document.getElementById('rl7-decide-question').value||'').trim();
      if(!q){if(window.Core)Core.toast('先写下你在纠结什么');return;}
      closeSheet();
      var inp=document.getElementById('chat-input');
      if (inp) {
        inp.value='Help me decide: '+q;
        inp.dispatchEvent(new Event('input',{bubbles:true}));
        if (typeof window.sendMessage === 'function') { window.sendMessage(); return; }
      }
      if (typeof window.sendChatMessage === 'function') { window.sendChatMessage('Help me decide: '+q); return; }
      if (window.Core) Core.toast('已填入输入框，请点击发送');
    };
  }
  function openDecisionChooser() {
    try { if (typeof closePlusMenu==='function') closePlusMenu(); } catch (_) {}
    showSheet(
      '<div class="rl7-sheet-title">抉择</div>'+
      '<div class="rl7-choice-grid">'+
      '<button class="rl7-choice" id="rl7-help-me">让 TA 帮我抉择<br><small>只描述问题，让 TA 给意见</small></button>'+
      '<button class="rl7-choice" id="rl7-quiz-them">给 TA 出选择题<br><small>你给选项，让 TA 选一个</small></button>'+
      '</div>'+
      '<div class="rl7-actions"><button class="rl7-secondary" onclick="document.getElementById(\'rl7-sheet\').remove()">取消</button></div>'
    );
    document.getElementById('rl7-help-me').onclick=function(){openHelpMeDecide();};
    document.getElementById('rl7-quiz-them').onclick=function(){closeSheet(); if(originalOpenDecision) originalOpenDecision();};
  }
  RL7.openDecisionChooser=openDecisionChooser;

  function hookDecision() {
    if (!originalOpenDecision && typeof window.openDecisionPanel === 'function') {
      originalOpenDecision = window.openDecisionPanel;
      window.openDecisionPanel = openDecisionChooser;
    }
    document.querySelectorAll('.plus-menu-item').forEach(function(item){
      var sp=item.querySelector('span');
      if (sp && sp.textContent.trim()==='帮我抉择') sp.textContent='抉择';
    });
  }

  /* ---------- startup / observers ---------- */
  function boot() {
    injectStyle();
    updateViewport(true);
    hookWhereabouts();
    hookDecision();
    decoratePatPages();
    reviveKeepAlive();

    var mo=new MutationObserver(function(){
      hookDecision();
      decoratePatPages();
      hookWhereabouts();
    });
    mo.observe(document.body,{childList:true,subtree:true});
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function(){updateViewport(false);});
    window.visualViewport.addEventListener('scroll', function(){updateViewport(false);});
  }
  window.addEventListener('resize', function(){updateViewport(false);});
  window.addEventListener('orientationchange', scheduleViewportRecovery);
  window.addEventListener('pageshow', function(){scheduleViewportRecovery();reviveKeepAlive();});
  window.addEventListener('focus', function(){scheduleViewportRecovery();reviveKeepAlive();});
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) { scheduleViewportRecovery();reviveKeepAlive(); }
  });

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
