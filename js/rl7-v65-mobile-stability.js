/* RL7 v65 — single-owner iOS mobile stability patch.
   IMPORTANT: replace rl7-v62-mochi-ios.js with this file; do not load both. */
(function(){
'use strict';
if (window.__RL7_V65_MOBILE_STABILITY__) return;
window.__RL7_V65_MOBILE_STABILITY__ = 1;

var ua = navigator.userAgent || '';
var ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
var root = document.documentElement;
var vv = window.visualViewport;
if (ios) root.classList.add('rl7-ios');

/* ---------- chat keyboard: visualViewport owns geometry; never resize #app ---------- */
var raf = 0;
function isChatInputFocused(){
  var a = document.activeElement;
  return !!(a && (a.id === 'chat-input' || (a.closest && a.closest('#page-chat-room')) && /INPUT|TEXTAREA/.test(a.tagName)));
}
function chatOpen(){
  var p = document.getElementById('page-chat-room');
  return !!(p && p.classList.contains('active'));
}
function syncChatViewport(){
  if (!ios || !chatOpen()) return;
  var top = vv ? Math.max(0, Math.round(vv.offsetTop || 0)) : 0;
  var h = vv ? Math.round(vv.height) : Math.round(window.innerHeight || 0);
  if (!h) return;
  root.style.setProperty('--rl7-chat-vv-top', top + 'px');
  root.style.setProperty('--rl7-chat-vv-height', h + 'px');
  root.classList.toggle('rl7-kbd-open', isChatInputFocused() && h < screen.height * .82);
}
function queueSync(){
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(syncChatViewport);
}
if (vv) {
  vv.addEventListener('resize', queueSync, {passive:true});
  vv.addEventListener('scroll', queueSync, {passive:true});
}
window.addEventListener('resize', queueSync, {passive:true});
document.addEventListener('focusin', function(e){
  if (!e.target || !e.target.closest || !e.target.closest('#page-chat-room')) return;
  /* Do not blur/re-focus. Let iOS keep the keyboard session alive. */
  queueSync();
  setTimeout(queueSync, 60);
  setTimeout(queueSync, 180);
  setTimeout(queueSync, 360);
}, true);
document.addEventListener('focusout', function(e){
  if (!e.target || !e.target.closest || !e.target.closest('#page-chat-room')) return;
  setTimeout(queueSync, 120);
}, true);

/* ---------- call UI: mount outside chat stacking contexts ---------- */
function installCallMount(){
  if (typeof window._getCallMountRoot === 'function' && !window._getCallMountRoot.__v65) {
    var fn = function(){ return document.body; };
    fn.__v65 = true;
    window._getCallMountRoot = fn;
  }
}

/* ---------- mini call bubble: drag against visual viewport, not chat page rect ---------- */
function installBubbleDrag(){
  if (typeof window._initCallBubbleDrag !== 'function' || window._initCallBubbleDrag.__v65) return;
  var replacement = function(){
    var bubble = document.getElementById('call-mini-bubble');
    if (!bubble) return;
    var dragging=false, moved=false, sx=0, sy=0, ox=0, oy=0;
    var lastT=0,lastX=0,lastY=0;
    function hang(e){ return e.target && e.target.closest && e.target.closest('.call-mini-hangup'); }
    function bounds(){
      var left = vv ? vv.offsetLeft : 0;
      var top  = vv ? vv.offsetTop  : 0;
      var w    = vv ? vv.width      : window.innerWidth;
      var h    = vv ? vv.height     : window.innerHeight;
      return {left:left, top:top, right:left+w, bottom:top+h};
    }
    function point(e){ return e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e); }
    function down(e){
      if (hang(e)) return;
      var p=point(e), r=bubble.getBoundingClientRect();
      sx=p.clientX; sy=p.clientY; ox=r.left; oy=r.top; dragging=true; moved=false;
      bubble.style.transition='none'; bubble.style.right='auto'; bubble.style.bottom='auto';
      if(e.cancelable)e.preventDefault();
    }
    function move(e){
      if(!dragging)return;
      var p=point(e), b=bounds(), bw=bubble.offsetWidth, bh=bubble.offsetHeight;
      var x=Math.max(b.left,Math.min(b.right-bw,ox+p.clientX-sx));
      var y=Math.max(b.top, Math.min(b.bottom-bh,oy+p.clientY-sy));
      if(Math.abs(p.clientX-sx)>3||Math.abs(p.clientY-sy)>3)moved=true;
      bubble.style.left=x+'px'; bubble.style.top=y+'px';
      if(e.cancelable)e.preventDefault();
    }
    function up(e){
      if(!dragging)return; dragging=false; bubble.style.transition='';
      var p=point(e), now=Date.now();
      if(!moved && !hang(e) && now-lastT<350 && Math.abs(p.clientX-lastX)<12 && Math.abs(p.clientY-lastY)<12){
        lastT=0; if(typeof window.restoreCall==='function')window.restoreCall(); return;
      }
      if(!moved){lastT=now;lastX=p.clientX;lastY=p.clientY;}
      moved=false;
    }
    bubble.addEventListener('touchstart',down,{passive:false});
    bubble.addEventListener('touchmove',move,{passive:false});
    bubble.addEventListener('touchend',up,{passive:false});
    bubble.addEventListener('mousedown',down);
    document.addEventListener('mousemove',move);
    document.addEventListener('mouseup',up);
  };
  replacement.__v65=true;
  window._initCallBubbleDrag=replacement;
}

function install(){ installCallMount(); installBubbleDrag(); queueSync(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){setTimeout(install,0);},{once:true});
else setTimeout(install,0);
/* chat-panels.js is already loaded before this patch in current index, but retry briefly for cache/order safety. */
var tries=0, t=setInterval(function(){ install(); if(++tries>20)clearInterval(t); },250);
})();
