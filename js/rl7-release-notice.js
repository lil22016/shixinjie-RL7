/* RL7 v11 — dual date/time cards + v10 home fixes */
(function(){
'use strict';

var RELEASE='20260917-v11';
var RELEASE_KEY='rl7_release_ack_20260917_v11';
var DREAM_DT_KEY='rl7_dream_datetime_v1';

function pad(n){return String(n).padStart(2,'0');}
function fmtDate(d){
  var days=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日 '+days[d.getDay()];
}
function fmtInputDate(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function fmtTime(d){return pad(d.getHours())+':'+pad(d.getMinutes());}

function readDreamAnchor(){
  try{
    var x=JSON.parse(localStorage.getItem(DREAM_DT_KEY)||'null');
    if(x && Number.isFinite(+x.baseTs) && Number.isFinite(+x.startTs)){
      return {baseTs:+x.baseTs,startTs:+x.startTs};
    }
  }catch(e){}

  /* One-time migration: preserve the CURRENT effective time from the old clock,
     and assign today's local date because the old model had no date. */
  var now=new Date(), h=now.getHours(), m=now.getMinutes();
  try{
    if(window.Storage && typeof Storage.getDreamTime==='function'){
      var old=Storage.getDreamTime();
      if(old){
        var p=String(old.base||'00:00').split(':');
        var bh=parseInt(p[0],10)||0, bm=parseInt(p[1],10)||0;
        var elapsed=Math.floor((Date.now()-(Number(old.start)||Date.now()))/60000);
        var total=((bh*60+bm+elapsed)%(24*60)+(24*60))%(24*60);
        h=Math.floor(total/60); m=total%60;
      }
    }
  }catch(e){}
  var base=new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,m,0,0);
  var a={baseTs:base.getTime(),startTs:Date.now()};
  try{localStorage.setItem(DREAM_DT_KEY,JSON.stringify(a));}catch(e){}
  return a;
}
function dreamNow(){
  var a=readDreamAnchor();
  return new Date(a.baseTs+(Date.now()-a.startTs));
}
function saveDream(d){
  var a={baseTs:d.getTime(),startTs:Date.now()};
  try{localStorage.setItem(DREAM_DT_KEY,JSON.stringify(a));}catch(e){}
  /* Keep the legacy value synchronized for any older code that reads it. */
  try{
    if(window.Storage && typeof Storage.setDreamTime==='function'){
      Storage.setDreamTime({start:Date.now(),base:fmtTime(d)});
    }
  }catch(e){}
}

function installStyle(){
  if(document.getElementById('rl7-v11-style'))return;
  var s=document.createElement('style');
  s.id='rl7-v11-style';
  s.textContent=`
    /* Keep v10's verified home-app geometry/layer fix. */
    #page-home #app-swipe-wrapper.home-widgets-wrap{
      margin-top:auto !important;padding:64px 18px 32px !important;
      box-sizing:border-box !important;position:relative !important;
      z-index:240 !important;overflow:visible !important;
    }
    #page-home .home-core-row{position:relative!important;z-index:241!important;overflow:visible!important}
    #page-home .home-feature-grid{position:relative!important;z-index:242!important;overflow:visible!important}
    #page-home .home-feature-item{position:relative!important;z-index:243!important;overflow:visible!important}
    #page-home .home-feature-icon,#page-home .home-feature-label{position:relative!important;z-index:244!important;overflow:visible!important}
    #page-home .home-feature-label{display:block!important;visibility:visible!important;opacity:1!important}

    /* The old standalone date is removed from layout, so long quotes cannot collide with it. */
    #page-home .home-greeting-row{display:none!important}

    /* Dates now belong to their respective clock cards. */
    #page-home .time-card{box-sizing:border-box!important}
    #page-home .rl7-clock-date{
      margin-top:4px;font-size:11px;line-height:1.25;text-align:center;
      color:var(--text-light);white-space:nowrap;opacity:.92;
      pointer-events:none;
    }
    #page-home #partner-time-card .time-card-hint{margin-top:2px!important}

    /* Date field added to the existing dream-time dialog. */
    #dream-time-overlay .rl7-dream-date-row{margin:0 0 12px}
    #dream-time-overlay .rl7-dream-date-row label{
      display:block;font-size:12px;color:var(--text-light);margin-bottom:6px;text-align:center
    }
    #dream-time-overlay #dream-date-picker{
      display:block;width:100%;box-sizing:border-box;padding:9px 10px;
      border:1px solid rgba(255,255,255,.18);border-radius:12px;
      background:var(--bg-input,rgba(255,255,255,.12));color:var(--text-dark);
      font:inherit;text-align:center
    }

    /* Reliable fixed release modal; never participates in home layout. */
    #rl7-release-overlay{
      position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;
      z-index:2147483000!important;display:flex!important;align-items:center!important;justify-content:center!important;
      box-sizing:border-box!important;padding:24px!important;margin:0!important;
      background:rgba(16,17,27,.46)!important;-webkit-backdrop-filter:blur(10px)!important;
      backdrop-filter:blur(10px)!important;overflow:hidden!important
    }
    #rl7-release-overlay .rl7-update-card{
      position:relative!important;inset:auto!important;transform:none!important;width:min(86vw,360px)!important;
      max-width:360px!important;max-height:70dvh!important;margin:0!important;padding:22px!important;
      box-sizing:border-box!important;overflow:auto!important;border-radius:24px!important;
      background:rgba(39,40,53,.96)!important;border:1px solid rgba(255,255,255,.16)!important;
      box-shadow:0 18px 60px rgba(0,0,0,.35)!important;color:#fff!important
    }
    #rl7-release-overlay .rl7-update-title{margin:0 0 8px!important;font-size:24px!important;line-height:1.2!important;font-weight:750!important;color:#fff!important}
    #rl7-release-overlay .rl7-update-copy{margin:0 0 18px!important;font-size:14px!important;line-height:1.5!important;color:rgba(255,255,255,.76)!important}
    #rl7-release-overlay .rl7-update-actions{display:flex!important;justify-content:flex-end!important}
    #rl7-release-overlay #rl7-release-ok{min-width:84px!important;padding:10px 18px!important;border:0!important;border-radius:14px!important;background:rgba(255,255,255,.16)!important;color:#fff!important;font:inherit!important;font-weight:700!important}
  `;
  document.head.appendChild(s);
}

function ensureClockDates(){
  var p=document.getElementById('partner-time-card');
  var m=document.getElementById('my-time-card');
  if(p && !document.getElementById('partner-date')){
    var d=document.createElement('div');d.id='partner-date';d.className='rl7-clock-date';
    var hint=p.querySelector('.time-card-hint');p.insertBefore(d,hint||null);
  }
  if(m && !document.getElementById('my-date')){
    var d2=document.createElement('div');d2.id='my-date';d2.className='rl7-clock-date';
    var hint2=m.querySelector('.time-card-hint');m.insertBefore(d2,hint2||null);
  }
}
function ensureDatePicker(){
  var pickers=document.querySelector('#dream-time-overlay .dream-time-pickers');
  if(!pickers || document.getElementById('dream-date-picker'))return;
  var row=document.createElement('div');row.className='rl7-dream-date-row';
  row.innerHTML='<label for="dream-date-picker">日期</label><input type="date" id="dream-date-picker">';
  pickers.parentNode.insertBefore(row,pickers);
}

function update(){
  ensureClockDates();
  var now=new Date(), dn=dreamNow();
  var mt=document.getElementById('my-time'), pt=document.getElementById('partner-time');
  var md=document.getElementById('my-date'), pd=document.getElementById('partner-date');
  if(mt)mt.textContent=fmtTime(now);
  if(pt)pt.textContent=fmtTime(dn);
  if(md)md.textContent=fmtDate(now);
  if(pd)pd.textContent=fmtDate(dn);
}

function openDreamEditor(e){
  if(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();}
  ensureDatePicker();
  var overlay=document.getElementById('dream-time-overlay');
  var hp=document.getElementById('dream-hour-picker');
  var mp=document.getElementById('dream-minute-picker');
  var dp=document.getElementById('dream-date-picker');
  if(!overlay||!hp||!mp||!dp)return;

  /* Existing minute picker is 5-minute stepped. Keep that behavior for compatibility. */
  var d=dreamNow();
  dp.value=fmtInputDate(d);
  hp.value=d.getHours();
  mp.value=Math.floor(d.getMinutes()/5)*5;

  var ok=document.getElementById('dream-time-ok');
  var cancel=document.getElementById('dream-time-cancel');
  if(ok)ok.onclick=function(ev){
    if(ev){ev.preventDefault();ev.stopPropagation();}
    var parts=(dp.value||fmtInputDate(d)).split('-').map(Number);
    var y=parts[0],mo=parts[1],day=parts[2];
    var h=parseInt(hp.value,10)||0, mi=parseInt(mp.value,10)||0;
    var chosen=new Date(y,mo-1,day,h,mi,0,0);
    /* Reject impossible/empty dates rather than saving Invalid Date. */
    if(!Number.isFinite(chosen.getTime())){
      if(window.Core&&Core.toast)Core.toast('请选择有效日期');
      return;
    }
    saveDream(chosen);update();overlay.classList.remove('active');
    if(window.Core&&Core.toast)Core.toast('梦角日期与时间已调整');
  };
  if(cancel)cancel.onclick=function(ev){
    if(ev){ev.preventDefault();ev.stopPropagation();}
    overlay.classList.remove('active');
  };
  overlay.classList.add('active');
}

function bind(){
  var card=document.getElementById('partner-time-card');
  if(card && !card.dataset.rl7DateBound){
    card.dataset.rl7DateBound='1';
    /* capture=true lets this replace the old time-only handler without editing homepage.js */
    card.addEventListener('click',openDreamEditor,true);
  }
}

function showRelease(){
  if(document.getElementById('rl7-release-overlay'))return;
  var ov=document.createElement('div');ov.id='rl7-release-overlay';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
  ov.innerHTML='<div class="rl7-update-card"><div class="rl7-update-title">Updated</div><div class="rl7-update-copy">Dual clocks now include their own dates. Dream time can adjust both date and time.</div><div class="rl7-update-actions"><button id="rl7-release-ok" type="button">OK</button></div></div>';
  document.body.appendChild(ov);
  var ok=document.getElementById('rl7-release-ok');
  if(ok)ok.onclick=function(){try{localStorage.setItem(RELEASE_KEY,RELEASE)}catch(e){}ov.remove();};
}

function boot(){
  installStyle();ensureClockDates();ensureDatePicker();bind();update();
  /* Update near minute boundaries and after returning from background. */
  window.__rl7DualDateTimer=setInterval(update,15000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)update();});
  window.addEventListener('pageshow',update);

  var ack='';try{ack=localStorage.getItem(RELEASE_KEY)||''}catch(e){}
  if(ack!==RELEASE)setTimeout(showRelease,900);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
