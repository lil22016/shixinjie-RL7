/* RL7 accounting Loki English reply patch — small hotfix */
(function(){
'use strict';
if(window.__RL7_ACCOUNT_LOKI_EN__) return;
window.__RL7_ACCOUNT_LOKI_EN__=1;

function pick(a){return a[Math.floor(Math.random()*a.length)]}
function money(n){return '¥'+Number(n||0).toFixed(2)}

var P={
  expLarge:[
    "That was "+'{A}'+". Bold. I do admire your commitment to expensive decisions.",
    "{A} gone in one move. Impressive, darling. Slightly alarming, but impressive.",
    "You spent {A}? Very well. I’ll refrain from asking whether it was necessary.",
    "{A}. You do have a talent for making money disappear elegantly."
  ],
  expMid:[
    "{A}. Reasonable enough. I’ll allow it.",
    "Not disastrous. {A} is within the realm of acceptable mischief.",
    "{A}? Fine. I’ve seen you make far more questionable financial decisions.",
    "Recorded. {A}. Try not to make this the beginning of a pattern."
  ],
  expSmall:[
    "Only {A}. How remarkably restrained of you.",
    "{A}? Practically innocent. I’m almost disappointed.",
    "Logged. {A}. Look at you, exercising financial self-control.",
    "Only {A}. Very sensible. Suspiciously sensible, actually."
  ],
  incLarge:[
    "{A} in. Much better. I prefer watching the number go this direction.",
    "Now that is more like it. {A} added to the treasury.",
    "{A} received. Excellent. I knew keeping you around was profitable.",
    "A {A} increase? Lovely. Our standards of living remain secure."
  ],
  incSmall:[
    "{A} in. Small victories still count.",
    "Another {A} for the treasury. I’ll take it.",
    "{A} received. Modest, but respectable.",
    "Income is income, darling. {A} duly noted."
  ],
  food:[
    "Food again? Fair. Starvation would be terribly inconvenient.",
    "Another culinary expense. I hope it was at least worth stealing a bite from."
  ],
  shopping:[
    "Shopping. Of course. Should I even ask whether you needed it?",
    "Another purchase? Your restraint continues to inspire absolutely no one."
  ],
  medical:[
    "Health expenses are exempt from my commentary. Take care of yourself.",
    "That one is necessary. No teasing—just look after yourself."
  ],
  salary:[
    "Salary received. Excellent. The treasury approves.",
    "Payday. Finally, a transaction I can wholeheartedly endorse."
  ],
  manage:[
    "Investment income? Sensible. I’m impressed—don’t get used to hearing that.",
    "Money making more money. Now that is a strategy worthy of me."
  ]
};

function reply(rec){
  var a=money(rec.amount), pool, special=null;
  if(rec.type==='exp'){
    pool=rec.amount>=500?P.expLarge:(rec.amount>=100?P.expMid:P.expSmall);
    if(rec.cat==='food')special=P.food;
    else if(rec.cat==='shopping')special=P.shopping;
    else if(rec.cat==='medical')special=P.medical;
  }else{
    pool=rec.amount>=300?P.incLarge:P.incSmall;
    if(rec.cat==='salary')special=P.salary;
    else if(rec.cat==='manage')special=P.manage;
  }
  return pick((special&&Math.random()<.7)?special:pool).replace(/\{A\}/g,a);
}

/* account.js exposes accSave but keeps accPickComment private.
   Intercept the exact partner-message write generated immediately after a new
   shixin_acc_records_v1 record is saved, and replace its Chinese text at source boundary. */
var lastRecordId=0, armedUntil=0;
function armFromLedger(){
  try{
    var rows=JSON.parse(localStorage.getItem('shixin_acc_records_v1')||'[]');
    var r=rows&&rows[rows.length-1];
    if(r && r.id!==lastRecordId){lastRecordId=r.id; armedUntil=Date.now()+2500; return r}
  }catch(e){}
  return null;
}
var pending=null;
window.addEventListener('click',function(e){
  var t=e.target&&e.target.closest&&e.target.closest('#acc-save-btn');
  if(t)setTimeout(function(){pending=armFromLedger()},0);
},true);

function patch(){
  if(!window.Storage||typeof Storage.setMessages!=='function'||Storage.setMessages.__rl7AccountEn)return;
  var old=Storage.setMessages.bind(Storage);
  function wrapped(chatId,msgs){
    try{
      var rec=pending;
      if(!rec && Date.now()<armedUntil) rec=armFromLedger();
      if(rec && Array.isArray(msgs) && msgs.length){
        /* accPartnerComment appends one non-self message immediately after save. */
        var i=msgs.length-1, m=msgs[i];
        if(m && m.type!=='self' && typeof m.text==='string' && /[\u3400-\u9fff]/.test(m.text)){
          var copy=msgs.slice(), c=Object.assign({},m);
          c.text=reply(rec); copy[i]=c; msgs=copy; pending=null; armedUntil=0;
        }
      }
    }catch(e){}
    return old(chatId,msgs);
  }
  wrapped.__rl7AccountEn=1;
  Storage.setMessages=wrapped;
}
setInterval(patch,500);
patch();
})();