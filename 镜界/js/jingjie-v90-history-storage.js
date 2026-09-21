/* 镜界 V90 — reliable lightweight divination history persistence.
   Uses the SAME localStorage key read by the existing history UI.
   Large card image/SVG payloads are intentionally not duplicated into history. */
(function(){'use strict';
var KEY='mirror_divine_records', MAX=200;

function readRecords(){
  try { var a=JSON.parse(localStorage.getItem(KEY)||'[]'); return Array.isArray(a)?a:[]; }
  catch(e){ return []; }
}
function compactRecord(r){
  if(!r||typeof r!=='object') return r;
  var x={};
  Object.keys(r).forEach(function(k){ if(k!=='cards') x[k]=r[k]; });
  x.cards=(r.cards||[]).map(function(c){
    return {
      name:c.name||'',
      isReversed:!!c.isReversed,
      position:c.position||'',
      cardIndex:c.cardIndex,
      gradient:c.gradient||'',
      svgContent:null,
      imageData:null,
      isIChing:!!c.isIChing,
      _customDeckId:c._customDeckId||undefined
    };
  });
  return x;
}
function write(records){
  try { localStorage.setItem(KEY,JSON.stringify(records)); return true; }
  catch(e){
    /* Existing old records may contain base64/SVG and exhaust the quota.
       Compact them once, then retry instead of silently losing the new reading. */
    try {
      records=records.map(compactRecord);
      localStorage.setItem(KEY,JSON.stringify(records));
      return true;
    } catch(e2) {
      console.error('[镜界 V90] 占卜记录仍无法写入',e2);
      return false;
    }
  }
}
function save(deck,spread,drawnCards,showReversal,source,question){
  try{
    if(!deck||!drawnCards||!drawnCards.length) return false;
    spread=spread||{id:'free',name:'自由抽取',positions:null};
    var cards=drawnCards.map(function(c,i){
      c=c||{};
      return {
        name:c.name||'',
        isReversed:showReversal!==false && !deck.isIChing ? !!c.isReversed : false,
        position:(spread.positions&&i<spread.positions.length)?spread.positions[i]:('位'+(i+1)),
        cardIndex:c.cardIndex!==undefined?c.cardIndex:i,
        gradient:'',
        svgContent:null,
        imageData:null,
        isIChing:!!deck.isIChing,
        _customDeckId:(deck.id&&String(deck.id).indexOf('custom_')===0)?deck.id:undefined
      };
    });
    var now=new Date(), rec={
      id:Date.now(),
      dateTime:now.toISOString(),
      dateStr:now.getFullYear()+'/'+(now.getMonth()+1)+'/'+now.getDate(),
      deckId:deck.id||'',
      deckName:deck.name||'牌组',
      spreadId:spread.id||'free',
      spreadName:spread.name||'自由抽取',
      source:source||'free',
      question:typeof question==='string'?question.trim():'',
      cards:cards
    };
    var records=readRecords();
    records.unshift(rec);
    if(records.length>MAX) records=records.slice(0,MAX);
    var ok=write(records);
    if(ok){
      if(typeof window.renderRecentRecords==='function') window.renderRecentRecords();
      if(typeof window.renderFullHistory==='function') window.renderFullHistory();
    }
    return ok;
  }catch(e){console.error('[镜界 V90] save error',e);return false}
}
function install(){
  if(typeof window._saveDivineRecord!=='function') return false;
  window._saveDivineRecord=save;
  window._saveDivineRecord.__jjv90=true;
  return true;
}
install();
var n=0,t=setInterval(function(){if(install()||++n>120)clearInterval(t)},100);
})();