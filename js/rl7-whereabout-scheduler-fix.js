/* RL7 Whereabout Scheduler Repair — 2026-09-16
 * Keeps manual Check In independent.
 * Restores the original passive timed-report behavior:
 * Settings -> whereaboutSettings -> interval -> Storage.whereaboutReports.
 */
(function(){
'use strict';
if (window.__RL7_WHEREABOUT_SCHEDULER_REPAIR_1__) return;
window.__RL7_WHEREABOUT_SCHEDULER_REPAIR_1__ = true;

var LAST_KEY = 'whereaboutAutoReportTime';
var TIMER = null;

function getSettings(){
  var def = { enabled:true, intervalMin:30, startHour:8, endHour:22 };
  try {
    var s = Storage.get('whereaboutSettings', null) || {};
    return {
      enabled: typeof s.enabled === 'boolean' ? s.enabled : def.enabled,
      intervalMin: Math.max(1, parseInt(s.intervalMin,10) || def.intervalMin),
      startHour: isNaN(parseInt(s.startHour,10)) ? def.startHour : parseInt(s.startHour,10),
      endHour: isNaN(parseInt(s.endHour,10)) ? def.endHour : parseInt(s.endHour,10)
    };
  } catch(e) { return def; }
}

function inWindow(s, d){
  var h=d.getHours(), a=s.startHour, b=s.endHour;
  if (a === b) return true; // treat equal endpoints as all-day
  if (a < b) return h >= a && h < b;
  return h >= a || h < b;  // overnight window
}

function pick(a){ return a && a.length ? a[Math.floor(Math.random()*a.length)] : null; }

function pools(){
  var loc=[], act=[];
  try {
    loc = JSON.parse(localStorage.getItem('rl7_whereabout_locations_v2') || '[]');
    act = JSON.parse(localStorage.getItem('rl7_whereabout_actions_v2') || '[]');
  } catch(e){}
  loc = Array.isArray(loc) ? loc.map(String).map(function(x){return x.trim()}).filter(Boolean) : [];
  act = Array.isArray(act) ? act.map(String).map(function(x){return x.trim()}).filter(Boolean) : [];
  if ((!loc.length || !act.length) && window.Storage && Storage.getWhereabouts) {
    try {
      var legacy=Storage.getWhereabouts() || [];
      if (!loc.length) loc=legacy.map(function(x){return x&&x.place}).filter(Boolean);
      if (!act.length) act=legacy.map(function(x){return x&&x.action}).filter(Boolean);
    } catch(e){}
  }
  return {loc:loc, act:act};
}

function role(){
  try {
    var ps=Storage.getPartnerProfiles ? Storage.getPartnerProfiles() : [];
    if (ps && ps.length) {
      var p=pick(ps);
      return {
        id:p.id,
        name:p.nickname || p.name || 'Loki',
        color:p.avatarColor || '#C8B8E0'
      };
    }
  } catch(e){}
  return {id:'default',name:'Loki',color:'#C8B8E0'};
}

function writeReport(){
  if (!window.Storage || !Storage.addWhereaboutReport) return false;
  var pp=pools();
  if (!pp.loc.length && !pp.act.length) return false;

  var r=role(), place=pick(pp.loc)||'somewhere', action=pick(pp.act)||'';
  var text;
  if (action) {
    text=pick([
      r.name+'在'+place+'，'+action,
      r.name+'在'+place+'进行了'+action,
      r.name+'到达了'+place+'，正在'+action
    ]);
  } else {
    text=r.name+'到达了'+place;
  }

  Storage.addWhereaboutReport({
    roleId:r.id,
    roleName:r.name,
    color:r.color,
    text:text
  });

  /* If the report page is currently open, refresh it immediately.
     _skipAutoReport prevents the page-entry random reporter from adding a duplicate. */
  var oldSkip=window._skipAutoReport;
  window._skipAutoReport=true;
  try {
    var page=document.getElementById('page-whereabout-reports');
    if (page && page.classList.contains('active') && typeof window.renderWhereaboutReports==='function') {
      window.renderWhereaboutReports();
    }
  } finally {
    window._skipAutoReport=oldSkip;
  }
  return true;
}

function due(){
  try {
    var s=getSettings();
    if (!s.enabled) return;
    var now=new Date();
    if (!inWindow(s,now)) return;

    var last=Number(Storage.get(LAST_KEY,0)) || 0;
    var nowMs=now.getTime();

    /* Recover from a corrupt/future timestamp rather than blocking forever. */
    if (last > nowMs + 5*60*1000) {
      last=0;
      Storage.set(LAST_KEY,0);
    }

    if (last && nowMs-last < s.intervalMin*60*1000) return;

    /* Important: only advance lastAuto after the report is successfully stored. */
    if (writeReport()) {
      Storage.set(LAST_KEY, nowMs);
    }
  } catch(e) {
    try {
      var logs=Storage.get('rl7_diag_log_v1',[]);
      if(!Array.isArray(logs)) logs=[];
      logs.unshift({t:Date.now(),type:'whereabout-scheduler-repair-error',data:String(e)});
      Storage.set('rl7_diag_log_v1',logs.slice(0,80));
    } catch(_){}
  }
}

function start(){
  if (TIMER) return;
  due();
  TIMER=setInterval(due,30*1000);
}

function stop(){
  if(TIMER){ clearInterval(TIMER); TIMER=null; }
}

window.RL7WhereaboutSchedulerRepair={start:start,stop:stop,runNow:due};

/* Start after the original app/whereabouts modules have initialized. */
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){setTimeout(start,1200)},{once:true});
}else{
  setTimeout(start,1200);
}
})();