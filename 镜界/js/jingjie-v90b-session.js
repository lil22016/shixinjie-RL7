/* 镜界 V90B — two-step reveal/save session.
   First click: reveal only. Second click: save this reading, then open history. */
(function(){'use strict';
function state(){try{return divineState}catch(e){return null}}
function limit(st){if(!st)return 0;if(st.drawMode==='spread')return Number(st.spreadCardCount)||0;return Number(st.customCount)||3}
function btn(){return document.querySelector('#divine-result-footer .btn-reveal-all')}
function setLabel(label){var b=btn();if(b)b.textContent=label}
function questionHeader(st){
 var area=document.getElementById('reading-area');if(!area)return;
 var old=area.querySelector('.divine-session-question');if(old)old.remove();
 if(st&&st.question){
   var d=document.createElement('div');d.className='divine-session-question';
   d.innerHTML='<span>'+String(st.question).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})+'</span>';
   area.prepend(d);
 }
}
function saveCurrent(st){
 if(!st||!st.drawnCards||!st.drawnCards.length)return false;
 var deck=deckListData.find(function(d){return d.id===st.deckId}), spread=null;
 if(st.spreadId)spread=spreadListData.find(function(s){return s.id===st.spreadId});
 if(!spread)spread={id:'free',name:'自由抽取',cardCount:st.drawnCards.length,positions:null};
 if(!deck||typeof window._saveDivineRecord!=='function')return false;
 var cards=st.drawnCards.map(function(d){
   var c=Object.assign({},d.cardData||{});
   c.isReversed=!!d.reversed; return c;
 });
 var ok=window._saveDivineRecord(deck,spread,cards,st.reversedEnabled,'free',st.question);
 if(ok!==false)st._saved=true;
 return ok!==false;
}
function finish(st){
 if(st)st.isDivineActive=false;
 var fan=document.getElementById('fan-scroll-container');
 if(fan){fan.classList.add('session-complete');fan.classList.remove('session-limit-reached')}
 setTimeout(function(){if(typeof window.openDivineHistory==='function')window.openDivineHistory()},180);
}
function boot(){
 if(typeof window.startDivine!=='function'||typeof window.pickFanCard!=='function'||typeof window.revealAllCards!=='function')return false;
 if(window.revealAllCards.__jjv90b)return true;
 var oldStart=window.startDivine,oldPick=window.pickFanCard,baseReveal=window.revealAllCards;
 /* unwrap V87 if present: its wrapper immediately finishes/redirects. */
 if(baseReveal.__jjv87 && window.__JJ_V87_ORIGINAL_REVEAL__) baseReveal=window.__JJ_V87_ORIGINAL_REVEAL__;

 window.startDivine=function(){
   var r=oldStart.apply(this,arguments),st=state();
   if(st){st._jjRevealed=false;st._saved=false}
   setLabel('全部翻开');
   setTimeout(function(){questionHeader(state());setLabel('全部翻开')},850);
   return r;
 };
 window.startDivine.__jjv90b=true;

 window.pickFanCard=function(idx){
   var st=state();if(!st||!st.isDivineActive)return;
   var max=limit(st);if(max>0&&st.drawnCards.length>=max)return;
   var r=oldPick.apply(this,arguments);questionHeader(state());
   return r;
 };

 window.revealAllCards=function(){
   var st=state(),max=limit(st);
   if(!st)return;
   if(max>0&&st.drawnCards.length<max){if(window.alert)alert('还需要抽 '+(max-st.drawnCards.length)+' 张牌');return}
   if(!st._jjRevealed){
     /* Prevent divination.js from auto-saving on reveal. */
     var wasSaved=st._saved; st._saved=true;
     baseReveal.apply(this,arguments);
     st._saved=wasSaved;
     st._jjRevealed=true;
     questionHeader(st);
     setLabel('保存本次抽牌');
     return;
   }
   if(!st._saved && !saveCurrent(st))return;
   finish(st);
 };
 window.revealAllCards.__jjv90b=true;
 return true;
}
var n=0,t=setInterval(function(){if(boot()||++n>160)clearInterval(t)},100);
})();