/* RL7 Daily Quote Fix v28
   True daily random: stable within the day, rerolls on a new local calendar day,
   and avoids repeating yesterday when 2+ quotes exist. */
(function(){
'use strict';
function install(){
  if(!window.JournalCard||!window.Storage){setTimeout(install,250);return}
  const KEY='rl7_daily_quote_random_v28';
  function dayKey(){
    const d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  JournalCard._getDailyRandomIndex=function(quotes){
    if(!quotes||!quotes.length)return -1;
    const today=dayKey();
    let saved=null;
    try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
    if(saved&&saved.date===today&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<quotes.length)return saved.index;
    const previous=saved&&Number.isInteger(saved.index)?saved.index:-1;
    let idx=Math.floor(Math.random()*quotes.length);
    if(quotes.length>1&&idx===previous){
      idx=(idx+1+Math.floor(Math.random()*(quotes.length-1)))%quotes.length;
    }
    try{localStorage.setItem(KEY,JSON.stringify({date:today,index:idx}))}catch(e){}
    return idx;
  };
  /* Cross-midnight refresh while the PWA remains open. */
  let last=dayKey();
  setInterval(function(){
    const now=dayKey();
    if(now!==last){last=now;try{JournalCard.render()}catch(e){}}
  },60000);
  try{JournalCard.render()}catch(e){}
}
install();
})();