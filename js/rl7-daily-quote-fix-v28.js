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