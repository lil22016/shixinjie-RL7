/* RL7 V76 — controlled chat edge elasticity. */
(function(){
'use strict';
if(window.__RL7_V76_CHAT_ELASTIC__)return;
window.__RL7_V76_CHAT_ELASTIC__=1;
var box=null,startY=0,lastY=0,edge='',elastic=0,active=false;
function getBox(){return document.getElementById('chat-messages')}
function atTop(el){return el.scrollTop<=1}
function atBottom(el){return el.scrollTop+el.clientHeight>=el.scrollHeight-1}
function reset(animated){
 if(!box)return;
 box.style.transition=animated?'transform 180ms cubic-bezier(.22,.75,.25,1)':'none';
 box.style.transform='translate3d(0,0,0)';
 elastic=0;edge='';active=false;
 if(animated)setTimeout(function(){if(box)box.style.transition=''},190);
}
function resist(distance){
 var d=Math.abs(distance);
 return Math.min(28,(d*.20)/(1+d/150));
}
document.addEventListener('touchstart',function(e){
 var el=getBox();
 if(!el||!el.closest('#page-chat-room.active')||e.touches.length!==1||!el.contains(e.target))return;
 box=el;startY=lastY=e.touches[0].clientY;
 edge=atTop(el)?'top':(atBottom(el)?'bottom':'');
 elastic=0;active=false;el.style.transition='none';
},{passive:true,capture:true});
document.addEventListener('touchmove',function(e){
 if(!box||e.touches.length!==1||!box.isConnected)return;
 var y=e.touches[0].clientY,total=y-startY,nowTop=atTop(box),nowBottom=atBottom(box);
 if(!edge){
  if(nowTop&&y>lastY){edge='top';startY=lastY;total=y-startY}
  else if(nowBottom&&y<lastY){edge='bottom';startY=lastY;total=y-startY}
 }
 var outward=(edge==='top'&&total>0&&nowTop)||(edge==='bottom'&&total<0&&nowBottom);
 if(outward){
  active=true;elastic=resist(total)*(total<0?-1:1);
  box.style.transform='translate3d(0,'+elastic.toFixed(2)+'px,0)';
  if(e.cancelable)e.preventDefault();
 }else if(active){reset(false)}
 lastY=y;
},{passive:false,capture:true});
function end(){if(!box)return;if(active||elastic)reset(true);box=null}
document.addEventListener('touchend',end,{passive:true,capture:true});
document.addEventListener('touchcancel',end,{passive:true,capture:true});
})();