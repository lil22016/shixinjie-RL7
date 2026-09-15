/* RL7 HARD FIX v3
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
  var VERSION = '20260915-hardfix3';
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
    var color = '#e9f7ed';
    try {
      var cs = getComputedStyle(document.documentElement);
      var v = (cs.getPropertyValue('--bg-main') || cs.getPropertyValue('--bg-color') || '').trim();
      if (v && v.charAt(0) === '#') color = v;
    } catch (_) {}

    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);

    try {
      document.documentElement.style.setProperty('--rl7-chrome-bg', color);
      document.documentElement.style.backgroundColor = color;
      document.body.style.backgroundColor = color;
      var app = document.getElementById('app');
      if (app) app.style.backgroundColor = color;
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
      html, body {
        background:var(--rl7-chrome-bg, var(--bg-main, #e9f7ed)) !important;
      }
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
        background:var(--bg-gradient, var(--bg-main, var(--rl7-chrome-bg,#e9f7ed))) !important;
      }
      html.rl7-ios-fix #page-chat-room.page-fullscreen,
      html.rl7-ios-fix #page-chat-room.page-fullscreen.active {
        position:fixed !important;
        top:0 !important; right:0 !important; bottom:auto !important; left:0 !important;
        width:100% !important;
        height:var(--rl7-chat-height,100dvh) !important;
        min-height:0 !important; max-height:none !important;
        transform:none !important; translate:none !important;
        margin:0 !important; padding-top:0 !important; padding-bottom:0 !important;
        overflow:hidden !important;
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
  function syncViewport() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function(){
      raf=0;
      var vv=window.visualViewport;
      var ih=window.innerHeight||document.documentElement.clientHeight||0;
      var vh=vv&&vv.height?vv.height:ih;
      if (!lastFullH || (!keyboard && vh>lastFullH)) lastFullH=vh;
      keyboard=(lastFullH-vh)>120;

      /* neutralize original offsetTop compensation */
      document.documentElement.style.setProperty('--chat-offset','0px','important');
      document.documentElement.style.setProperty('--kbd','0px','important');

      if (chatActive()) {
        var h=Math.round(vh||ih);
        document.documentElement.style.setProperty('--rl7-chat-height',h+'px','important');
        var p=document.getElementById('page-chat-room');
        if(p){
          p.style.setProperty('top','0px','important');
          p.style.setProperty('height',h+'px','important');
          p.style.setProperty('transform','none','important');
          p.style.setProperty('translate','none','important');
        }
        zeroScroll();
      }
      hardInputWhite();
    });
  }
  function stagedRecovery(){
    [0,30,80,160,320,650,1100].forEach(function(ms){
      setTimeout(function(){syncViewport();hardInputWhite();syncChromeColor();},ms);
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
      var p=item.querySelector('.pat-parts');if(!p)return;
      p.className='pat-parts rl7-pat-single';
      p.innerHTML='<span class="rl7-pat-text">'+esc(q)+'</span>';
    });
  }
  function installPats(){
    window.openPatPanel=openPatPanelStrong;
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
     LISTENERS / BOOT
     ========================================================= */
  function installViewport(){
    if(window.__rl7v3viewport)return;window.__rl7v3viewport=true;
    if(window.visualViewport){
      visualViewport.addEventListener('resize',syncViewport,{passive:true});
      visualViewport.addEventListener('scroll',syncViewport,{passive:true});
    }
    window.addEventListener('resize',syncViewport,{passive:true});
    window.addEventListener('pageshow',stagedRecovery,{passive:true});
    window.addEventListener('focus',stagedRecovery,{passive:true});
    window.addEventListener('orientationchange',stagedRecovery,{passive:true});
    document.addEventListener('visibilitychange',function(){if(!document.hidden)stagedRecovery();});
    document.addEventListener('focusin',function(e){if(e.target&&e.target.id==='chat-input')stagedRecovery();},true);

    var mo=new MutationObserver(function(){
      hardInputWhite();syncChromeColor();decoratePats();
      var c=document.getElementById('whereabout-group-list');
      if(c && c.offsetParent!==null && !c.querySelector('.rl7-wa-wrap')) renderPools();
    });
    mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  }

  function boot(){
    installCSS();syncChromeColor();hardInputWhite();installViewport();
    installPats();installWhereabouts();

    ensureKeepLib().then(function(){
      /* re-install globals after library is ready */
      window.startKeepAliveAudio=startKeepAliveStrong;
      window.stopKeepAliveAudio=stopKeepAliveStrong;
      if(settingWantsKeepalive()) startKeepAliveStrong();
    }).catch(function(){});

    [50,160,400,900,1800,3500].forEach(function(ms){
      setTimeout(function(){
        installCSS();syncChromeColor();hardInputWhite();
        installPats();installWhereabouts();syncViewport();
        window.startKeepAliveAudio=startKeepAliveStrong;
        window.stopKeepAliveAudio=stopKeepAliveStrong;
      },ms);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0);});
  else setTimeout(boot,0);

  RL7.version=VERSION;
  RL7.keepAliveStatus=function(){return window.__rl7KeepAliveStatus||{};};
  RL7.editWhereabouts=openWhereaboutEditor;
  RL7.recoverViewport=stagedRecovery;
})();
