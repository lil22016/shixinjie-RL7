/* RL7 v62 — corrected Mochi-style iOS keyboard docking
   IMPORTANT: does NOT make #app fixed while the keyboard is open.
   iOS uses resizes-content; JS only handles WebKit overlay/missed-resize cases. */
(function(){
'use strict';
if(window.__RL7_V62_MOCHI__)return; window.__RL7_V62_MOCHI__=1;
var ua=navigator.userAgent||'';
var ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
if(!ios)return;

var root=document.documentElement, vv=window.visualViewport;
root.classList.add('rl7-ios');
var standalone=navigator.standalone===true ||
  (window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches);
if(standalone)root.classList.add('rl7-ios-standalone');

/* Mochi current source explicitly switches iOS back to resizes-content. */
try{
 document.querySelectorAll('meta[name="viewport"]').forEach(function(m){
   m.setAttribute('content','width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content');
 });
}catch(e){}

var app, focused=null, kb=false, fullInner=window.innerHeight||0;
var fullVv=vv?Math.round(vv.height):fullInner, timer=null, pinUntil=0;

function getApp(){return app||(app=document.getElementById('app'))}
function isText(el){
 if(!el||el.nodeType!==1)return false;
 var t=(el.tagName||'').toUpperCase();
 return t==='INPUT'||t==='TEXTAREA'||el.isContentEditable===true;
}
function chatOpen(){
 var p=document.getElementById('page-chat-room');
 return !!(p&&p.classList.contains('active'));
}
function setH(px){
 var a=getApp(); if(!a)return;
 if(px==null){a.style.height='';a.style.minHeight='';a.style.alignSelf='';return}
 var floor=Math.round(fullInner*.4);
 var h=Math.max(floor,Math.round(px));
 a.style.minHeight='0px';
 a.style.height=h+'px';
 a.style.alignSelf='flex-start';
}
function pinTop(){
 try{
   if(window.scrollY||document.documentElement.scrollTop||document.body.scrollTop){
     window.scrollTo(0,0); document.documentElement.scrollTop=0; document.body.scrollTop=0;
   }
 }catch(e){}
}
function restore(){
 kb=false; setH(null); root.classList.remove('rl7-kbd-open'); stopWatch();
 if(!isText(document.activeElement)){fullInner=window.innerHeight||fullInner;fullVv=vv?Math.round(vv.height):fullInner}
}
function ensureDocked(){
 if(!kb||!vv||!chatOpen())return;
 var tgt=isText(focused)?focused:(isText(document.activeElement)?document.activeElement:null);
 if(!tgt||!tgt.getBoundingClientRect)return;
 var r=tgt.getBoundingClientRect(), vh=vv.height;
 if(r.bottom<=vh+2)return;
 var a=getApp(), ar=a.getBoundingClientRect();
 var cut=Math.ceil(r.bottom-vh)+12;
 setH(Math.round(ar.height-cut));
}
function sync(){
 if(!vv||!getApp())return;
 var foc=isText(focused)||isText(document.activeElement);
 var h=vv.height, ih=window.innerHeight||h;
 if(!foc&&!kb){fullInner=ih;fullVv=Math.round(h)}
 var now=h<fullVv-60 || ih<fullInner-60;
 if(kb&&!now){restore();return}
 if(foc&&now&&!kb){
   kb=true;root.classList.add('rl7-kbd-open');pinUntil=Date.now()+500;pinTop();startWatch();
 }
 if(kb){
   /* In resizes-content mode innerHeight may already equal vv.height.
      Setting the same height is harmless; min-height is explicitly zeroed. */
   setH(h);
   if(Date.now()<pinUntil)pinTop();
   if(Date.now()>=pinUntil)ensureDocked();
 }
}
function startWatch(){
 if(timer)return;
 timer=setInterval(function(){
   if(isText(focused)||isText(document.activeElement)){sync();ensureDocked()}
   else if(kb){
     if(vv&&vv.height>=fullVv-60)restore();
   }else stopWatch();
 },250);
}
function stopWatch(){if(timer){clearInterval(timer);timer=null}}
document.addEventListener('focusin',function(e){
 if(!isText(e.target))return;
 focused=e.target;
 setTimeout(sync,0);setTimeout(sync,120);setTimeout(sync,350);setTimeout(sync,550);
 startWatch();
},true);
document.addEventListener('focusout',function(e){
 if(e.target===focused)focused=null;
 setTimeout(sync,120);setTimeout(sync,350);
},true);
if(vv){vv.addEventListener('resize',sync,{passive:true});vv.addEventListener('scroll',sync,{passive:true})}
window.addEventListener('resize',sync,{passive:true});
})();
