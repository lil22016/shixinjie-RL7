/* 镜界 V87 — draw-session rules. Load AFTER app.js. */
(function(){'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
function state(){try{return divineState}catch(e){return null}}
function limit(st){if(!st)return 0;if(st.drawMode==='spread')return Number(st.spreadCardCount)||0;return Number(st.customCount)||3}
function questionHeader(st){
 var area=document.getElementById('reading-area');if(!area)return;
 var old=area.querySelector('.divine-session-question');if(old)old.remove();
 if(st&&st.question){var d=document.createElement('div');d.className='divine-session-question';d.innerHTML='<span>'+esc(st.question)+'</span>';area.prepend(d)}
}
function finish(st){
 if(!st)return;
 st.isDivineActive=false;
 var fan=document.getElementById('fan-scroll-container');if(fan)fan.classList.add('session-complete');
 var foot=document.getElementById('divine-result-footer');if(foot)foot.style.display='none';
 setTimeout(function(){if(typeof window.openDivineHistory==='function')window.openDivineHistory()},650);
}
function boot(){
 if(typeof window.startDivine!=='function'||window.startDivine.__jjv87)return false;
 var oldStart=window.startDivine,oldPick=window.pickFanCard,oldReveal=window.revealAllCards;
 window.startDivine=function(){
   var mode=document.getElementById('divine-draw-mode');
   var st=state();
   /* Existing UI has no deck-mode count control; keep its intended customCount, default 3. */
   var r=oldStart.apply(this,arguments);
   setTimeout(function(){var x=state();questionHeader(x);var fan=document.getElementById('fan-scroll-container');if(fan)fan.classList.remove('session-complete')},850);
   return r;
 };
 window.startDivine.__jjv87=1;
 window.pickFanCard=function(idx){
   var st=state();if(!st||!st.isDivineActive)return;
   var max=limit(st);if(max>0&&st.drawnCards.length>=max)return;
   var r=oldPick.apply(this,arguments);
   st=state();questionHeader(st);
   if(max>0&&st.drawnCards.length>=max){var fan=document.getElementById('fan-scroll-container');if(fan)fan.classList.add('session-limit-reached')}
   return r;
 };
 window.revealAllCards=function(){
   var st=state(),max=limit(st);
   /* "全部翻开" ends only a complete session; prevents accidentally saving fewer than requested. */
   if(st&&max>0&&st.drawnCards.length<max){if(window.alert)alert('还需要抽 '+(max-st.drawnCards.length)+' 张牌');return}
   var r=oldReveal.apply(this,arguments);st=state();questionHeader(st);
   /* Existing revealAllCards already calls _saveDivineRecord; now end session and open history. */
   finish(st);return r;
 };
 return true;
}
var n=0,t=setInterval(function(){if(boot()||++n>120)clearInterval(t)},100);
})();