(function(){
'use strict';
if(window.__RL7_COMPANION_HOME_V1__) return;
window.__RL7_COMPANION_HOME_V1__=1;

var SETTINGS_KEY='rl7_loki_companion_settings_v1';
var ART_DB='rl7_companion_art_db_v1', ART_STORE='art', ART_KEY='loki';
var state=null, timer=null, wakeLock=null, bubbleTimer=null, artUrl='';

var support=[
'One task at a time. I am staying right here.',
'Finish this small part first. The rest can wait.',
'Your attention wandered. Bring it back gently.',
'You do not have to conquer the entire universe tonight.',
'Keep going. I am watching, and yes, I am impressed.',
'Complete the paragraph. Then you may rest for a moment.'
];
var soft=[
'I am here. You can return to the task when you are ready.',
'A little longer, darling. Then we can breathe.',
'Come back to the page. I will keep you company.',
'I know you are tired. Try one more small thing.'
];
var tease=[
'Poking me is not, regrettably, a recognized study method.',
'Were you working, or merely arranging the appearance of work?',
'Back to it. I refuse to be blamed for your deadline.',
'Five more minutes of focus. Surely even you can manage that.'
];
var stay=[
'There you are.','Missed me already?','Yes, darling?',
'You have my attention. Temporarily.','How terribly needy. I approve.',
'I am still here.','Come closer, then.'
];

var widgetLines=[
'Study with Loki',
'Need company?',
'Stay with Loki',
'Focus. I’ll stay.',
'Come here. We can work.',
'You study. I’ll keep watch.'
];

function pick(a){return a[Math.floor(Math.random()*a.length)]}
function defaults(){return {mode:'study',focusMinutes:25,breakMinutes:5,phase:'focus',running:false,endAt:0,remaining:1500,task:'',completed:0,keepAwake:false,artScale:100,artX:0,artY:0,flip:false}}
function load(){try{state=Object.assign(defaults(),JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null')||{})}catch(e){state=defaults()} if(state.running&&state.endAt<=Date.now()) complete(true)}
function save(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(state))}catch(e){}}

function addUI(){
 if(document.getElementById('rl7-loki-companion')) return;
 var d=document.createElement('div');
 d.id='rl7-loki-companion';
 d.innerHTML=`<div class="rl7-lc-shell">
   <div class="rl7-lc-head">
     <button class="rl7-lc-round" id="rl7-lc-close">‹</button>
     <div class="rl7-lc-title">LOKI COMPANION</div>
     <button class="rl7-lc-round" id="rl7-lc-settings">⋯</button>
   </div>
   <div class="rl7-lc-tabs">
     <button class="rl7-lc-tab" data-mode="study">Study with Loki</button>
     <button class="rl7-lc-tab" data-mode="stay">Stay with Loki</button>
   </div>
   <div class="rl7-lc-stage" id="rl7-lc-stage">
      <div class="rl7-lc-glow"></div>
      <div class="rl7-lc-bubble" id="rl7-lc-bubble"></div>
      <div class="rl7-lc-art-wrap" id="rl7-lc-art-wrap"><img class="rl7-lc-art" id="rl7-lc-art" alt="Loki"><div class="rl7-lc-placeholder" id="rl7-lc-placeholder"><i class="fas fa-crown"></i><div>Stay with Loki</div><small>Upload transparent artwork in settings</small></div></div>
   </div>
   <div class="rl7-lc-study" id="rl7-lc-study">
      <input id="rl7-lc-task" placeholder="What are we working on?">
      <div class="rl7-lc-clock" id="rl7-lc-clock">25:00</div>
      <div class="rl7-lc-phase" id="rl7-lc-phase">FOCUS</div>
      <div class="rl7-lc-controls">
        <button class="rl7-lc-btn" id="rl7-lc-reset">Reset</button>
        <button class="rl7-lc-btn primary" id="rl7-lc-start">Start</button>
        <button class="rl7-lc-btn" id="rl7-lc-switch">Break</button>
      </div>
      <div class="rl7-lc-count" id="rl7-lc-count"></div>
   </div>
   <div class="rl7-lc-settings-panel" id="rl7-lc-settings-panel">
     <div class="rl7-lc-card rl7-lc-art-settings">
       <input type="file" accept="image/png,image/webp,image/*" id="rl7-lc-file" hidden>
       <button class="rl7-lc-upload" id="rl7-lc-upload">Upload transparent Loki artwork</button>
       <button class="rl7-lc-btn" id="rl7-lc-remove">Remove artwork</button>
       <label class="rl7-lc-slider-row"><span>Size</span><input type="range" id="rl7-lc-scale" min="50" max="145"><b id="rl7-lc-scale-v"></b></label>
       <label class="rl7-lc-slider-row"><span>Left / right</span><input type="range" id="rl7-lc-x" min="-140" max="140"><b id="rl7-lc-x-v"></b></label>
       <label class="rl7-lc-slider-row"><span>Up / down</span><input type="range" id="rl7-lc-y" min="-160" max="180"><b id="rl7-lc-y-v"></b></label>
       <label class="rl7-lc-toggle">Mirror artwork <input type="checkbox" id="rl7-lc-flip"></label>
     </div>
     <div class="rl7-lc-card">
       <label>Focus minutes <input type="number" id="rl7-lc-focus" min="1" max="180"></label>
       <label>Break minutes <input type="number" id="rl7-lc-break" min="1" max="60"></label>
       <label class="rl7-lc-toggle">Keep screen awake <input type="checkbox" id="rl7-lc-awake"></label>
     </div>
     <button class="rl7-lc-btn primary" id="rl7-lc-done">Done</button>
   </div>
 </div>`;
 document.body.appendChild(d);

 document.getElementById('rl7-lc-close').onclick=hide;
 document.getElementById('rl7-lc-settings').onclick=openSettings;
 document.getElementById('rl7-lc-done').onclick=closeSettings;
 document.getElementById('rl7-lc-start').onclick=toggleTimer;
 document.getElementById('rl7-lc-reset').onclick=resetTimer;
 document.getElementById('rl7-lc-switch').onclick=switchPhase;
 document.getElementById('rl7-lc-stage').onclick=interact;
 document.getElementById('rl7-lc-upload').onclick=function(){document.getElementById('rl7-lc-file').click()};
 document.getElementById('rl7-lc-file').onchange=uploadArt;
 document.getElementById('rl7-lc-remove').onclick=removeArt;
 ['scale','x','y'].forEach(function(k){document.getElementById('rl7-lc-'+k).oninput=function(){var prop=k==='scale'?'artScale':'art'+k.toUpperCase();state[prop]=Number(this.value);applyArt();save()}});
 document.getElementById('rl7-lc-flip').onchange=function(){state.flip=this.checked;applyArt();save()};
 document.getElementById('rl7-lc-task').onchange=function(){state.task=this.value;save()};
 document.querySelectorAll('.rl7-lc-tab').forEach(function(b){b.onclick=function(){setMode(b.dataset.mode)}});
 document.getElementById('rl7-lc-focus').onchange=updateDurations;
 document.getElementById('rl7-lc-break').onchange=updateDurations;
 document.getElementById('rl7-lc-awake').onchange=function(){state.keepAwake=this.checked;save();state.keepAwake?requestWake():releaseWake()};
}


function artDB(){return new Promise(function(resolve,reject){try{var q=indexedDB.open(ART_DB,1);q.onupgradeneeded=function(){if(!q.result.objectStoreNames.contains(ART_STORE))q.result.createObjectStore(ART_STORE)};q.onsuccess=function(){resolve(q.result)};q.onerror=function(){reject(q.error)}}catch(e){reject(e)}})}
async function artGet(){var db=await artDB();return new Promise(function(resolve,reject){var q=db.transaction(ART_STORE,'readonly').objectStore(ART_STORE).get(ART_KEY);q.onsuccess=function(){resolve(q.result||null)};q.onerror=function(){reject(q.error)}})}
async function artSet(v){var db=await artDB();return new Promise(function(resolve,reject){var q=db.transaction(ART_STORE,'readwrite').objectStore(ART_STORE).put(v,ART_KEY);q.onsuccess=function(){resolve()};q.onerror=function(){reject(q.error)}})}
async function artRemove(){var db=await artDB();return new Promise(function(resolve,reject){var q=db.transaction(ART_STORE,'readwrite').objectStore(ART_STORE).delete(ART_KEY);q.onsuccess=function(){resolve()};q.onerror=function(){reject(q.error)}})}
async function loadArt(){var blob=null;try{blob=await artGet()}catch(e){} if(artUrl){try{URL.revokeObjectURL(artUrl)}catch(e){}} artUrl=blob instanceof Blob?URL.createObjectURL(blob):'';var img=document.getElementById('rl7-lc-art'),ph=document.getElementById('rl7-lc-placeholder');if(!img||!ph)return;if(artUrl){img.src=artUrl;img.style.display='block';ph.style.display='none'}else{img.removeAttribute('src');img.style.display='none';ph.style.display='block'}applyArt()}
async function uploadArt(e){var f=e.target.files&&e.target.files[0];if(!f)return;try{await artSet(f);await loadArt();bubble('There. A far more suitable form.')}catch(x){alert('The image could not be saved. Try a smaller PNG or WebP.')}e.target.value=''}
async function removeArt(){try{await artRemove()}catch(e){}await loadArt()}
function applyArt(){if(!state)return;var w=document.getElementById('rl7-lc-art-wrap'),i=document.getElementById('rl7-lc-art');if(w){w.style.setProperty('--x',state.artX+'px');w.style.setProperty('--y',state.artY+'px')}if(i){i.style.setProperty('--scale',state.artScale/100);i.style.setProperty('--flip',state.flip?-1:1)}var a=document.getElementById('rl7-lc-scale-v'),b=document.getElementById('rl7-lc-x-v'),c=document.getElementById('rl7-lc-y-v');if(a)a.textContent=state.artScale+'%';if(b)b.textContent=state.artX;if(c)c.textContent=state.artY}

function render(){
 if(!state) return;
 var rem=state.running?Math.max(0,Math.ceil((state.endAt-Date.now())/1000)):state.remaining;
 state.remaining=rem;
 var m=Math.floor(rem/60),s=rem%60;
 var clock=document.getElementById('rl7-lc-clock'); if(clock)clock.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
 var phase=document.getElementById('rl7-lc-phase'); if(phase)phase.textContent=state.phase==='focus'?'FOCUS':'BREAK';
 var start=document.getElementById('rl7-lc-start'); if(start)start.textContent=state.running?'Pause':'Start';
 var sw=document.getElementById('rl7-lc-switch'); if(sw)sw.textContent=state.phase==='focus'?'Break':'Focus';
 var task=document.getElementById('rl7-lc-task'); if(task&&document.activeElement!==task)task.value=state.task||'';
 var cnt=document.getElementById('rl7-lc-count'); if(cnt)cnt.textContent=state.completed?state.completed+' focus session'+(state.completed===1?'':'s')+' completed':'';
 document.querySelectorAll('.rl7-lc-tab').forEach(function(b){b.classList.toggle('active',b.dataset.mode===state.mode)});
 var study=document.getElementById('rl7-lc-study'); if(study)study.style.display=state.mode==='study'?'block':'none';
}
function tick(){render(); if(state&&state.running&&Date.now()>=state.endAt) complete(true)}
async function show(){load();addUI();await loadArt();document.getElementById('rl7-loki-companion').classList.add('on');applyArt();render();if(!timer)timer=setInterval(tick,500);if(state.keepAwake)requestWake();bubble(state.mode==='study'?pick(support):pick(stay))}
function hide(){var el=document.getElementById('rl7-loki-companion');if(el)el.classList.remove('on');releaseWake()}
function setMode(mode){state.mode=mode;save();render();bubble(mode==='study'?pick(support):pick(stay))}
function toggleTimer(){if(state.running){state.remaining=Math.max(0,Math.ceil((state.endAt-Date.now())/1000));state.running=false}else{state.running=true;state.endAt=Date.now()+state.remaining*1000;bubble(state.phase==='focus'?pick(support):pick(soft))}save();render()}
function resetTimer(){state.running=false;state.remaining=(state.phase==='focus'?state.focusMinutes:state.breakMinutes)*60;save();render();bubble('Reset. Try again, darling.')}
function switchPhase(){state.running=false;state.phase=state.phase==='focus'?'break':'focus';state.remaining=(state.phase==='focus'?state.focusMinutes:state.breakMinutes)*60;save();render();bubble(state.phase==='focus'?pick(support):pick(soft))}
function complete(auto){state.running=false;if(state.phase==='focus'){state.completed++;bubble(pick(['Done. Good. You may breathe now.','There. See? You survived it.','Well done. Take the break.']));state.phase='break';state.remaining=state.breakMinutes*60}else{state.phase='focus';state.remaining=state.focusMinutes*60;bubble(pick(support))}save();render();try{navigator.vibrate&&navigator.vibrate([120,80,120])}catch(e){}}
function updateDurations(){var f=+document.getElementById('rl7-lc-focus').value||25,b=+document.getElementById('rl7-lc-break').value||5;state.focusMinutes=f;state.breakMinutes=b;if(!state.running)state.remaining=(state.phase==='focus'?f:b)*60;save();render()}
function interact(){bubble(state.mode==='study'?(Math.random()<.5?pick(tease):pick(support)):pick(stay))}
function bubble(text){var el=document.getElementById('rl7-lc-bubble');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(bubbleTimer);bubbleTimer=setTimeout(function(){el.classList.remove('show')},3500)}
function openSettings(){document.getElementById('rl7-lc-settings-panel').classList.add('on');document.getElementById('rl7-lc-focus').value=state.focusMinutes;document.getElementById('rl7-lc-break').value=state.breakMinutes;document.getElementById('rl7-lc-awake').checked=!!state.keepAwake;document.getElementById('rl7-lc-scale').value=state.artScale;document.getElementById('rl7-lc-x').value=state.artX;document.getElementById('rl7-lc-y').value=state.artY;document.getElementById('rl7-lc-flip').checked=!!state.flip;applyArt()}
function closeSettings(){document.getElementById('rl7-lc-settings-panel').classList.remove('on');render()}
async function requestWake(){try{if('wakeLock'in navigator){wakeLock=await navigator.wakeLock.request('screen')}}catch(e){}}
function releaseWake(){try{wakeLock&&wakeLock.release()}catch(e){}wakeLock=null}

function addHomeWidget(){
 var page=document.getElementById('page-home'); if(!page||document.getElementById('rl7-home-companion-widget')) return;
 var anchor=document.getElementById('app-swipe-wrapper'); if(!anchor) return;
 var w=document.createElement('div');w.id='rl7-home-companion-widget';w.className='rl7-home-companion-widget';
 w.innerHTML='<div class="rl7-hcw-icon"><i class="fas fa-hourglass-half"></i></div><div class="rl7-hcw-main"><b id="rl7-hcw-title"></b><span id="rl7-hcw-sub"></span></div><i class="fas fa-chevron-right rl7-hcw-arrow"></i>';
 w.onclick=show;
 anchor.parentNode.insertBefore(w,anchor);
 rotateWidgetText();
 setInterval(rotateWidgetText,12000);
}
function rotateWidgetText(){var t=document.getElementById('rl7-hcw-title'),s=document.getElementById('rl7-hcw-sub');if(!t||!s)return;var line=pick(widgetLines);t.textContent=line;s.textContent=line==='Study with Loki'?'Focus timer + quiet company':'Tap when you want him around.'}

function unreadCount(){try{return (Storage.getChats()||[]).reduce(function(n,c){return n+(Number(c.unread)||0)},0)}catch(e){return 0}}
function updateUnreadBadge(){
 var item=document.querySelector('#home-widgets-grid .home-feature-item:first-child'); if(!item)return;
 var badge=item.querySelector('.rl7-home-unread'); if(!badge){badge=document.createElement('span');badge.className='rl7-home-unread';item.appendChild(badge)}
 var n=unreadCount(); badge.textContent=n>99?'99+':String(n); badge.style.display=n>0?'flex':'none';
}
function patchUnread(){
 updateUnreadBadge();
 setInterval(updateUnreadBadge,1500);
 try{
  if(window.Storage&&!Storage.__rl7UnreadWrapped&&typeof Storage.setChats==='function'){
   Storage.__rl7UnreadWrapped=1;var old=Storage.setChats.bind(Storage);Storage.setChats=function(v){var r=old(v);setTimeout(updateUnreadBadge,0);return r}
  }
 }catch(e){}
}

function fixThemeAndTop(){
 document.documentElement.classList.add('rl7-theme-follow');
 try{
  document.documentElement.style.removeProperty('background-color');
  document.body.style.removeProperty('background-color');
  var app=document.getElementById('app'); if(app)app.style.removeProperty('background-color');
 }catch(e){}
}

window.RL7LokiCompanion={show:show,hide:hide};

function boot(){load();addUI();addHomeWidget();patchUnread();fixThemeAndTop()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,300)});else setTimeout(boot,300);
})();