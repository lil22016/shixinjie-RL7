/* 镜界 V89 — reliable history save after V87 reveal.
Load AFTER jingjie-v87-session.js. */
(function(){'use strict';
var KEY='mirror_divine_records',MAX=200;
function get(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
function put(a){try{localStorage.setItem(KEY,JSON.stringify(a));return true}catch(e){console.error('[V89 history save]',e);return false}}
function snapshot(){
 var q=document.querySelector('.divine-session-question span');
 var cards=[].slice.call(document.querySelectorAll('#reading-area .reading-card'));
 if(!cards.length)return false;
 /* If the original save succeeded, don't duplicate a record from the last few seconds. */
 var records=get(),now=Date.now(),question=q?(q.textContent||'').trim():'';
 if(records[0]&&now-Number(records[0].id||0)<4000&&((records[0].question||'')===question))return true;
 var out=cards.map(function(el,i){
  var name=(el.getAttribute('data-card-name')||el.querySelector('.card-name')?.textContent||el.querySelector('.reading-card-name')?.textContent||('牌 '+(i+1))).trim();
  return {name:name,isReversed:el.classList.contains('reversed'),position:'位'+(i+1),cardIndex:i,gradient:'',svgContent:null,imageData:null,isIChing:false};
 });
 var d=new Date(),rec={id:now,dateTime:d.toISOString(),dateStr:d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate(),deckId:'session',deckName:'本轮抽牌',spreadId:'free',spreadName:'自由抽取',source:'free',question:question,cards:out};
 records.unshift(rec);if(records.length>MAX)records=records.slice(0,MAX);return put(records);
}
function install(){
 if(typeof window.revealAllCards!=='function'||window.revealAllCards.__jj89)return false;
 var old=window.revealAllCards;
 window.revealAllCards=function(){var r=old.apply(this,arguments);snapshot();if(typeof window.renderFullHistory==='function')window.renderFullHistory();return r};
 window.revealAllCards.__jj89=1;return true;
}
install();var n=0,t=setInterval(function(){if(install()||++n>100)clearInterval(t)},100);
})();