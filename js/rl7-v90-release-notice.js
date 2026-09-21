/* RL7 V90 — keep the existing release-notice behavior; only advance the release acknowledgement. */
(function(){
  'use strict';
  var RELEASE='20260921-v90';
  var KEY='rl7_release_ack_20260921_v90';

  function show(){
    if(document.getElementById('rl7-v90-release-overlay')) return;
    var ov=document.createElement('div');
    ov.id='rl7-v90-release-overlay';
    ov.setAttribute('role','dialog');
    ov.setAttribute('aria-modal','true');
    ov.style.cssText='position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(16,17,27,.46);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-sizing:border-box';
    ov.innerHTML='<div style="width:min(86vw,360px);padding:22px;box-sizing:border-box;border-radius:24px;background:rgba(39,40,53,.96);border:1px solid rgba(255,255,255,.16);box-shadow:0 18px 60px rgba(0,0,0,.35);color:#fff"><div style="font-size:22px;font-weight:750;margin-bottom:8px">已更新到最新版</div><div style="font-size:14px;line-height:1.5;color:rgba(255,255,255,.76);margin-bottom:18px">本次更新已成功加载。</div><div style="display:flex;justify-content:flex-end"><button id="rl7-v90-release-ok" type="button" style="min-width:84px;padding:10px 18px;border:0;border-radius:14px;background:rgba(255,255,255,.16);color:#fff;font:inherit;font-weight:700">确定</button></div></div>';
    document.body.appendChild(ov);
    document.getElementById('rl7-v90-release-ok').onclick=function(){
      try{localStorage.setItem(KEY,RELEASE);}catch(e){}
      ov.remove();
    };
  }

  function boot(){
    var ack='';
    try{ack=localStorage.getItem(KEY)||'';}catch(e){}
    if(ack!==RELEASE) setTimeout(show,900);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
