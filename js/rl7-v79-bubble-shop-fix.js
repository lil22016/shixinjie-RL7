/* RL7 V79 — Bubble Shop: one-click global assignment.
   Replaces the old target picker without changing stored bubble data format. */
(function(){
  function toast(msg){try{if(window.Core&&typeof Core.toast==='function')return Core.toast(msg);}catch(e){}}
  function assignGlobally(id){
    if(!id) return;
    var cfg=null;
    try{
      var list=window.BubbleMaker&&BubbleMaker.getBubbles?BubbleMaker.getBubbles():[];
      for(var i=0;i<list.length;i++) if(list[i].id===id){cfg=list[i];break;}
      if(!cfg) return;
      var map={self:id,other:id};
      try{
        var partners=Storage.getPartnerProfiles?Storage.getPartnerProfiles():[];
        for(var p=0;p<partners.length;p++) if(partners[p]&&partners[p].id) map[partners[p].id]=id;
      }catch(e){}
      Storage.set('bubbleAssignments',map);
      try{BubbleMaker.rebuildAllStyles();}catch(e){}
      try{BubbleMaker.renderBubbleShop();}catch(e){}
      toast('已全局使用「'+(cfg.name||'气泡')+'」');
    }catch(e){console.error('[V79 bubble assign]',e);toast('指派失败，请重试');}
  }
  window.BubbleMakerAssign=assignGlobally;
  document.addEventListener('DOMContentLoaded',function(){
    var old=document.getElementById('bs-assign-overlay');
    if(old) old.style.display='none';
  });
})();