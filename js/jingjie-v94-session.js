/* 镜界 V94 — clean session controller
   One reading = one independent session.
   Limit is state-only; NEVER disables the fan container, so it cannot leak into the next session. */
(function(){'use strict';

function st(){ try { return divineState; } catch(e){ return null; } }
function maxCards(s){
  if(!s) return 0;
  return s.drawMode === 'spread'
    ? (Number(s.spreadCardCount) || 0)
    : (Number(s.customCount) || 3);
}
function revealBtn(){ return document.querySelector('#divine-result-footer .btn-reveal-all'); }
function label(t){ var b=revealBtn(); if(b) b.textContent=t; }
function cleanFan(){
  var f=document.getElementById('fan-scroll-container');
  if(!f)return;
  f.classList.remove('session-limit-reached','session-complete');
  f.style.pointerEvents='';
  f.style.opacity='';
}
function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
function showQuestion(s){
  var a=document.getElementById('reading-area'); if(!a)return;
  var old=a.querySelector('.divine-session-question'); if(old)old.remove();
  if(s&&s.question){
    var d=document.createElement('div'); d.className='divine-session-question';
    d.innerHTML='<span>'+esc(s.question)+'</span>'; a.prepend(d);
  }
}
function save(s){
  if(!s||!s.drawnCards||!s.drawnCards.length)return false;
  var deck=deckListData.find(function(d){return d.id===s.deckId});
  var spread=s.spreadId ? spreadListData.find(function(x){return x.id===s.spreadId}) : null;
  if(!spread) spread={id:'free',name:'自由抽取',cardCount:s.drawnCards.length,positions:null};
  if(!deck||typeof window._saveDivineRecord!=='function')return false;
  var cards=s.drawnCards.map(function(d){
    var c=Object.assign({},d.cardData||{}); c.isReversed=!!d.reversed; return c;
  });
  return window._saveDivineRecord(deck,spread,cards,s.reversedEnabled,'free',s.question)!==false;
}
function endSession(s){
  if(!s)return;
  s._saved=true;
  s._jjRevealed=false;
  s.isDivineActive=false;
  /* Crucial: completion is state-only. Do not add a CSS class that disables pointer events. */
  cleanFan();
  setTimeout(function(){ if(typeof window.openDivineHistory==='function') window.openDivineHistory(); },180);
}

function install(){
  if(typeof window.startDivine!=='function'||typeof window.pickFanCard!=='function'||typeof window.revealAllCards!=='function')return false;
  if(window.startDivine.__jjv94)return true;

  var baseStart=window.startDivine;
  var basePick=window.pickFanCard;
  var baseReveal=window.revealAllCards;

  window.startDivine=function(){
    /* A new Start always means a completely new session. */
    cleanFan();
    var s0=st();
    if(s0){
      s0.drawnCards=[];
      s0.readingCardIdCounter=0;
      s0._saved=false;
      s0._jjRevealed=false;
      s0.isDivineActive=false;
    }
    var r=baseStart.apply(this,arguments);
    var s=st();
    if(s){
      s.drawnCards=[];
      s.readingCardIdCounter=0;
      s._saved=false;
      s._jjRevealed=false;
      s.isDivineActive=true;
    }
    label('全部翻开');
    cleanFan();
    setTimeout(function(){ cleanFan(); showQuestion(st()); label('全部翻开'); },900);
    return r;
  };
  window.startDivine.__jjv94=true;

  window.pickFanCard=function(idx){
    var s=st(); if(!s||!s.isDivineActive)return;
    var max=maxCards(s);
    if(max>0 && s.drawnCards.length>=max)return;

    /* divination.js has an old "spread full => auto-save" block.
       Suppress ONLY that legacy save on the final allowed pick.
       The reading is saved only when the user presses 保存本次抽牌. */
    var finalPick=max>0 && (s.drawnCards.length+1)>=max;
    var oldSaved=s._saved;
    if(finalPick) s._saved=true;
    var r=basePick.apply(this,arguments);
    s=st();
    if(s) s._saved=oldSaved;

    showQuestion(s);
    /* Do not disable the fan. Further picks are blocked by the count check above. */
    cleanFan();
    return r;
  };

  window.revealAllCards=function(){
    var s=st(); if(!s||!s.isDivineActive)return;
    var max=maxCards(s);
    if(max>0 && s.drawnCards.length<max){
      alert('还需要抽 '+(max-s.drawnCards.length)+' 张牌');
      return;
    }
    if(!s._jjRevealed){
      /* Use base visual flip, but suppress its legacy auto-save. */
      var oldSaved=s._saved; s._saved=true;
      baseReveal.apply(this,arguments);
      s._saved=oldSaved;
      s._jjRevealed=true;
      showQuestion(s);
      label('保存本次抽牌');
      cleanFan();
      return;
    }
    if(!s._saved && !save(s))return;
    endSession(s);
  };
  window.revealAllCards.__jjv94=true;
  return true;
}
var tries=0,t=setInterval(function(){if(install()||++tries>160)clearInterval(t)},100);
})();