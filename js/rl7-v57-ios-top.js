/* RL7 v57 — iOS Home Screen status-bar wallpaper bridge
   NOTE (2026-09-23): theme-color is now owned SOLELY by syncChromeColor() in
   js/rl7-patches.js (forced dark #202126). The old wallpaper-sampling code that
   wrote theme-color from here was removed so the two can never fight over it.
   What remains: wallpaper-plane CSS fixes + removal of the v55 diagnostic UI
   (no-op when v55 was never loaded). No storage, no data touched.
*/
(function(){
'use strict';
if(window.__RL7_V57__)return;window.__RL7_V57__=1;

function removeDiag(){
 var a=document.getElementById('rl7-v55-diag-btn'); if(a)a.remove();
 var b=document.getElementById('rl7-v55-diag'); if(b)b.remove();
}
function addStyle(){
 var old=document.getElementById('rl7-v57-style'); if(old)old.remove();
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
function boot(){
 addStyle();removeDiag();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
