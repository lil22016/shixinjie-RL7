/* 镜界 V90B — history delete hardening.
   app.js already renders a trash button on every full-history record; this makes deletion robust across numeric/string ids. */
(function(){'use strict';
var KEY='mirror_divine_records';
function install(){
 if(typeof window.renderFullHistory!=='function')return false;
 window._deleteDivineRecord=function(id){
   if(!confirm('确定要删除这条占卜记录吗？'))return;
   var records=[];
   try{records=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(records))records=[]}catch(e){}
   records=records.filter(function(r){return String(r.id)!==String(id)});
   try{localStorage.setItem(KEY,JSON.stringify(records))}catch(e){console.error('[V90B delete]',e);return}
   if(typeof window.renderFullHistory==='function')window.renderFullHistory();
   if(typeof window.renderRecentRecords==='function')window.renderRecentRecords();
 };
 return true;
}
install();var n=0,t=setInterval(function(){if(install()||++n>120)clearInterval(t)},100);
})();