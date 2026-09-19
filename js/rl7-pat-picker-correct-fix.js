/* Correct chat + menu Pat picker fix.
   Detects the actual chooser by its visible content ("· 拍一拍" + "格式：")
   instead of assuming it is #pat-overlay/openPatPanel.
*/
(function () {
  'use strict';
  if (window.__RL7_PAT_PICKER_CORRECT_FIX__) return;
  window.__RL7_PAT_PICKER_CORRECT_FIX__ = true;

  var STYLE_ID = 'rl7-pat-picker-correct-style';

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .rl7-pat-picker-correct {
        background: rgba(22,24,29,.90) !important;
        background-color: rgba(22,24,29,.90) !important;
        color: #fff !important;
        border: 1px solid rgba(255,255,255,.16) !important;
        -webkit-backdrop-filter: blur(24px) saturate(125%) !important;
        backdrop-filter: blur(24px) saturate(125%) !important;
        box-shadow: 0 18px 52px rgba(0,0,0,.32) !important;
      }
      .rl7-pat-picker-correct .rl7-pat-picker-title {
        color: #fff !important;
        -webkit-text-fill-color: #fff !important;
      }
      .rl7-pat-picker-correct .rl7-pat-picker-subtitle {
        color: rgba(255,255,255,.66) !important;
        -webkit-text-fill-color: rgba(255,255,255,.66) !important;
      }
      .rl7-pat-picker-correct button,
      .rl7-pat-picker-correct [role="button"],
      .rl7-pat-picker-correct .rl7-pat-picker-choice {
        background: rgba(255,255,255,.10) !important;
        background-color: rgba(255,255,255,.10) !important;
        color: #fff !important;
        -webkit-text-fill-color: #fff !important;
        border-color: rgba(255,255,255,.14) !important;
        box-shadow: none !important;
      }
      .rl7-pat-picker-correct button:active,
      .rl7-pat-picker-correct [role="button"]:active,
      .rl7-pat-picker-correct .rl7-pat-picker-choice:active {
        background: rgba(255,255,255,.17) !important;
      }
    `;
    document.head.appendChild(s);
  }

  function visible(el) {
    if (!el || el.nodeType !== 1) return false;
    var cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function score(el) {
    var t = (el.innerText || el.textContent || '').trim();
    return (t.indexOf('· 拍一拍') >= 0 ? 4 : 0) +
           (t.indexOf('格式：') >= 0 ? 3 : 0) +
           (t.indexOf('词条') >= 0 ? 2 : 0) +
           (t.indexOf('取消') >= 0 ? 1 : 0);
  }

  function findPanel() {
    var all = Array.from(document.body.querySelectorAll('div,section,aside'));
    var candidates = all.filter(function(el) {
      if (!visible(el)) return false;
      var sc = score(el);
      if (sc < 7) return false;
      var r = el.getBoundingClientRect();
      return r.width > 220 && r.width < innerWidth * .98 &&
             r.height > 180 && r.height < innerHeight * .96;
    });
    candidates.sort(function(a,b) {
      var ar=a.getBoundingClientRect(), br=b.getBoundingClientRect();
      return (ar.width*ar.height) - (br.width*br.height);
    });
    return candidates[0] || null;
  }

  function patch() {
    var panel = findPanel();
    if (!panel) return;
    panel.classList.add('rl7-pat-picker-correct');

    var nodes = panel.querySelectorAll('*');
    nodes.forEach(function(el) {
      var t=(el.textContent||'').trim();
      if (t.indexOf('· 拍一拍') >= 0 && el.children.length === 0)
        el.classList.add('rl7-pat-picker-title');
      if (t.indexOf('格式：') >= 0 && el.children.length === 0)
        el.classList.add('rl7-pat-picker-subtitle');
    });

    /* The phrase chips in this picker are sometimes divs, not buttons.
       Detect the small rounded clickable leaves and style those too. */
    nodes.forEach(function(el) {
      if (el.children.length) return;
      var t=(el.textContent||'').trim();
      if (!t || t === '取消' || t.indexOf('格式：') === 0 || t.indexOf('· 拍一拍') >= 0) return;
      var r=el.getBoundingClientRect();
      if (r.width > 80 && r.height > 28 && r.height < 90) {
        var cs=getComputedStyle(el);
        if (cs.cursor === 'pointer' || el.onclick || el.closest('button,[role="button"]')) {
          (el.closest('button,[role="button"]') || el).classList.add('rl7-pat-picker-choice');
        }
      }
    });
  }

  installStyle();
  var queued=false;
  function queue(){
    if(queued)return; queued=true;
    requestAnimationFrame(function(){queued=false;patch();});
  }
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  document.addEventListener('click',function(){setTimeout(patch,0);setTimeout(patch,80);},true);
  patch();
})();
