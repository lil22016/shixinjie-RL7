/* RL7 v55 diagnostic + UI repair
   - top-gap diagnostic overlay: identifies what physically occupies the top strip
   - restores iOS chat keyboard lift using visualViewport
   - Liquid dark/glass chat subpanels
   - Liquid period cards
   - Liquid journal emoji/quote picker contrast
*/
(function(){
'use strict';
if(window.__RL7_V55__) return; window.__RL7_V55__=1;

function addStyle(){
  var old=document.getElementById('rl7-v55-style'); if(old) old.remove();
  var s=document.createElement('style'); s.id='rl7-v55-style';
  s.textContent=`
/* ---------- Chat keyboard ---------- */
html.rl7-v55-kbd #page-chat-room.page-fullscreen.active{
  position:fixed!important;
  left:0!important;right:0!important;
  top:var(--rl7-v55-vv-top,0px)!important;
  height:var(--rl7-v55-vv-h,100dvh)!important;
  min-height:0!important;max-height:none!important;
  bottom:auto!important;
}
html.rl7-v55-kbd #page-chat-room .chat-input-zone{
  position:relative!important;
  z-index:30!important;
  flex:0 0 auto!important;
}

/* ---------- Liquid: chat panels ---------- */
html.liquid-theme .chat-menu-panel,
html.liquid-theme .chat-stats-panel,
html.liquid-theme .rp-action-panel,
html.liquid-theme .redpacket-panel,
html.liquid-theme .redpacket-claim-panel,
html.liquid-theme .rp-detail-panel,
html.liquid-theme .chat-bg-panel,
html.liquid-theme .chat-background-panel,
html.liquid-theme .background-setting-panel,
html.liquid-theme .group-setting-panel{
  background:rgba(24,26,31,.94)!important;
  background-color:rgba(24,26,31,.94)!important;
  color:#f7f7f8!important;
  border:1px solid rgba(255,255,255,.18)!important;
  box-shadow:0 18px 50px rgba(0,0,0,.38)!important;
  -webkit-backdrop-filter:blur(22px) saturate(115%)!important;
  backdrop-filter:blur(22px) saturate(115%)!important;
}
html.liquid-theme .chat-menu-panel *,
html.liquid-theme .chat-stats-panel *,
html.liquid-theme .rp-action-panel *,
html.liquid-theme .redpacket-panel *,
html.liquid-theme .redpacket-claim-panel *,
html.liquid-theme .chat-bg-panel *,
html.liquid-theme .chat-background-panel *,
html.liquid-theme .background-setting-panel *,
html.liquid-theme .group-setting-panel *{
  --text-dark:#f7f7f8;
  --text-medium:rgba(255,255,255,.84);
  --text-light:rgba(255,255,255,.70);
  --text-lighter:rgba(255,255,255,.56);
}
html.liquid-theme .chat-stats-title,
html.liquid-theme .chat-stats-section-title,
html.liquid-theme .chat-stats-count-num,
html.liquid-theme .chat-stats-count-label,
html.liquid-theme .chat-stats-sent-text,
html.liquid-theme .chat-menu-item,
html.liquid-theme .chat-menu-item i{
  color:#f7f7f8!important;-webkit-text-fill-color:#f7f7f8!important;
}
html.liquid-theme .chat-stats-section,
html.liquid-theme .chat-stats-count-card,
html.liquid-theme .chat-stats-close{
  background:rgba(255,255,255,.08)!important;
  border-color:rgba(255,255,255,.12)!important;
}
html.liquid-theme .redpacket-claim-panel .claim-greeting,
html.liquid-theme .redpacket-claim-panel .claim-amount{
  color:#ff8f8f!important;-webkit-text-fill-color:#ff8f8f!important;
}

/* ---------- Liquid: period ---------- */
html.liquid-theme #page-period .period-header,
html.liquid-theme #page-period .period-cal-card,
html.liquid-theme #page-period .period-record-panel,
html.liquid-theme #page-period .period-overview-card,
html.liquid-theme #page-period .period-legend,
html.liquid-theme .period-reminder-panel{
  background:rgba(22,24,29,.72)!important;
  background-color:rgba(22,24,29,.72)!important;
  border:1px solid rgba(255,255,255,.18)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 12px 34px rgba(0,0,0,.24)!important;
  -webkit-backdrop-filter:blur(18px) saturate(110%)!important;
  backdrop-filter:blur(18px) saturate(110%)!important;
}
html.liquid-theme #page-period .period-cal-card *,
html.liquid-theme #page-period .period-record-panel *,
html.liquid-theme #page-period .period-overview-card *,
html.liquid-theme #page-period .period-legend *,
html.liquid-theme #page-period .period-header *{
  --text-dark:#fff;--text-medium:rgba(255,255,255,.84);
  --text-light:rgba(255,255,255,.70);--text-lighter:rgba(255,255,255,.56);
}
html.liquid-theme #page-period .calendar-day:not(.period-day):not(.period-predict):not(.ovulation-window):not(.ovulation-day){
  color:rgba(255,255,255,.88)!important;
}
html.liquid-theme #page-period .calendar-nav button,
html.liquid-theme #page-period .period-drop-opt,
html.liquid-theme #page-period .period-pain-opt,
html.liquid-theme #page-period .period-form-input{
  background:rgba(255,255,255,.08)!important;
  border-color:rgba(255,255,255,.16)!important;
  color:#fff!important;
}

/* ---------- Liquid: home mood + quote pickers ---------- */
html.liquid-theme .journal-mood-display .cust-emoji{
  background:rgba(18,20,24,.72)!important;
  color:#fff!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.13),0 5px 14px rgba(0,0,0,.22)!important;
}
html.liquid-theme .emoji-picker-panel,
html.liquid-theme .quote-picker-panel{
  background:rgba(22,24,29,.94)!important;
  color:#fff!important;
  border:1px solid rgba(255,255,255,.18)!important;
}
html.liquid-theme .emoji-picker-title,
html.liquid-theme .quote-picker-title{color:#fff!important}
html.liquid-theme .emoji-picker-item{
  background:rgba(255,255,255,.07)!important;
}
html.liquid-theme .emoji-picker-item .cust-emoji{
  background:rgba(12,14,18,.76)!important;color:#fff!important;
}
html.liquid-theme .quote-picker-item,
html.liquid-theme .quote-picker-random{
  background:rgba(255,255,255,.08)!important;
  color:#fff!important;
  border-color:rgba(255,255,255,.16)!important;
}
html.liquid-theme .quote-picker-item .quote-picker-text,
html.liquid-theme .quote-picker-random small{color:rgba(255,255,255,.82)!important}

/* ---------- top-gap diagnostic ---------- */
#rl7-v55-diag-btn{
 position:fixed!important;right:8px!important;top:calc(env(safe-area-inset-top,0px) + 8px)!important;
 z-index:2147483647!important;border:0!important;border-radius:999px!important;
 padding:7px 10px!important;background:#111!important;color:#fff!important;
 font:700 11px/1 -apple-system,sans-serif!important;box-shadow:0 2px 10px rgba(0,0,0,.35)!important;
}
#rl7-v55-diag{
 position:fixed!important;inset:0!important;z-index:2147483646!important;pointer-events:none!important;
}
#rl7-v55-diag .dtop{position:absolute;left:0;right:0;top:0;height:6px;background:#ff2d55!important}
#rl7-v55-diag .dsafe{position:absolute;left:0;right:0;top:env(safe-area-inset-top,0px);height:4px;background:#00e5ff!important}
#rl7-v55-diag .dbox{
 position:absolute;left:8px;right:8px;top:calc(env(safe-area-inset-top,0px) + 44px);
 padding:10px;border-radius:12px;background:rgba(0,0,0,.88)!important;color:#fff!important;
 font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace!important;white-space:pre-wrap!important;
}
`;
 document.head.appendChild(s);
}

function keyboardSync(){
 var p=document.getElementById('page-chat-room');
 var inp=document.getElementById('chat-input');
 var vv=window.visualViewport;
 if(!p||!inp||!vv) return;
 var active=p.classList.contains('active') && document.activeElement===inp;
 var ih=window.innerHeight||document.documentElement.clientHeight;
 var diff=Math.max(0,ih-vv.height);
 var keyboard=active && (diff>100 || vv.height<ih*.86);
 document.documentElement.classList.toggle('rl7-v55-kbd',keyboard);
 if(keyboard){
   document.documentElement.style.setProperty('--rl7-v55-vv-top',Math.max(0,Math.round(vv.offsetTop||0))+'px');
   document.documentElement.style.setProperty('--rl7-v55-vv-h',Math.round(vv.height)+'px');
   requestAnimationFrame(function(){
     var zone=document.querySelector('#page-chat-room .chat-input-zone');
     if(zone) zone.scrollIntoView({block:'end',inline:'nearest'});
   });
 }else{
   document.documentElement.style.removeProperty('--rl7-v55-vv-top');
   document.documentElement.style.removeProperty('--rl7-v55-vv-h');
 }
}

function colorOf(el){
 if(!el) return 'none';
 var c=getComputedStyle(el);
 return 'bg='+c.backgroundColor+' img='+(c.backgroundImage==='none'?'none':'yes')+' z='+c.zIndex;
}
function rectOf(el){
 if(!el) return 'none';
 var r=el.getBoundingClientRect();
 return [Math.round(r.top),Math.round(r.bottom),Math.round(r.height)].join('/');
}
function topStack(){
 try{
  var x=Math.max(1,Math.round(innerWidth/2)), ys=[0,2,8,16,24,32,40,48,56,64];
  return ys.map(function(y){
   var e=document.elementFromPoint(x,y);
   if(!e)return y+': none';
   return y+': '+e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().replace(/\s+/g,'.'):'');
  }).join('\n');
 }catch(e){return 'stack error'}
}
function report(){
 var w=document.getElementById('rl7-liquid-wallpaper');
 var app=document.getElementById('app');
 var bg=document.getElementById('app-bg');
 var vv=window.visualViewport;
 var meta=document.querySelector('meta[name="theme-color"]');
 return [
  'TOP GAP DIAGNOSTIC v55',
  'inner='+innerWidth+'x'+innerHeight+' dpr='+devicePixelRatio,
  'screen='+screen.width+'x'+screen.height,
  'vv='+(vv?Math.round(vv.width)+'x'+Math.round(vv.height)+' top='+Math.round(vv.offsetTop||0):'none'),
  'standalone='+(matchMedia('(display-mode: standalone)').matches?'yes':'no')+' navigatorStandalone='+(navigator.standalone===true?'yes':'no'),
  'theme-color='+(meta?meta.content:'none'),
  'html '+colorOf(document.documentElement),
  'body '+colorOf(document.body),
  '#app '+colorOf(app)+' rect='+rectOf(app),
  '#app-bg '+colorOf(bg)+' rect='+rectOf(bg),
  '#wall '+colorOf(w)+' rect='+rectOf(w),
  'wall inline top='+(w?w.style.top:'none')+' height='+(w?w.style.height:'none'),
  '',
  'elementFromPoint center-x:',
  topStack()
 ].join('\n');
}
function toggleDiag(){
 var old=document.getElementById('rl7-v55-diag');
 if(old){old.remove();return}
 var d=document.createElement('div');d.id='rl7-v55-diag';
 d.innerHTML='<div class="dtop"></div><div class="dsafe"></div><div class="dbox"></div>';
 document.body.appendChild(d);d.querySelector('.dbox').textContent=report();
}
function diagButton(){
 if(document.getElementById('rl7-v55-diag-btn'))return;
 var b=document.createElement('button');b.id='rl7-v55-diag-btn';b.textContent='TOP TEST';
 b.onclick=toggleDiag;document.body.appendChild(b);
}

function boot(){
 addStyle();diagButton();keyboardSync();
 if(window.visualViewport){
   visualViewport.addEventListener('resize',keyboardSync);
   visualViewport.addEventListener('scroll',keyboardSync);
 }
 window.addEventListener('resize',keyboardSync);
 document.addEventListener('focusin',function(e){if(e.target&&e.target.id==='chat-input')setTimeout(keyboardSync,30)},true);
 document.addEventListener('focusout',function(e){if(e.target&&e.target.id==='chat-input')setTimeout(keyboardSync,80)},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();