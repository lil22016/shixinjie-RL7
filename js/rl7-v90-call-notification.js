/* RL7 V90 — incoming voice/video calls use the same notification channel as messages. */
(function(){'use strict';
function partnerName(){
  try { return typeof _getCurrentPartnerName==='function' ? (_getCurrentPartnerName()||'对方') : '对方'; }
  catch(e){ return '对方'; }
}
function systemNotify(kind){
  var isVideo=kind==='video';
  var name=partnerName();
  var body=isVideo?'正在邀请你视频通话…':'正在邀请你语音通话…';
  /* Same in-app banner path as normal messages. */
  try { if(typeof showTopBanner==='function') showTopBanner((isVideo?'[视频通话] ':'[语音通话] ')+body); } catch(e){}
  if(!window.Storage || !Storage.getBackgroundPush || !Storage.getBackgroundPush()) return;
  if(!('Notification' in window) || Notification.permission!=='granted') return;
  var title='『'+name+'』'+(isVideo?'视频来电':'语音来电');
  var opts={body:body,tag:'love-call',renotify:true,requireInteraction:true,data:{type:'incoming-call'}};
  /* Prefer service-worker notifications: this is the PWA-friendly path, especially on iOS. */
  try{
    if(navigator.serviceWorker && navigator.serviceWorker.ready){
      navigator.serviceWorker.ready.then(function(reg){
        if(reg && reg.showNotification) return reg.showNotification(title,opts);
        throw new Error('no showNotification');
      }).catch(function(){
        try { new Notification(title,opts); } catch(e){}
      });
    }else{
      new Notification(title,opts);
    }
  }catch(e){}
}
function install(){
  if(typeof window._triggerIncomingCall!=='function'||window._triggerIncomingCall.__rl7v90notify)return false;
  var old=window._triggerIncomingCall;
  function wrapped(kind){
    var already=document.getElementById('call-incoming-overlay')||document.getElementById('call-active-overlay');
    var r=old.apply(this,arguments);
    /* Notify only when this invocation actually created a new incoming-call UI. */
    if(!already && document.getElementById('call-incoming-overlay')) systemNotify(kind||'voice');
    return r;
  }
  wrapped.__rl7v90notify=true;
  window._triggerIncomingCall=wrapped;
  return true;
}
install();
var n=0,t=setInterval(function(){if(install()||++n>120)clearInterval(t)},100);
})();