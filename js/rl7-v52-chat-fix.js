/* RL7 v52: deterministic chat state; does not mirror chat wallpaper to html/body/app-bg. */
(function(){
'use strict';
if(window.__RL7_V52__)return;window.__RL7_V52__=1;

function chatActive(){
 var p=document.getElementById('page-chat-room');
 return !!(p&&p.classList.contains('active'));
}
function sync(){
 var on=chatActive();
 document.documentElement.classList.toggle('rl7-chat-v52',on);
 if(on){
   var vv=window.visualViewport;
   var keyboard=!!(vv && (window.innerHeight-vv.height)>120);
   if(!keyboard){
     document.documentElement.style.setProperty('--chat-offset','0px');
     document.documentElement.style.setProperty('--chat-h','100dvh');
     document.documentElement.style.setProperty('--kbd','0px');
   }
 }
}
function install(){
 sync();
 var app=document.getElementById('app');
 if(app)new MutationObserver(sync).observe(app,{subtree:true,attributes:true,attributeFilter:['class']});
 window.addEventListener('pageshow',sync);
 window.addEventListener('resize',sync);
 if(window.visualViewport)window.visualViewport.addEventListener('resize',sync);
 /* Navigation changes active class synchronously; run after every navigation as an extra guarantee. */
 if(window.Navigation&&typeof Navigation._navigateTo==='function'&&!Navigation.__v52){
   Navigation.__v52=true;
   var old=Navigation._navigateTo;
   Navigation._navigateTo=function(){var r=old.apply(this,arguments);sync();return r};
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
