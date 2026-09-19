/* RL7 Persistent Fixes v46
   Replaces rl7-daily-quote-fix-v28.js so index.html needs NO edit.
   Daily quote + unread cleanup + ECG compositor + Companion tap + durable update notice.
*/
(function(){'use strict';
if(window.__RL7_PERSISTENT_V46__)return;window.__RL7_PERSISTENT_V46__=1;

const QKEY='rl7_daily_quote_random_v46';
function dayKey(){let d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function qread(){try{return JSON.parse(localStorage.getItem(QKEY)||'null')}catch(e){return null}}
function qwrite(x){try{localStorage.setItem(QKEY,JSON.stringify(x))}catch(e){}}
function installQuote(){
 if(!window.JournalCard||!window.Storage)return false;
 JournalCard._getDailyRandomIndex=function(quotes){
   if(!quotes||!quotes.length)return -1;
   let today=dayKey(),s=qread();
   if(s&&s.date===today&&Number.isInteger(s.index)&&s.index>=0&&s.index<quotes.length)return s.index;
   let prev=s&&Number.isInteger(s.index)?s.index:-1,idx=Math.floor(Math.random()*quotes.length);
   if(quotes.length>1&&idx===prev)idx=(idx+1+Math.floor(Math.random()*(quotes.length-1)))%quotes.length;
   qwrite({date:today,index:idx});return idx;
 };
 const originalSelect=JournalCard._selectDailyQuote.bind(JournalCard);
 JournalCard._selectDailyQuote=function(index){
   if(index===-1){
     let quotes=Storage.getDailyQuotes()||[],s=qread(),prev=s&&Number.isInteger(s.index)?s.index:-1;
     let idx=quotes.length?Math.floor(Math.random()*quotes.length):-1;
     if(quotes.length>1&&idx===prev)idx=(idx+1+Math.floor(Math.random()*(quotes.length-1)))%quotes.length;
     qwrite({date:dayKey(),index:idx});
     let data=this._getData();data.dailyQuoteIndex=-1;this._save(data);this.render(data);this._closeQuotePicker();return;
   }
   return originalSelect(index);
 };
 const originalShow=JournalCard._showQuotePicker.bind(JournalCard);
 JournalCard._showQuotePicker=function(){
   originalShow();
   let list=document.querySelector('.quote-picker-list'),rnd=list&&list.querySelector('.quote-picker-random');
   if(rnd){
     rnd.innerHTML='<i class="fas fa-random"></i><span>每天随机一句</span><small>点击立即换一句；之后每天自动更换</small>';
     list.insertBefore(rnd,list.firstChild);
   }
 };
 let last=dayKey();
 setInterval(()=>{let n=dayKey();if(n!==last){last=n;try{JournalCard.render(JournalCard._getData())}catch(e){}}},30000);
 return true;
}

function clearUnread(){
 try{
   let chats=Storage.getChats()||[],changed=false;
   chats.forEach(c=>{if(Number(c.unread)>0){c.unread=0;changed=true}});
   if(changed)Storage.setChats(chats);
 }catch(e){}
 document.querySelectorAll('.rl7-home-unread').forEach(el=>el.style.display='none');
}
function installUnread(){
 if(!window.Navigation||Navigation.__v46Unread)return false;
 Navigation.__v46Unread=1;
 let old=Navigation._navigateTo.bind(Navigation);
 Navigation._navigateTo=function(page,rev){
   let was=this.currentPage,r=old(page,rev);
   if(page==='chat-list'||page==='chat-room'||was==='chat-room'){
     clearUnread();
     setTimeout(clearUnread,80);setTimeout(clearUnread,450);setTimeout(clearUnread,1100);
   }
   return r;
 };
 return true;
}

function installCompanion(){
 if(!window.RL7LokiCompanion)return false;
 if(document.documentElement.dataset.rl7CompTap)return true;
 document.documentElement.dataset.rl7CompTap='1';
 document.addEventListener('click',function(e){
   let stage=e.target&&e.target.closest&&e.target.closest('#rl7-lc-stage');if(!stage)return;
   let art=document.getElementById('rl7-lc-art-wrap');if(!art)return;
   art.classList.remove('rl7-lc-tap');void art.offsetWidth;art.classList.add('rl7-lc-tap');
   setTimeout(()=>art.classList.remove('rl7-lc-tap'),420);
 },true);
 return true;
}

function smoothECG(){
 let x=document.querySelector('.ecg-scroll');if(!x)return;
 x.style.animation='none';void x.getBoundingClientRect();x.style.animation='';
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestAnimationFrame(smoothECG)});
window.addEventListener('pageshow',()=>requestAnimationFrame(smoothECG));

async function hashText(s){
 try{
   let b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
   return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
 }catch(e){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return String(h)}
}
function showUpdated(){
 if(document.getElementById('rl7-durable-update'))return;
 let o=document.createElement('div');o.id='rl7-durable-update';
 o.innerHTML='<div class="rl7-durable-update-card"><b>Updated</b><span>拾心界已经更新到最新版本。</span><button type="button">OK</button></div>';
 document.body.appendChild(o);o.querySelector('button').onclick=()=>o.remove();
}
async function durableUpdate(){
 try{
   let r=await fetch('./index.html?rl7_update_probe='+Date.now(),{cache:'no-store'});if(!r.ok)return;
   let h=await hashText(await r.text()),k='rl7_durable_index_hash_v46',old=localStorage.getItem(k);
   localStorage.setItem(k,h);
   if(old&&old!==h)setTimeout(showUpdated,650);
 }catch(e){}
}

function installStyle(){
 if(document.getElementById('rl7-persistent-v46-style'))return;
 let s=document.createElement('style');s.id='rl7-persistent-v46-style';
 s.textContent=`
.quote-picker-panel{display:flex!important;flex-direction:column!important;max-height:min(78dvh,620px)!important}
.quote-picker-list{overflow-y:auto!important;-webkit-overflow-scrolling:touch!important}
.quote-picker-item{background:rgba(255,255,255,.94)!important;color:#27303a!important;border:1px solid rgba(40,50,65,.20)!important}
.quote-picker-item .quote-picker-text{color:#27303a!important}
.quote-picker-random{order:-1!important;position:sticky!important;top:0!important;z-index:3!important;background:#fff!important;color:#7d315d!important;border:2px solid rgba(125,49,93,.30)!important;font-weight:800!important;box-shadow:0 6px 16px rgba(0,0,0,.13)!important}
.quote-picker-random small{display:block;margin-left:auto;font-size:10px;font-weight:600;color:#625966!important}
.ecg-scroll{will-change:transform;transform:translate3d(0,0,0);backface-visibility:hidden}
.heartbeat-ecg{transform:translateZ(0);backface-visibility:hidden}
.rl7-lc-art-wrap.rl7-lc-tap{animation:rl7LcTap .38s cubic-bezier(.2,.85,.25,1)!important}
@keyframes rl7LcTap{0%{transform:translateX(-50%) translateY(0) scale(1)}35%{transform:translateX(-50%) translateY(-8px) scale(.965)}70%{transform:translateX(-50%) translateY(2px) scale(1.025)}100%{transform:translateX(-50%) translateY(0) scale(1)}}
#rl7-durable-update{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(12,14,22,.46);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.rl7-durable-update-card{width:min(86vw,340px);padding:22px;border-radius:24px;background:rgba(38,39,52,.97);border:1px solid rgba(255,255,255,.16);box-shadow:0 18px 60px rgba(0,0,0,.35);color:#fff;display:grid;gap:10px}
.rl7-durable-update-card b{font-size:23px}.rl7-durable-update-card span{font-size:14px;color:rgba(255,255,255,.78);line-height:1.5}.rl7-durable-update-card button{justify-self:end;padding:9px 18px;border:0;border-radius:13px;background:rgba(255,255,255,.16);color:#fff;font-weight:800}`;
 document.head.appendChild(s);
}

function boot(){
 installStyle();durableUpdate();setTimeout(smoothECG,500);
 let tries=0,t=setInterval(()=>{
   let a=installQuote(),b=installUnread(),c=installCompanion();
   if((a&&b&&c)||++tries>60)clearInterval(t);
 },200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();


/* ===== RL7 Liquid Glass Theme v47 =====
   Adapted from the user's reusable Liquid Glass kit:
   fixed wallpaper plane + neutral blur + light borders + text shadow.
*/
(function(){'use strict';
if(window.__RL7_LIQUID_GLASS_V47__)return;window.__RL7_LIQUID_GLASS_V47__=1;
const DB='rl7_liquid_wallpaper_db_v1', STORE='wallpaper', KEY='home';
function db(){return new Promise((res,rej)=>{try{let q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE)};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)}catch(e){rej(e)}})}
async function getWall(){let d=await db();return new Promise((res,rej)=>{let q=d.transaction(STORE,'readonly').objectStore(STORE).get(KEY);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}
async function setWall(v){let d=await db();return new Promise((res,rej)=>{let q=d.transaction(STORE,'readwrite').objectStore(STORE).put(v,KEY);q.onsuccess=()=>res();q.onerror=()=>rej(q.error)})}
async function delWall(){let d=await db();return new Promise((res,rej)=>{let q=d.transaction(STORE,'readwrite').objectStore(STORE).delete(KEY);q.onsuccess=()=>res();q.onerror=()=>rej(q.error)})}
let url='';
function layer(){
 let x=document.getElementById('rl7-liquid-wallpaper');
 if(!x){x=document.createElement('div');x.id='rl7-liquid-wallpaper';document.body.insertBefore(x,document.body.firstChild)}
 return x;
}
async function restore(){
 let b=null;try{b=await getWall()}catch(e){}
 if(url){try{URL.revokeObjectURL(url)}catch(e){}url=''}
 let x=layer();
 if(b instanceof Blob){url=URL.createObjectURL(b);x.style.backgroundImage='url("'+url.replace(/"/g,'\\"')+'")';x.classList.add('visible')}
 else{x.style.backgroundImage='none';x.classList.remove('visible')}
}
function active(){return window.ThemeManager&&ThemeManager.currentTheme==='liquid'}
function applyLiquid(){
 document.documentElement.classList.toggle('liquid-theme',active());
 layer();
}
function style(){
 if(document.getElementById('rl7-liquid-v47-style'))return;
 let s=document.createElement('style');s.id='rl7-liquid-v47-style';s.textContent=`
:root{--lg-blur:11.5px;--lg-alpha:.13;--lg-border:rgba(255,255,255,.42);--lg-highlight:rgba(255,255,255,.22);--lg-shadow:rgba(0,0,0,.20);--lg-text-shadow:0 2px 5px rgba(0,0,0,.72)}
#rl7-liquid-wallpaper{display:none;position:fixed;inset:0;width:100vw;height:100dvh;z-index:-2;pointer-events:none;background-size:cover;background-position:center;background-repeat:no-repeat;transform:translateZ(0)}
html.liquid-theme #rl7-liquid-wallpaper.visible{display:block}
html.liquid-theme,html.liquid-theme body,html.liquid-theme #app.phone-frame{background:transparent!important}
html.liquid-theme #app-bg{background:rgba(15,15,18,.08)!important;z-index:-1!important}
html.liquid-theme .page{background:transparent!important;background-color:transparent!important}
html.liquid-theme #page-home{background:transparent!important}
html.liquid-theme{--primary:#f4f4f5;--primary-rgb:244,244,245;--primary-light:#fff;--primary-dark:#e4e4e7;--primary-soft:#f4f4f5;--primary-bg:rgba(255,255,255,.08);--bg-main:transparent;--bg-gradient:linear-gradient(160deg,rgba(0,0,0,.02),rgba(0,0,0,.08));--text-dark:#fff;--text-medium:rgba(255,255,255,.88);--text-light:rgba(255,255,255,.78);--text-lighter:rgba(255,255,255,.62);--glass-bg:rgba(20,20,20,var(--lg-alpha));--glass-border:1px solid var(--lg-border);--shadow-sm:0 8px 24px rgba(0,0,0,.16);--nav-active:#fff;--nav-label-active:#fff}
html.liquid-theme .time-card,
html.liquid-theme .journal-row,
html.liquid-theme .rl7-home-companion-widget,
html.liquid-theme .settings-list,
html.liquid-theme .settings-section,
html.liquid-theme .chat-item,
html.liquid-theme .modal-panel,
html.liquid-theme .form-modal-panel,
html.liquid-theme .confirm-dialog,
html.liquid-theme .recipe-shell,
html.liquid-theme .love-page-container,
html.liquid-theme .anniv-modal-panel,
html.liquid-theme .anniv-form-panel,
html.liquid-theme .dream-time-dialog,
html.liquid-theme .status-picker-panel{
 background:rgba(20,20,20,var(--lg-alpha))!important;
 border:1px solid var(--lg-border)!important;
 box-shadow:inset 0 1px 0 var(--lg-highlight),0 12px 34px var(--lg-shadow)!important;
 -webkit-backdrop-filter:blur(var(--lg-blur)) saturate(100%)!important;
 backdrop-filter:blur(var(--lg-blur)) saturate(100%)!important;
 color:#fff!important
}
html.liquid-theme .home-feature-icon,
html.liquid-theme .nav-icon-circle,
html.liquid-theme button,
html.liquid-theme .glass-btn,
html.liquid-theme .settings-item .s-icon{
 background:rgba(255,255,255,.09)!important;border-color:rgba(255,255,255,.30)!important;color:#fff!important;
 box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 5px 16px rgba(0,0,0,.10)
}
html.liquid-theme .home-quote,html.liquid-theme .home-feature-label,html.liquid-theme .time-card,html.liquid-theme .journal-row,html.liquid-theme .bottom-nav,html.liquid-theme .page-header,html.liquid-theme .top-nav{text-shadow:var(--lg-text-shadow)}
html.liquid-theme .bottom-nav{background:rgba(18,18,20,.16)!important;border-top:1px solid rgba(255,255,255,.22)!important;-webkit-backdrop-filter:blur(calc(var(--lg-blur)*1.15))!important;backdrop-filter:blur(calc(var(--lg-blur)*1.15))!important}
html.liquid-theme input,html.liquid-theme textarea,html.liquid-theme select{background:rgba(255,255,255,.08)!important;border-color:rgba(255,255,255,.28)!important;color:#fff!important}
html.liquid-theme .list-divider{background:rgba(255,255,255,.14)!important}
.rl7-liquid-controls{margin-top:16px;padding:16px;border-radius:20px;background:rgba(255,255,255,.22);border:1px solid rgba(255,255,255,.36)}
.rl7-liquid-controls h4{margin:0 0 12px;font-size:14px;color:var(--text-dark)}
.rl7-liquid-actions{display:flex;gap:8px;flex-wrap:wrap}.rl7-liquid-actions button{flex:1;min-width:110px;padding:10px 12px;border:0;border-radius:14px;background:rgba(var(--primary-rgb),.16);color:var(--text-dark);font-weight:700}
.rl7-liquid-read{display:grid;grid-template-columns:80px 1fr 38px;gap:8px;align-items:center;margin-top:13px;font-size:12px;color:var(--text-medium)}
.rl7-liquid-read input{width:100%}.rl7-liquid-note{margin-top:8px;font-size:10px;line-height:1.45;color:var(--text-light)}
html.liquid-theme .rl7-liquid-controls{background:rgba(20,20,20,.16);border-color:rgba(255,255,255,.32);-webkit-backdrop-filter:blur(var(--lg-blur));backdrop-filter:blur(var(--lg-blur))}
@media(prefers-reduced-transparency:reduce){html.liquid-theme .time-card,html.liquid-theme .journal-row,html.liquid-theme .settings-list,html.liquid-theme .chat-item{background:rgba(24,24,24,.72)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}}
`;document.head.appendChild(s);
}
function readability(v){
 v=Math.max(0,Math.min(100,Number(v)||0));localStorage.setItem('rl7_liquid_readability_v1',String(v));
 document.documentElement.style.setProperty('--lg-blur',(3+v*.17).toFixed(1)+'px');
 document.documentElement.style.setProperty('--lg-alpha',(.055+v*.00155).toFixed(3));
 let o=document.getElementById('rl7-liquid-read-v');if(o)o.textContent=v;
}
async function choose(inp){
 let f=inp.files&&inp.files[0];if(!f)return;if(f.size>12*1024*1024){Core.toast('壁纸请控制在 12 MB 以内');inp.value='';return}
 try{await setWall(f);await restore();Core.toast('Liquid Glass 壁纸已保存')}catch(e){Core.toast('壁纸保存失败')}inp.value='';
}
async function clear(){try{await delWall()}catch(e){}await restore();Core.toast('Liquid Glass 壁纸已清除')}
function controls(){
 let c=document.getElementById('theme-selector-container')||document.querySelector('.theme-grid');
 if(!c)return;
 let host=c.parentElement||c;if(document.getElementById('rl7-liquid-controls'))return;
 let d=document.createElement('div');d.id='rl7-liquid-controls';d.className='rl7-liquid-controls';
 d.innerHTML='<h4>Liquid Glass</h4><div class="rl7-liquid-actions"><button id="rl7-liquid-pick">更换主页壁纸</button><button id="rl7-liquid-clear">清除壁纸</button></div><input id="rl7-liquid-file" type="file" accept="image/*" hidden><label class="rl7-liquid-read"><span>玻璃清晰度</span><input id="rl7-liquid-read" type="range" min="0" max="100"><b id="rl7-liquid-read-v"></b></label><div class="rl7-liquid-note">壁纸会保存在当前设备；Liquid Glass 使用固定壁纸层，不会因为页面高度变化而跳动。</div>';
 host.appendChild(d);
 let val=Number(localStorage.getItem('rl7_liquid_readability_v1')||50);d.querySelector('#rl7-liquid-read').value=val;readability(val);
 d.querySelector('#rl7-liquid-pick').onclick=()=>d.querySelector('#rl7-liquid-file').click();
 d.querySelector('#rl7-liquid-file').onchange=function(){choose(this)};
 d.querySelector('#rl7-liquid-clear').onclick=clear;
 d.querySelector('#rl7-liquid-read').oninput=function(){readability(this.value)};
}
function install(){
 if(!window.ThemeManager||!window.Storage)return false;
 if(!ThemeManager.themes.some(t=>t.id==='liquid'))ThemeManager.themes.push({id:'liquid',name:'Liquid Glass',color:'#DDE2E7'});
 if(!ThemeManager.__liquid47){
   ThemeManager.__liquid47=1;
   let oldApply=ThemeManager.apply.bind(ThemeManager);
   ThemeManager.apply=function(persist=true){let r=oldApply(persist);applyLiquid();return r};
   let oldRender=ThemeManager.renderThemeSelector.bind(ThemeManager);
   ThemeManager.renderThemeSelector=function(c){let r=oldRender(c);setTimeout(controls,0);return r};
   let oldGet=ThemeManager.getCurrent.bind(ThemeManager);
   ThemeManager.getCurrent=function(){if(this.currentTheme==='liquid')return {id:'liquid',name:'Liquid Glass',color:'#DDE2E7'};return oldGet()};
 }
 /* ThemeManager.init may have rejected liquid before this patch loaded. Recover saved choice. */
 try{
   let saved=Storage.get('theme','default');
   if(saved==='liquid'&&ThemeManager.currentTheme!=='liquid'){ThemeManager.currentTheme='liquid';ThemeManager.apply(false)}
 }catch(e){}
 applyLiquid();controls();restore();return true;
}
function boot(){style();let n=0,t=setInterval(()=>{if(install()||++n>60)clearInterval(t)},200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();



/* ===== RL7 Liquid Glass polish v48 =====
   Fixes: iOS top safe-area, settings contrast, quick-glass home icons,
   mood editor readability, and Moments readability/performance.
*/
(function(){'use strict';
if(window.__RL7_LIQUID_POLISH_V48__)return;window.__RL7_LIQUID_POLISH_V48__=1;
function add(){
 if(document.getElementById('rl7-liquid-v48-style'))return;
 var s=document.createElement('style');s.id='rl7-liquid-v48-style';s.textContent=`
/* 1. iOS/Bluefy safe area: extend wallpaper/theme behind the status bar.
   Body remains transparent in Liquid mode so the fixed wallpaper is visible. */
html.liquid-theme,html.liquid-theme body{
 min-height:100%;background-color:#202126!important;
}
html.liquid-theme body{background:transparent!important}
html.liquid-theme #rl7-liquid-wallpaper{
 top:calc(-1 * env(safe-area-inset-top,0px))!important;
 left:0!important;right:0!important;
 width:100vw!important;
 height:calc(100dvh + env(safe-area-inset-top,0px) + env(safe-area-inset-bottom,0px))!important;
 background-color:#202126!important;
}
html.liquid-theme #app-bg{
 top:calc(-1 * env(safe-area-inset-top,0px))!important;
 min-height:calc(100dvh + env(safe-area-inset-top,0px))!important;
}
html.liquid-theme #app.phone-frame{min-height:100dvh!important}

/* 2. Settings / global icon customization: dark neutral glass, never white-on-white. */
html.liquid-theme .icon-zone-box{
 background:rgba(17,19,23,.42)!important;
 border:1px solid rgba(255,255,255,.30)!important;
 box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 12px 30px rgba(0,0,0,.16)!important;
 -webkit-backdrop-filter:blur(12px) saturate(105%)!important;
 backdrop-filter:blur(12px) saturate(105%)!important;
}
html.liquid-theme .icon-zone-tip{color:rgba(255,255,255,.76)!important;text-shadow:0 1px 3px rgba(0,0,0,.65)}
html.liquid-theme .icon-zone-label{color:#fff!important;text-shadow:0 1px 3px rgba(0,0,0,.68)}
html.liquid-theme .icon-zone-hex{color:rgba(255,255,255,.80)!important;text-shadow:0 1px 3px rgba(0,0,0,.65)}
html.liquid-theme .icon-zone-hex.resettable{color:#fff!important}
html.liquid-theme .icon-zone-save,html.liquid-theme .icon-zone-reset-all{
 background:rgba(20,22,27,.34)!important;color:#fff!important;
 border:1px solid rgba(255,255,255,.30)!important
}
html.liquid-theme #page-appearance .section-title,
html.liquid-theme #page-settings-appearance .section-title{color:#fff!important;text-shadow:0 1px 4px rgba(0,0,0,.72)}

/* 3. Home app icons: quick glass, matching the Companion visual language. */
html.liquid-theme .home-feature-icon{
 width:44px!important;height:44px!important;border-radius:16px!important;
 background:rgba(20,22,28,.20)!important;
 border:1px solid rgba(255,255,255,.34)!important;
 color:#fff!important;
 -webkit-backdrop-filter:blur(7px) saturate(105%)!important;
 backdrop-filter:blur(7px) saturate(105%)!important;
 box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 7px 18px rgba(0,0,0,.14)!important;
}
html.liquid-theme .home-feature-icon i{filter:drop-shadow(0 2px 3px rgba(0,0,0,.42))}
html.liquid-theme .home-feature-label{color:#fff!important;text-shadow:0 2px 4px rgba(0,0,0,.82)!important}

/* 4. MoodFlow / generic glass editors: keep the glass panel darker and inputs readable.
   Explicit colors prevent the Liquid theme's white --text-dark from landing on white controls. */
html.liquid-theme #mood-overlay .glass-modal-panel{
 background:rgba(22,24,30,.62)!important;
 border:1px solid rgba(255,255,255,.34)!important;
 -webkit-backdrop-filter:blur(14px) saturate(105%)!important;
 backdrop-filter:blur(14px) saturate(105%)!important;
 box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 18px 54px rgba(0,0,0,.30)!important;
}
html.liquid-theme #mood-overlay .glass-modal-title,
html.liquid-theme #mood-overlay .mood-add-title,
html.liquid-theme #mood-overlay .mood-modal-desc,
html.liquid-theme #mood-overlay .mood-color-custom{color:#fff!important;text-shadow:0 1px 3px rgba(0,0,0,.70)}
html.liquid-theme #mood-overlay input[type="text"],
html.liquid-theme #mood-overlay select{
 background:rgba(255,255,255,.92)!important;
 color:#2f3440!important;
 -webkit-text-fill-color:#2f3440!important;
 caret-color:#2f3440!important;
 border:1px solid rgba(255,255,255,.90)!important;
 text-shadow:none!important;
}
html.liquid-theme #mood-overlay input[type="text"]::placeholder{color:#8a909c!important;-webkit-text-fill-color:#8a909c!important}
html.liquid-theme #mood-overlay .glass-btn{
 color:#fff!important;background:rgba(255,255,255,.12)!important;border:1px solid rgba(255,255,255,.30)!important;
}
html.liquid-theme #mood-overlay .glass-btn.primary{background:rgba(255,255,255,.22)!important}
html.liquid-theme #mood-overlay .mood-swatch{box-shadow:0 0 0 1px rgba(255,255,255,.28),0 2px 5px rgba(0,0,0,.22)}
html.liquid-theme #mood-overlay .mood-swatch.active{outline:2px solid #fff!important;outline-offset:2px}

/* 5. Moments: intentionally opt out of heavy Liquid Glass.
   Restore a readable neutral feed/card surface; only use text shadow where content sits over translucent areas. */
html.liquid-theme #page-moments,
html.liquid-theme .moments-page{--moments-ink:#303641;--moments-muted:#69717d}
html.liquid-theme .moments-feed{
 background:rgba(246,247,249,.96)!important;
 -webkit-backdrop-filter:none!important;backdrop-filter:none!important;
}
html.liquid-theme .moment-card{
 background:rgba(255,255,255,.98)!important;
 border:1px solid rgba(50,58,70,.10)!important;
 box-shadow:0 2px 9px rgba(20,28,40,.08)!important;
 -webkit-backdrop-filter:none!important;backdrop-filter:none!important;
}
html.liquid-theme .moment-card-text,
html.liquid-theme .moment-comment,
html.liquid-theme .moment-comment .c-text,
html.liquid-theme .moment-card-author{color:var(--moments-ink)!important;text-shadow:0 1px 1px rgba(0,0,0,.10)!important}
html.liquid-theme .moment-card-time,
html.liquid-theme .moment-card-source{color:var(--moments-muted)!important;text-shadow:none!important}
html.liquid-theme .moment-comment .c-name,
html.liquid-theme .moment-like-chip{color:#536783!important}
html.liquid-theme .moment-card-actions{border-color:rgba(45,55,70,.10)!important}
html.liquid-theme .moment-action-btn{color:#596270!important;background:rgba(50,60,75,.04)!important}
html.liquid-theme .moment-action-btn.danger{color:#c85f5f!important}
html.liquid-theme .moment-likes,
html.liquid-theme .moment-comments{background:rgba(238,241,245,.92)!important;border-radius:8px!important}
html.liquid-theme .moments-toolbar{
 background:rgba(246,247,249,.96)!important;
 -webkit-backdrop-filter:none!important;backdrop-filter:none!important;
}
html.liquid-theme .moments-toolbar-btn{color:#3f4855!important;text-shadow:none!important}
html.liquid-theme .moments-sheet,
html.liquid-theme .moments-panel{
 background:rgba(250,250,251,.98)!important;color:#303641!important;
 -webkit-backdrop-filter:none!important;backdrop-filter:none!important;
}
html.liquid-theme .moments-sheet input,
html.liquid-theme .moments-panel input{background:#fff!important;color:#303641!important;-webkit-text-fill-color:#303641!important}
`;document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add,{once:true});else add();
})();
