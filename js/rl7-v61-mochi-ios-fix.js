/* RL7 v61 — Mochi-derived iOS keyboard docking + standalone shell */
(function(){
'use strict';
if(window.__RL7_V61_MOCHI_IOS__)return;
window.__RL7_V61_MOCHI_IOS__=1;

var root=document.documentElement;
var ua=navigator.userAgent||'';
var ios=/iPhone|iPad|iPod/i.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
if(!ios)return;
root.classList.add('rl7-ios');

var standalone=(window.navigator.standalone===true) ||
  (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
if(standalone)root.classList.add('rl7-ios-standalone');

var vv=window.visualViewport;
var app=null, focused=null, baseH=0, watch=0, raf=0;

function isText(el){
  if(!el || el.nodeType!==1)return false;
  var t=(el.tagName||'').toLowerCase();
  return t==='input'||t==='textarea'||el.isContentEditable;
}
function chatOpen(){
  var p=document.getElementById('page-chat-room');
  return !!(p && p.classList.contains('active'));
}
function getApp(){ return app || (app=document.getElementById('app')); }
function visibleH(){
  return vv ? Math.round(vv.height) : Math.round(window.innerHeight||0);
}
function reset(){
  var a=getApp(); if(!a)return;
  a.style.height='';
  a.style.minHeight='';
  a.style.top='';
  root.classList.remove('rl7-kbd-open');
}
function dock(){
  if(!chatOpen())return;
  var a=getApp(), el=isText(focused)?focused:(isText(document.activeElement)?document.activeElement:null);
  if(!a||!el)return;

  var h=visibleH();
  if(!h)return;
  var full=Math.max(baseH, window.innerHeight||0);
  var kb=full-h>60;

  /* Mochi principle: once keyboard shrink is measurable, size the whole shell
     to the real visual viewport instead of moving only the input bar. */
  if(kb){
    root.classList.add('rl7-kbd-open');
    a.style.minHeight='0px';
    a.style.height=h+'px';
    a.style.top=(vv ? Math.max(0,Math.round(vv.offsetTop||0)) : 0)+'px';
  }

  /* Result-based fallback: focus may arrive before WebKit fires vv.resize.
     If the focused control is still below the visible viewport, shrink by
     exactly the hidden amount. This fixes "moves only after first typed char". */
  requestAnimationFrame(function(){
    try{
      if(!isText(el)||!chatOpen())return;
      var r=el.getBoundingClientRect(), vh=visibleH();
      if(r.bottom>vh+2){
        var ar=a.getBoundingClientRect();
        var cut=Math.ceil(r.bottom-vh)+10;
        var nh=Math.max(260,Math.round(ar.height-cut));
        root.classList.add('rl7-kbd-open');
        a.style.minHeight='0px';
        a.style.height=nh+'px';
        if(el.scrollIntoView)el.scrollIntoView({block:'nearest',inline:'nearest'});
      }
    }catch(e){}
  });
}
function schedule(){
  if(raf)return;
  raf=requestAnimationFrame(function(){raf=0;dock();});
}
function startWatch(){
  if(watch)return;
  watch=setInterval(function(){
    if(isText(focused)||isText(document.activeElement))dock();
    else { clearInterval(watch); watch=0; }
  },120);
}
function onFocus(e){
  if(!isText(e.target))return;
  focused=e.target;
  baseH=Math.max(baseH,window.innerHeight||0,vv?vv.height:0);
  schedule();
  setTimeout(schedule,60);
  setTimeout(schedule,160);
  setTimeout(schedule,320);
  setTimeout(schedule,520);
  startWatch();
}
function onBlur(e){
  if(e.target===focused)focused=null;
  setTimeout(function(){
    if(!isText(document.activeElement))reset();
  },180);
}
document.addEventListener('focusin',onFocus,true);
document.addEventListener('focusout',onBlur,true);
if(vv){
  vv.addEventListener('resize',schedule,{passive:true});
  vv.addEventListener('scroll',schedule,{passive:true});
}
window.addEventListener('resize',function(){
  if(!isText(document.activeElement)){
    baseH=Math.max(window.innerHeight||0,vv?vv.height:0);
    reset();
  }else schedule();
},{passive:true});
window.addEventListener('pageshow',function(){
  baseH=Math.max(window.innerHeight||0,vv?vv.height:0);
  reset();
},{passive:true});
baseH=Math.max(window.innerHeight||0,vv?vv.height:0);
})();
