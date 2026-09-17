/* RL7 v10 — restore original home geometry; fix app-label stacking; reliable release modal */
(function(){
'use strict';

var RELEASE = '20260917-v10';
var KEY = 'rl7_release_ack_20260917_v10';

function installHomeFix(){
  if (document.getElementById('rl7-home-fix-v10')) return;

  var style = document.createElement('style');
  style.id = 'rl7-home-fix-v10';
  style.textContent = `
    /*
      IMPORTANT:
      Restore the exact pre-v8 app-grid geometry.
      pages-home.css originally supplies 14px top padding, while the later
      companion stylesheet intentionally raises it to 64px so the companion
      card and first app row do not overlap.
      v8/v9 accidentally overrode that 64px value.
    */
    #page-home #app-swipe-wrapper.home-widgets-wrap{
      margin-top:auto !important;
      padding:64px 18px 32px !important;
      box-sizing:border-box !important;
      position:relative !important;
      z-index:240 !important;
      overflow:visible !important;
    }

    /* Do not move the 8 apps. Only put their painted content above cover layers. */
    #page-home .home-core-row{
      position:relative !important;
      z-index:241 !important;
      overflow:visible !important;
    }
    #page-home .home-feature-grid{
      position:relative !important;
      z-index:242 !important;
      overflow:visible !important;
    }
    #page-home .home-feature-item{
      position:relative !important;
      z-index:243 !important;
      overflow:visible !important;
    }
    #page-home .home-feature-icon,
    #page-home .home-feature-label{
      position:relative !important;
      z-index:244 !important;
      overflow:visible !important;
    }
    #page-home .home-feature-label{
      display:block !important;
      visibility:visible !important;
      opacity:1 !important;
    }

    /*
      Release notice is viewport-fixed and completely outside normal layout.
      It cannot push/reflow the home page or be covered by the bottom nav.
    */
    #rl7-release-overlay{
      position:fixed !important;
      inset:0 !important;
      width:100vw !important;
      height:100dvh !important;
      z-index:2147483000 !important;
      display:flex !important;
      align-items:center !important;
      justify-content:center !important;
      box-sizing:border-box !important;
      padding:24px !important;
      margin:0 !important;
      background:rgba(16,17,27,.46) !important;
      -webkit-backdrop-filter:blur(10px) !important;
      backdrop-filter:blur(10px) !important;
      overflow:hidden !important;
    }
    #rl7-release-overlay .rl7-update-card{
      position:relative !important;
      inset:auto !important;
      transform:none !important;
      width:min(86vw,360px) !important;
      max-width:360px !important;
      max-height:70dvh !important;
      margin:0 !important;
      padding:22px !important;
      box-sizing:border-box !important;
      overflow:auto !important;
      border-radius:24px !important;
      background:rgba(39,40,53,.96) !important;
      border:1px solid rgba(255,255,255,.16) !important;
      box-shadow:0 18px 60px rgba(0,0,0,.35) !important;
      color:#fff !important;
    }
    #rl7-release-overlay .rl7-update-title{
      margin:0 0 8px !important;
      font-size:24px !important;
      line-height:1.2 !important;
      font-weight:750 !important;
      color:#fff !important;
    }
    #rl7-release-overlay .rl7-update-copy{
      margin:0 0 18px !important;
      font-size:14px !important;
      line-height:1.5 !important;
      color:rgba(255,255,255,.76) !important;
    }
    #rl7-release-overlay .rl7-update-actions{
      display:flex !important;
      justify-content:flex-end !important;
    }
    #rl7-release-overlay #rl7-release-ok{
      min-width:84px !important;
      padding:10px 18px !important;
      border:0 !important;
      border-radius:14px !important;
      background:rgba(255,255,255,.16) !important;
      color:#fff !important;
      font:inherit !important;
      font-weight:700 !important;
    }
  `;
  document.head.appendChild(style);
}

function showRelease(){
  if (document.getElementById('rl7-release-overlay')) return;

  var overlay = document.createElement('div');
  overlay.id = 'rl7-release-overlay';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.innerHTML =
    '<div class="rl7-update-card">' +
      '<div class="rl7-update-title">Updated</div>' +
      '<div class="rl7-update-copy">Home app display and layout have been corrected.</div>' +
      '<div class="rl7-update-actions"><button id="rl7-release-ok" type="button">OK</button></div>' +
    '</div>';

  document.body.appendChild(overlay);

  var ok = document.getElementById('rl7-release-ok');
  if (ok) ok.onclick = function(){
    try { localStorage.setItem(KEY, RELEASE); } catch(e){}
    overlay.remove();
  };
}

function boot(){
  installHomeFix();

  var acknowledged = '';
  try { acknowledged = localStorage.getItem(KEY) || ''; } catch(e){}

  /* A new key is used for v10. It is recorded only after OK is tapped. */
  if (acknowledged !== RELEASE) {
    setTimeout(showRelease, 900);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, {once:true});
} else {
  boot();
}
})();
