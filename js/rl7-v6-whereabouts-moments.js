/* RL7 v6 — whereabouts UX + moments comment fixes */
(function(){
'use strict';
if(window.__RL7_V6_WA_MOMENTS__)return;
window.__RL7_V6_WA_MOMENTS__=1;

function visible(el){
  if(!el)return false;
  var cs=getComputedStyle(el);
  return el.classList.contains('active') || (cs.display!=='none' && cs.visibility!=='hidden');
}

/* ---------- Whereabout reports: newest first + clear all ---------- */
function installWhereaboutV6(){
  if(typeof window.renderWhereaboutReports!=='function' || !window.Storage)return false;
  if(window.renderWhereaboutReports.__rl7v6)return true;

  var oldRender=window.renderWhereaboutReports;
  function renderV6(){
    var container=document.getElementById('whereabout-reports-list');
    if(!container)return oldRender();

    var reports=[];
    try{reports=(Storage.getWhereaboutReports()||[]).slice()}catch(e){}
    /* Never mutate storage order just to render. */
    reports.sort(function(a,b){return Number(b.time||0)-Number(a.time||0)});

    if(!reports.length){
      container.innerHTML='<div style="text-align:center;padding:48px 24px;color:var(--text-lighter);font-size:.85rem">'
        +'<div style="font-size:2rem;margin-bottom:8px"><i class="fas fa-location-dot"></i></div>'
        +'还没有行踪汇报，点击右上角魔法棒让 TA 汇报行踪</div>';
    }else{
      var html='<div class="rl7-wa-tools"><span>最新汇报</span>'
        +'<button type="button" class="rl7-wa-clear-all" onclick="RL7ClearAllWhereaboutReports()">'
        +'<i class="fas fa-trash-alt"></i> 清空历史</button></div>';
      reports.forEach(function(r){
        var color=(window.Core&&Core.escapeHtml)?Core.escapeHtml(r.color||'#C8B8E0'):(r.color||'#C8B8E0');
        var role=(window.Core&&Core.escapeHtml)?Core.escapeHtml(r.roleName||'TA'):(r.roleName||'TA');
        var text=(window.Core&&Core.escapeHtml)?Core.escapeHtml(r.text||((r.place||'')+(r.action?' · '+r.action:''))):(r.text||'');
        html+='<div class="whereabout-report">'
          +'<div class="whereabout-report-head">'
          +'<span class="whereabout-report-author" style="color:'+color+'">'+role+'</span>'
          +'<span class="whereabout-report-ops">'
          +'<span class="whereabout-report-time">'+(r.time&&window.Core&&Core.formatTime?Core.formatTime(r.time):'')+'</span>'
          +'<button class="whereabout-delete-btn whereabout-report-del" onclick="deleteWhereaboutReport('+r.id+')" title="删除汇报"><i class="fas fa-trash-alt"></i></button>'
          +'</span></div><div class="whereabout-report-text">'+text+'</div></div>';
      });
      html+='<div class="rl7-wa-order-note">—— 最新的汇报在最上面 ——</div>';
      container.innerHTML=html;
    }
    /* Deliberately do NOT call the old render's _maybeAutoReportByRole here.
       The dedicated scheduler/manual wand own report creation; viewing must be read-only. */
  }
  renderV6.__rl7v6=1;
  window.renderWhereaboutReports=renderV6;

  window.RL7ClearAllWhereaboutReports=function(){
    var go=function(){
      try{
        if(Storage.setWhereaboutReports)Storage.setWhereaboutReports([]);
        else Storage.set('whereaboutReports',[]);
      }catch(e){}
      try{localStorage.setItem('whereaboutAutoReportTime','0')}catch(e){}
      window._skipAutoReport=true;
      renderV6();
      setTimeout(function(){window._skipAutoReport=false},0);
      try{if(window.Core&&Core.toast)Core.toast('行踪汇报历史已清空')}catch(e){}
      try{window.dispatchEvent(new Event('rl7-content-changed'))}catch(e){}
    };
    if(window.Core&&typeof Core.confirm==='function'){
      Core.confirm('清空行踪汇报','确定清空所有历史汇报？此操作不可撤销。',go);
    }else if(confirm('确定清空所有行踪汇报历史？'))go();
  };

  /* Manual wand while already viewing the report page is read immediately:
     it must not create an unread badge for content literally on screen. */
  if(typeof window.reportWhereaboutByRole==='function' && !window.reportWhereaboutByRole.__rl7v6){
    var oldReport=window.reportWhereaboutByRole;
    var wrapped=function(silent){
      var r=oldReport.apply(this,arguments);
      setTimeout(function(){
        renderV6();
        try{
          var page=document.getElementById('page-whereabout-reports');
          if(visible(page) && window.RL7UnreadMark) window.RL7UnreadMark('whereabout');
        }catch(e){}
      },0);
      return r;
    };
    wrapped.__rl7v6=1;
    window.reportWhereaboutByRole=wrapped;
  }
  return true;
}

/* ---------- Moments comment input ---------- */
function bindMomentCommentInput(){
  var inp=document.getElementById('moments-comment-input');
  if(!inp||inp.__rl7v6)return;
  inp.__rl7v6=1;
  inp.setAttribute('enterkeyhint','send');
  inp.addEventListener('keydown',function(e){
    if(e.key==='Enter' && !e.shiftKey && !e.isComposing){
      e.preventDefault();
      if(window.MomentsApp&&typeof MomentsApp.submitMomentComment==='function')MomentsApp.submitMomentComment();
      else if(typeof window.submitMomentComment==='function')window.submitMomentComment();
    }
  });
}
var mo=new MutationObserver(function(){bindMomentCommentInput();installWhereaboutV6()});
mo.observe(document.documentElement,{childList:true,subtree:true});
setInterval(function(){installWhereaboutV6();bindMomentCommentInput()},1200);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){installWhereaboutV6();bindMomentCommentInput()});
else {installWhereaboutV6();bindMomentCommentInput()}
})();