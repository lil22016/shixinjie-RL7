/* RL7 Core Fixes v7
   1) Accounting: translate the exact synchronous output path, including immediate UI append.
   2) Unread: clear child icon badge synchronously when its actual feature row is opened.
*/
(function(){
'use strict';
if(window.__RL7_CORE_FIXES_V7__) return;
window.__RL7_CORE_FIXES_V7__=1;

function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
function latestAccountRecord(){
  try{
    var a=JSON.parse(localStorage.getItem('shixin_acc_records_v1')||'[]');
    return a&&a.length?a[a.length-1]:null;
  }catch(e){return null}
}
var P={
  expLarge:[
    "{A} gone in one move. Bold, darling.",
    "You spent {A}? Very well. I’ll refrain from asking whether it was necessary.",
    "{A}. You do have a talent for making money disappear elegantly.",
    "That was {A}. Impressive. Slightly alarming, but impressive."
  ],
  expMid:[
    "{A}. Reasonable enough. I’ll allow it.",
    "{A}? Fine. I’ve seen you make far more questionable financial decisions.",
    "Recorded: {A}. Try not to make this the beginning of a pattern.",
    "Not disastrous. {A} is within the realm of acceptable mischief."
  ],
  expSmall:[
    "Only {A}. How remarkably restrained of you.",
    "{A}? Practically innocent. I’m almost disappointed.",
    "Logged: {A}. Look at you, exercising financial self-control.",
    "Only {A}. Very sensible. Suspiciously sensible, actually."
  ],
  incLarge:[
    "{A} in. Much better. I prefer watching the number go this direction.",
    "Now that is more like it. {A} added to the treasury.",
    "{A} received. Excellent.",
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
function accountEnglish(rec){
  var n=Number(rec&&rec.amount||0), pool, special=null;
  if(rec&&rec.type==='inc'){
    pool=n>=300?P.incLarge:P.incSmall;
    if(rec.cat==='salary')special=P.salary;
    else if(rec.cat==='manage')special=P.manage;
  }else{
    pool=n>=500?P.expLarge:(n>=100?P.expMid:P.expSmall);
    if(rec&&rec.cat==='food')special=P.food;
    else if(rec&&rec.cat==='shopping')special=P.shopping;
    else if(rec&&rec.cat==='medical')special=P.medical;
  }
  return pick((special&&Math.random()<.7)?special:pool)
    .replace(/\{A\}/g,'¥'+n.toFixed(2));
}
function hasChinese(s){return typeof s==='string'&&/[\u3400-\u9fff]/.test(s)}
function cloneEnglishMessage(m, text){
  if(!m)return m;
  var c=Object.assign({},m); c.text=text; return c;
}

/* account.js writes the message to Storage, then separately calls
   updateLastMsg(), _safeAppendMessage()/appendMessage(), and showBackgroundPush()
   with the ORIGINAL Chinese object/text. Previous fixes only changed Storage,
   so the screen still showed Chinese. This wrapper translates ALL four outputs
   during the same synchronous accSave call. */
function patchAccounting(){
  if(typeof window.accSave!=='function'||window.accSave.__rl7V7)return false;
  var oldSave=window.accSave;
  function wrappedSave(){
    var recBefore=latestAccountRecord();
    var oldSet=window.Storage&&Storage.setMessages;
    var oldLast=window.updateLastMsg;
    var oldSafe=window._safeAppendMessage;
    var oldAppend=window.appendMessage;
    var oldPush=window.showBackgroundPush;
    var englishText=null, englishId=null;

    function ensure(){
      if(!englishText){
        var rec=latestAccountRecord()||recBefore;
        if(rec)englishText=accountEnglish(rec);
      }
      return englishText;
    }
    if(typeof oldSet==='function'){
      Storage.setMessages=function(chatId,msgs){
        try{
          var t=ensure();
          if(t&&Array.isArray(msgs)&&msgs.length){
            var cp=msgs.slice(), i=cp.length-1, m=cp[i];
            if(m&&m.type!=='self'&&hasChinese(m.text)){
              englishId=m.id; cp[i]=cloneEnglishMessage(m,t); msgs=cp;
            }
          }
        }catch(e){}
        return oldSet.call(Storage,chatId,msgs);
      };
    }
    if(typeof oldLast==='function'){
      window.updateLastMsg=function(chatId,text){
        return oldLast.call(this,chatId,hasChinese(text)?(ensure()||text):text);
      };
    }
    if(typeof oldSafe==='function'){
      window._safeAppendMessage=function(chatId,m){
        var t=ensure();
        if(t&&m&&m.type!=='self'&&(m.id===englishId||hasChinese(m.text)))m=cloneEnglishMessage(m,t);
        return oldSafe.call(this,chatId,m);
      };
    }
    if(typeof oldAppend==='function'){
      window.appendMessage=function(chatId,m){
        var t=ensure();
        if(t&&m&&m.type!=='self'&&(m.id===englishId||hasChinese(m.text)))m=cloneEnglishMessage(m,t);
        return oldAppend.call(this,chatId,m);
      };
    }
    if(typeof oldPush==='function'){
      window.showBackgroundPush=function(text){
        return oldPush.call(this,hasChinese(text)?(ensure()||text):text);
      };
    }

    try{return oldSave.apply(this,arguments)}
    finally{
      if(oldSet)Storage.setMessages=oldSet;
      if(oldLast)window.updateLastMsg=oldLast;
      if(oldSafe)window._safeAppendMessage=oldSafe;
      if(oldAppend)window.appendMessage=oldAppend;
      if(oldPush)window.showBackgroundPush=oldPush;
    }
  }
  wrappedSave.__rl7V7=1;
  window.accSave=wrappedSave;
  return true;
}

/* Child badges: clear on the row click itself, before navigation/rendering.
   This avoids stale icon DOM surviving while the parent Discover dot correctly
   reflects the already-cleared unread state. */
var rowMap={
  '朋友圈':'moments',
  '他的收藏':'favorite',
  'ta的收藏':'favorite',
  '行踪汇报':'whereabout',
  '时空信箱':'mailbox',
  '信箱':'mailbox',
  '他的购买':'purchase',
  'ta的购买':'purchase'
};
function normalize(s){return String(s||'').replace(/\s+/g,'').toLowerCase()}
function clearRowBadge(row,type){
  if(!row)return;
  try{
    row.querySelectorAll('.rl7-unread-badge').forEach(function(b){b.remove()});
    var icon=row.querySelector('.discover-icon,.feature-icon,.home-feature-icon,.app-icon,.icon-wrap,.icon');
    if(icon)icon.querySelectorAll('.rl7-unread-badge').forEach(function(b){b.remove()});
  }catch(e){}
  try{if(window.RL7UnreadMark)window.RL7UnreadMark(type)}catch(e){}
  /* Run again after navigation and after any immediate re-render. */
  setTimeout(function(){
    try{row.querySelectorAll('.rl7-unread-badge').forEach(function(b){b.remove()})}catch(e){}
  },0);
  setTimeout(function(){
    try{row.querySelectorAll('.rl7-unread-badge').forEach(function(b){b.remove()})}catch(e){}
  },180);
}
document.addEventListener('click',function(e){
  var row=e.target&&e.target.closest&&e.target.closest('#page-discover .discover-item');
  if(!row)return;
  var title=row.querySelector('.discover-title');
  var text=normalize(title?title.textContent:row.textContent);
  Object.keys(rowMap).some(function(label){
    if(text.indexOf(normalize(label))===0){
      clearRowBadge(row,rowMap[label]);
      return true;
    }
    return false;
  });
},true);

function install(){
  patchAccounting();
}
install();
var tries=0,timer=setInterval(function(){
  install();
  if(++tries>120)clearInterval(timer);
},500);
})();
