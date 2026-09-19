/* RL7 v57 — iOS Home Screen status-bar wallpaper bridge
   DDL_helper-derived approach: wallpaper remains a real fixed plane;
   when iOS reports navigator.standalone but excludes the status bar from
   the CSS viewport, mirror the SAME wallpaper into the iOS status-bar
   surface via a live theme-color sampled from the wallpaper's top area.
   Also removes the v55 diagnostic UI.
*/
(function(){
'use strict';
if(window.__RL7_V57__)return;window.__RL7_V57__=1;

function removeDiag(){
 var a=document.getElementById('rl7-v55-diag-btn'); if(a)a.remove();
 var b=document.getElementById('rl7-v55-diag'); if(b)b.remove();
}
function addStyle(){
 var s=document.createElement('style');s.id='rl7-v57-style';
 s.textContent=`
#rl7-v55-diag-btn,#rl7-v55-diag{display:none!important}
html.liquid-theme #rl7-liquid-wallpaper{
 position:fixed!important;inset:0!important;
 width:100vw!important;height:100vh!important;height:100dvh!important;
 z-index:0!important;pointer-events:none!important;
 background-size:cover!important;background-position:center center!important;
 background-repeat:no-repeat!important;transform:translateZ(0)!important;
}
html.liquid-theme body>#app{position:relative!important;z-index:1!important;background:transparent!important}
html.liquid-theme #app-bg{background:transparent!important}
`;
 document.head.appendChild(s);
}
function meta(){
 var m=document.querySelector('meta[name="theme-color"]');
 if(!m){m=document.createElement('meta');m.name='theme-color';document.head.appendChild(m)}
 return m;
}
function hex(r,g,b){
 function h(n){return Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0')}
 return '#'+h(r)+h(g)+h(b);
}
function avgTop(img){
 try{
  var c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true});
  c.width=48;c.height=16;
  /* cover math, sample the top status-bar-equivalent strip of the same centered wallpaper */
  var vw=window.innerWidth||screen.width||402, vh=window.innerHeight||812;
  var scale=Math.max(vw/img.naturalWidth,vh/img.naturalHeight);
  var dw=img.naturalWidth*scale, dh=img.naturalHeight*scale;
  var sx=(dw-vw)/2/scale;
  var sw=vw/scale;
  var sh=Math.min(img.naturalHeight,Math.max(1,62/scale));
  ctx.drawImage(img,sx,0,sw,sh,0,0,c.width,c.height);
  var d=ctx.getImageData(0,0,c.width,c.height).data,R=0,G=0,B=0,N=0;
  for(var i=0;i<d.length;i+=4){if(d[i+3]>20){R+=d[i];G+=d[i+1];B+=d[i+2];N++}}
  return N?hex(R/N,G/N,B/N):null;
 }catch(e){return null}
}
function syncStatusSurface(){
 removeDiag();
 var wall=document.getElementById('rl7-liquid-wallpaper');
 if(!wall)return;
 var bg=getComputedStyle(wall).backgroundImage||'';
 var mm=bg.match(/^url\(["']?(.*?)["']?\)$/);
 if(!mm)return;
 var url=mm[1];
 var im=new Image();
 im.onload=function(){
  var col=avgTop(im);
  if(col){
   meta().setAttribute('content',col);
   document.documentElement.style.setProperty('--rl7-status-surface',col);
  }
 };
 im.src=url;
}
function boot(){
 addStyle();removeDiag();
 syncStatusSurface();
 setTimeout(syncStatusSurface,250);
 setTimeout(syncStatusSurface,1200);
 var wall=document.getElementById('rl7-liquid-wallpaper');
 if(wall)new MutationObserver(syncStatusSurface).observe(wall,{attributes:true,attributeFilter:['style','class']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();