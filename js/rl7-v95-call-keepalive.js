/* RL7 V95 — 保活改为「通话中自动开启」+ 朋友圈一键清空
 *
 * 保活：
 *  - 平时不再保活（离线推送已经接管后台消息）。
 *  - 语音 / 视频通话一开始（呼叫中或已接通）自动开始播放几乎无声的音频，切到后台通话也不会被系统掐掉。
 *  - 通话中手动关掉「后台保活」开关 → 只停这一次；下一通电话照样自动开启。
 *  - 通话结束自动停止。
 *
 * 朋友圈：顶部工具栏加「清空」，确认后删除全部动态。
 */
(function(){
'use strict';

/* ============================================================ 保活 */
var inCall=false, suppressed=false, manual=false;

function S(){return window.Storage;}
function setStored(v){try{S().setBackgroundKeepAlive(!!v);}catch(e){}}
function start(){
  /* 存成 true：iOS 若拦了自动播放，rl7-patches 会在下一次点屏幕时自动补上 */
  setStored(true);
  try{ if(typeof window.startKeepAliveAudio==='function') window.startKeepAliveAudio(); }catch(e){}
  paint();
}
function stop(){
  setStored(false);
  try{ if(typeof window.stopKeepAliveAudio==='function') window.stopKeepAliveAudio(); }catch(e){}
  paint();
}
function callPresent(){ return !!document.getElementById('call-active-overlay'); }

function onCallStart(){
  if(inCall) return;
  inCall=true; suppressed=false;
  start();
}
function onCallEnd(){
  if(!inCall) return;
  inCall=false; suppressed=false;
  if(!manual) stop(); else paint();
}

/* 开关：显示的是「此刻有没有在保活」 */
function paint(){
  var cb=document.getElementById('cs-keep-alive');
  if(cb){ var on=false; try{on=!!S().getBackgroundKeepAlive();}catch(e){} cb.checked=on; }
  var item=cb&&cb.closest('.settings-item');
  var v=item&&item.querySelector('.s-value');
  if(v) v.textContent=inCall
    ? (suppressed?'本次通话已关闭保活，下一通电话会自动开启':'通话中，正在保活：切到后台通话也不会断')
    : '通话时自动开启，切到后台通话也不会断；通话中手动关掉只对这一次有效';
}

function hookToggle(){
  var orig=window.chatSettingToggle;
  if(typeof orig!=='function'||orig.__v95) return;
  var w=function(key,el){
    var r=orig.apply(this,arguments);
    if(key==='backgroundKeepAlive'){
      var on=!!(el&&el.checked);
      if(inCall){ suppressed=!on; manual=false; }
      else { manual=on; }   /* 不在通话时手动打开：本次打开网站期间一直保活，刷新后恢复默认 */
      paint();
    }
    return r;
  };
  for(var k in orig) w[k]=orig[k];
  w.__v95=true; window.chatSettingToggle=w;
}

/* 在点击「拨打 / 接听」的同一下里启动，iOS 才允许出声 */
function wrap(name){
  var orig=window[name];
  if(typeof orig!=='function'||orig.__v95) return;
  var w=function(){
    var r=orig.apply(this,arguments);
    if(callPresent()) onCallStart();
    return r;
  };
  for(var k in orig) w[k]=orig[k];
  w.__v95=true; window[name]=w;
}
function install(){ hookToggle(); wrap('startCall'); wrap('answerIncomingCall'); paint(); }

/* 兜底：任何方式开始 / 结束通话（含对方拒接、未接、挂断、缩成小气泡）都以通话浮层是否存在为准 */
var mo=new MutationObserver(function(){ callPresent()?onCallStart():onCallEnd(); });
function observe(){ if(document.body) mo.observe(document.body,{childList:true,subtree:true}); }

/* 平时不保活：打开网站时把旧的「一直保活」设置清掉 */
setStored(false);
function bootStop(){ if(!inCall&&!manual&&!callPresent()){ setStored(false); try{ window.stopKeepAliveAudio&&window.stopKeepAliveAudio(); }catch(e){} paint(); } }

function init(){ install(); observe(); bootStop(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
[800,2000,4000].forEach(function(ms){ setTimeout(function(){ install(); bootStop(); },ms); });
document.addEventListener('click',function(e){
  var t=e.target.closest&&e.target.closest('[onclick*="navigateTo"]');
  if(t) setTimeout(paint,300);
},true);

window.RL7CallKeepAlive={state:function(){return {inCall:inCall,suppressed:suppressed,manual:manual,stored:(function(){try{return S().getBackgroundKeepAlive();}catch(e){return null;}})()};}};

/* ============================================================ 朋友圈一键清空 */
function clearMoments(){
  var M=window.MomentsApp; if(!M) return;
  var data=M._loadFeed(), n=(data.feed||[]).length;
  if(!n){ try{Core.toast('朋友圈已经是空的');}catch(e){} return; }
  var go=function(){
    var d=M._loadFeed(); d.feed=[]; M._saveFeed(d);
    try{ localStorage.removeItem('rl7_moments_reply_unread_v43'); }catch(e){}
    try{ M._renderFeed(); }catch(e){}
    try{ Core.toast('已清空 '+n+' 条动态'); }catch(e){}
  };
  if(window.Core&&Core.confirm) Core.confirm('清空全部朋友圈？','共 '+n+' 条动态（包括你和角色发的、点赞和评论），清空后无法恢复',go);
  else if(confirm('清空全部朋友圈？清空后无法恢复')) go();
}
function addClearBtn(){
  var bar=document.querySelector('#page-moments .moments-toolbar');
  if(!bar||bar.querySelector('.rl7-moments-clear')) return;
  var b=document.createElement('button');
  b.className='moments-toolbar-btn ghost rl7-moments-clear';
  b.innerHTML='<i class="fas fa-trash-alt"></i>清空';
  b.title='清空全部朋友圈动态';
  b.addEventListener('click',clearMoments);
  bar.appendChild(b);
}
function hookMoments(){
  var M=window.MomentsApp; if(!M||M.renderMoments.__v95) return;
  var orig=M.renderMoments;
  M.renderMoments=function(){ var r=orig.apply(this,arguments); addClearBtn(); return r; };
  M.renderMoments.__v95=true;
  addClearBtn();
}
hookMoments(); setTimeout(hookMoments,1500);
window.RL7ClearMoments=clearMoments;
})();
