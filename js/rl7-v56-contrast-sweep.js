/* RL7 v56 — Liquid contrast sweep + top diagnostic conclusion helper */
(function(){
'use strict';
if(window.__RL7_V56__)return;window.__RL7_V56__=1;

var css=`
/* ===== Global transient UI ===== */
html.liquid-theme .toast,
html.liquid-theme [class*="toast"],
html.liquid-theme [class*="snackbar"]{
 background:rgba(20,22,27,.96)!important;
 color:#fff!important;-webkit-text-fill-color:#fff!important;
 border:1px solid rgba(255,255,255,.16)!important;
 box-shadow:0 10px 32px rgba(0,0,0,.35)!important;
 -webkit-backdrop-filter:blur(18px) saturate(115%)!important;
 backdrop-filter:blur(18px) saturate(115%)!important;
}

/* ===== Chat bottom sheets / + panel ===== */
html.liquid-theme #page-chat-room .plus-panel,
html.liquid-theme #page-chat-room .sticker-panel,
html.liquid-theme #page-chat-room .chat-panel-area{
 background:rgba(20,22,27,.90)!important;
 color:#fff!important;
 border-color:rgba(255,255,255,.14)!important;
 -webkit-backdrop-filter:blur(20px) saturate(115%)!important;
 backdrop-filter:blur(20px) saturate(115%)!important;
}
html.liquid-theme #page-chat-room .plus-menu-item span,
html.liquid-theme #page-chat-room .sticker-panel-tab,
html.liquid-theme #page-chat-room .emoji-section-title{
 color:rgba(255,255,255,.88)!important;-webkit-text-fill-color:rgba(255,255,255,.88)!important;
}
html.liquid-theme #page-chat-room .plus-menu-item i,
html.liquid-theme #page-chat-room .plus-menu-item i.plus-menu-svg{
 color:#fff!important;
 background:rgba(255,255,255,.11)!important;
 border:1px solid rgba(255,255,255,.12)!important;
}
html.liquid-theme #page-chat-room .plus-menu-item:active,
html.liquid-theme #page-chat-room .sticker-panel-item:active{
 background:rgba(255,255,255,.08)!important;
}

/* ===== Chat modal/panel sweep ===== */
html.liquid-theme #page-chat-room :is(
 .chat-menu-panel,.chat-stats-panel,.chat-bg-panel,.global-search-panel,
 .group-create-panel,.group-setting-panel,.group-announce-panel,
 .voice-send-panel,.emoji-picker-panel,.call-picker-panel,
 .rp-action-panel,.redpacket-panel,.redpacket-claim-panel,
 .doodle-panel,.punish-panel,.black-room-panel,.effects-panel,
 .decision-panel,.pat-panel,.chat-background-panel,.background-setting-panel
){
 background:rgba(22,24,29,.95)!important;
 background-color:rgba(22,24,29,.95)!important;
 color:#fff!important;
 border:1px solid rgba(255,255,255,.16)!important;
 box-shadow:0 18px 52px rgba(0,0,0,.38)!important;
 -webkit-backdrop-filter:blur(22px) saturate(115%)!important;
 backdrop-filter:blur(22px) saturate(115%)!important;
}
html.liquid-theme #page-chat-room :is(
 .chat-menu-panel,.chat-stats-panel,.chat-bg-panel,.global-search-panel,
 .group-create-panel,.group-setting-panel,.group-announce-panel,
 .voice-send-panel,.emoji-picker-panel,.call-picker-panel,
 .rp-action-panel,.redpacket-panel,.redpacket-claim-panel,
 .doodle-panel,.punish-panel,.black-room-panel,.effects-panel,
 .decision-panel,.pat-panel,.chat-background-panel,.background-setting-panel
) :is(div,span,label,p,h1,h2,h3,h4,strong,small,i){
 --text-dark:#fff;--text-medium:rgba(255,255,255,.86);
 --text-light:rgba(255,255,255,.72);--text-lighter:rgba(255,255,255,.58);
}
html.liquid-theme #page-chat-room :is(
 .chat-menu-panel,.chat-stats-panel,.chat-bg-panel,.global-search-panel,
 .group-create-panel,.group-setting-panel,.group-announce-panel,
 .voice-send-panel,.emoji-picker-panel,.call-picker-panel,
 .rp-action-panel,.redpacket-panel,.redpacket-claim-panel,
 .doodle-panel,.punish-panel,.black-room-panel,.effects-panel,
 .decision-panel,.pat-panel,.chat-background-panel,.background-setting-panel
) :is(input,textarea,select){
 background:rgba(255,255,255,.09)!important;
 color:#fff!important;-webkit-text-fill-color:#fff!important;
 border-color:rgba(255,255,255,.18)!important;
}
html.liquid-theme #page-chat-room :is(input,textarea)::placeholder{
 color:rgba(255,255,255,.48)!important;-webkit-text-fill-color:rgba(255,255,255,.48)!important;
}

/* explicit known problem panels */
html.liquid-theme .chat-stats-panel *,
html.liquid-theme .chat-bg-panel *,
html.liquid-theme .redpacket-claim-panel *{
 color:inherit;
}
html.liquid-theme .chat-stats-title,
html.liquid-theme .chat-stats-section-title,
html.liquid-theme .chat-stats-count-num,
html.liquid-theme .chat-stats-count-label,
html.liquid-theme .chat-stats-sent-text,
html.liquid-theme .chat-menu-item,
html.liquid-theme .chat-menu-item i{
 color:#fff!important;-webkit-text-fill-color:#fff!important;
}
html.liquid-theme .chat-stats-section,
html.liquid-theme .chat-stats-count-card,
html.liquid-theme .chat-stats-close{
 background:rgba(255,255,255,.08)!important;border-color:rgba(255,255,255,.12)!important;
}

/* ===== Backup/progress ===== */
html.liquid-theme .backup-progress-card{
 background:rgba(22,24,29,.96)!important;color:#fff!important;
 border:1px solid rgba(255,255,255,.16)!important;
}
html.liquid-theme .backup-progress-text{color:#fff!important;-webkit-text-fill-color:#fff!important}

/* ===== Period: all major white cards -> dark glass ===== */
html.liquid-theme #page-period :is(
 .period-header,.period-cal-card,.period-record-panel,.period-overview-card,
 .period-legend,.period-reminder-panel,.period-confirm-box
){
 background:rgba(22,24,29,.76)!important;
 background-color:rgba(22,24,29,.76)!important;
 border-color:rgba(255,255,255,.16)!important;
 -webkit-backdrop-filter:blur(18px) saturate(110%)!important;
 backdrop-filter:blur(18px) saturate(110%)!important;
}
html.liquid-theme #page-period{
 --text-dark:#fff;--text-medium:rgba(255,255,255,.86);
 --text-light:rgba(255,255,255,.72);--text-lighter:rgba(255,255,255,.58);
}
html.liquid-theme #page-period :is(input,textarea,select,.period-drop-opt,.period-pain-opt,.calendar-nav button){
 background:rgba(255,255,255,.09)!important;color:#fff!important;
 border-color:rgba(255,255,255,.16)!important;
}

/* ===== Home journal mood / quote picker ===== */
html.liquid-theme .journal-mood-display .cust-emoji,
html.liquid-theme .emoji-picker-item .cust-emoji{
 background:rgba(18,20,24,.78)!important;color:#fff!important;
 border:1px solid rgba(255,255,255,.13)!important;
}
html.liquid-theme :is(.emoji-picker-panel,.quote-picker-panel){
 background:rgba(22,24,29,.96)!important;color:#fff!important;
 border:1px solid rgba(255,255,255,.16)!important;
}
html.liquid-theme :is(.emoji-picker-title,.quote-picker-title,.quote-picker-text){color:#fff!important}
html.liquid-theme :is(.emoji-picker-item,.quote-picker-item,.quote-picker-random){
 background:rgba(255,255,255,.08)!important;
 border-color:rgba(255,255,255,.14)!important;color:#fff!important;
}

/* runtime-detected bad contrast surfaces */
html.liquid-theme .rl7-v56-dark-surface{
 background:rgba(22,24,29,.96)!important;
 background-color:rgba(22,24,29,.96)!important;
 color:#fff!important;-webkit-text-fill-color:#fff!important;
 border-color:rgba(255,255,255,.16)!important;
}
html.liquid-theme .rl7-v56-dark-surface :is(div,span,label,p,strong,small,i,h1,h2,h3,h4){
 color:inherit;
}
`;

function installStyle(){
 var s=document.createElement('style');s.id='rl7-v56-style';s.textContent=css;document.head.appendChild(s);
}
function rgb(str){
 var m=(str||'').match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
 return m?[+m[1],+m[2],+m[3]]:null;
}
function lum(a){return a?(a[0]+a[1]+a[2])/3:0}
function isCandidate(el){
 if(!el||el.nodeType!==1)return false;
 var c=(el.className&&typeof el.className==='string')?el.className:'';
 return /(panel|card|menu|modal|dialog|picker|sheet|popup|toast|notice|progress|overlay|option|item)/i.test(c);
}
function scan(root){
 if(!document.documentElement.classList.contains('liquid-theme'))return;
 var arr=[];
 if(root&&root.querySelectorAll) arr=[root].concat(Array.from(root.querySelectorAll('*')));
 else arr=Array.from(document.querySelectorAll('*'));
 var n=0;
 for(var i=0;i<arr.length&&n<120;i++){
  var el=arr[i]; if(!isCandidate(el))continue;
  var cs=getComputedStyle(el), bg=rgb(cs.backgroundColor), fg=rgb(cs.color);
  if(!bg||!fg)continue;
  var ba=parseFloat((cs.backgroundColor.match(/[\d.]+\)$/)||['1'])[0]);
  if(ba<.45)continue;
  if(lum(bg)>225 && lum(fg)>205){
    el.classList.add('rl7-v56-dark-surface'); n++;
  }
 }
}
function boot(){
 installStyle();scan();
 var timer=0;
 new MutationObserver(function(ms){
  clearTimeout(timer);timer=setTimeout(function(){
   ms.forEach(function(m){for(var i=0;i<m.addedNodes.length;i++)scan(m.addedNodes[i])});
  },40);
 }).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();