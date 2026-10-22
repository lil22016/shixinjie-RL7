/* RL7 V94 — 主动发送：随机间隔区间 + 勿扰时间段（设置界面）
 * 规则本身在 chat-auto.js（_paceNextTime），推送服务 push-server 用同一套规则。
 */
(function(){
'use strict';

function S(k,d){try{return Storage.get(k,d);}catch(e){return d;}}
function W(k,v){try{Storage.set(k,v);}catch(e){}}
function toast(t){try{Core.toast(t);}catch(e){}}
function fmt(sec){try{return formatSecondsText(sec);}catch(e){return Math.round(sec/60)+' 分钟';}}

function restart(){
  try{ if(Storage.getProactiveSend()&&typeof stopProactiveTimer==='function'){ stopProactiveTimer(); startProactiveTimer(); } }catch(e){}
  /* 通知推送服务（若已开启离线推送）用新的节奏排期 */
  try{ if(window.RL7WebPush&&RL7WebPush.sync)RL7WebPush.sync(); }catch(e){}
}

function row(id,label,desc,right){
  return '<div class="pace-input-row" id="'+id+'" style="border-top:1px solid rgba(0,0,0,0.06)">'+
    '<div class="s-content"><div class="s-label">'+label+'</div><div class="s-value">'+desc+'</div></div>'+right+'</div>';
}
function toggleRow(id,label,desc,inputId){
  return '<div class="settings-item" id="'+id+'" style="border-top:1px solid rgba(0,0,0,0.06)">'+
    '<div class="s-content"><div class="s-label">'+label+'</div><div class="s-value">'+desc+'</div></div>'+
    '<label class="toggle-switch"><input type="checkbox" id="'+inputId+'"><span class="toggle-slider"></span></label></div>';
}
var UNIT='<select id="%-unit" class="pace-unit-select"><option value="1">秒</option><option value="60" selected>分钟</option><option value="3600">小时</option></select>';

function inject(){
  if(document.getElementById('cs-pace-random'))return true;
  var anchor=document.getElementById('cs-proactive-interval-row');if(!anchor)return false;
  var html=
    toggleRow('cs-pace-random-row','随机间隔','开启后，每次在最短和最长间隔之间随机抽一个时间','cs-pace-random')+
    row('cs-proactive-max-row','最长间隔','例如最短 15 分钟、最长 30 分钟，每次就在 15~30 分钟之间随机',
      '<div class="pace-input-wrap"><input type="number" id="cs-proactive-max-num" min="1" max="9999" inputmode="numeric" placeholder="30">'+UNIT.replace('%','cs-proactive-max')+'</div>')+
    toggleRow('cs-pace-dnd-row','勿扰时间段','开启后，这段时间内不会主动发消息，也不会推送','cs-pace-dnd')+
    row('cs-pace-dnd-time-row','勿扰时间','可以跨过午夜，例如晚上 12 点到早上 10 点',
      '<div class="pace-input-wrap rl7-dnd-times"><input type="time" id="cs-pace-dnd-start"><span class="pace-unit-text">至</span><input type="time" id="cs-pace-dnd-end"></div>');
  var tmp=document.createElement('div');tmp.innerHTML=html;
  var ref=anchor.nextSibling,parent=anchor.parentNode;
  while(tmp.firstChild)parent.insertBefore(tmp.firstChild,ref);

  var st=document.createElement('style');
  st.textContent='#cs-pace-dnd-time-row{flex-wrap:wrap;row-gap:10px}#cs-pace-dnd-time-row .s-content{flex:1 1 100%;min-width:100%}.rl7-dnd-times{gap:8px;align-items:center;width:100%;justify-content:flex-start}.rl7-dnd-times input[type=time]{flex:1}.rl7-dnd-times input[type=time]{width:auto;min-width:92px;padding:6px 8px;border-radius:10px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.7);font:inherit;font-size:15px;color:inherit;-webkit-appearance:none;appearance:none}';
  document.head.appendChild(st);

  var rnd=document.getElementById('cs-pace-random'),dnd=document.getElementById('cs-pace-dnd');
  rnd.addEventListener('change',function(){
    W('proactiveIntervalRandom',rnd.checked);
    if(rnd.checked){
      var mn=Storage.getProactiveSendInterval(),mx=Number(S('proactiveIntervalMax',0));
      if(!mx||mx<mn){mx=mn*2;W('proactiveIntervalMax',mx);}
    }
    render();restart();
  });
  function saveMax(){
    var v=_paceReadInput('cs-proactive-max');
    var mn=Storage.getProactiveSendInterval();
    if(v===null){render();return toast('请输入不小于 1 的数字');}
    if(v<mn){v=mn;toast('最长间隔不能小于最短间隔，已调整为 '+fmt(mn));}
    W('proactiveIntervalMax',v);render();restart();
  }
  document.getElementById('cs-proactive-max-num').addEventListener('change',saveMax);
  document.getElementById('cs-proactive-max-unit').addEventListener('change',saveMax);
  dnd.addEventListener('change',function(){W('proactiveDnd',dnd.checked);render();restart();});
  ['start','end'].forEach(function(k){
    document.getElementById('cs-pace-dnd-'+k).addEventListener('change',function(e){
      if(!/^\d{2}:\d{2}$/.test(e.target.value))return render();
      W(k==='start'?'proactiveDndStart':'proactiveDndEnd',e.target.value);
      var s=S('proactiveDndStart','00:00'),en=S('proactiveDndEnd','10:00');
      if(s===en)toast('开始和结束时间一样，勿扰不会生效');
      render();restart();
    });
  });

  /* 最短间隔改了以后，保证最长不小于最短 */
  var orig=window.chatSetProactiveInterval;
  if(typeof orig==='function'&&!orig.__v94){
    var w=function(){
      var r=orig.apply(this,arguments);
      var mn=Storage.getProactiveSendInterval(),mx=Number(S('proactiveIntervalMax',0));
      if(S('proactiveIntervalRandom',false)&&mx&&mx<mn){W('proactiveIntervalMax',mn);toast('最长间隔已同步调整为不小于最短间隔');}
      render();restart();return r;
    };
    w.__v94=true;window.chatSetProactiveInterval=w;
    var a=document.getElementById('cs-proactive-interval-num'),b=document.getElementById('cs-proactive-interval-unit');
    if(a)a.setAttribute('onchange','chatSetProactiveInterval()');
    if(b)b.setAttribute('onchange','chatSetProactiveInterval()');
  }
  render();
  return true;
}

function render(){
  var rnd=document.getElementById('cs-pace-random');if(!rnd)return;
  var on=!!S('proactiveIntervalRandom',false),dOn=!!S('proactiveDnd',false);
  var master=false;try{master=!!Storage.getProactiveSend();}catch(e){}
  rnd.checked=on;
  document.getElementById('cs-pace-dnd').checked=dOn;
  document.getElementById('cs-proactive-max-row').style.display=on?'':'none';
  document.getElementById('cs-pace-dnd-time-row').style.display=dOn?'':'none';
  var mn=Storage.getProactiveSendInterval(),mx=Math.max(mn,Number(S('proactiveIntervalMax',0))||mn);
  _paceSetInput('cs-proactive-max',mx);
  document.getElementById('cs-pace-dnd-start').value=S('proactiveDndStart','00:00');
  document.getElementById('cs-pace-dnd-end').value=S('proactiveDndEnd','10:00');
  /* 原来的「主动发送间隔」在随机模式下就是最短间隔 */
  var lbl=document.querySelector('#cs-proactive-interval-row .s-label'),val=document.querySelector('#cs-proactive-interval-row .s-value');
  if(lbl)lbl.textContent=on?'最短间隔':'主动发送间隔';
  if(val)val.textContent=on?'随机区间的下限':'对方主动发起新消息的间隔时间';
  ['cs-proactive-interval-row','cs-pace-random-row','cs-proactive-max-row','cs-pace-dnd-row','cs-pace-dnd-time-row'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.style.opacity=master?'':'0.5';
  });
}

function hookToggle(){
  var orig=window.chatSettingToggle;
  if(typeof orig!=='function'||orig.__v94)return;
  var w=function(key){var r=orig.apply(this,arguments);if(key==='proactiveSend')render();return r;};
  for(var k in orig)w[k]=orig[k];
  w.__v94=true;window.chatSettingToggle=w;
}

function init(){
  inject();hookToggle();
  /* 设置页每次打开都同步一下显示 */
  document.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('[onclick*="settings"],[onclick*="navigateTo"]');
    if(t)setTimeout(function(){inject();render();},300);
  },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
setTimeout(init,1500);
window.RL7PaceUI={render:render};
})();
