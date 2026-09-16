/* RL7 viewport diagnostic v1 — visual only, no layout mutation */
(function(){
  'use strict';
  if (window.__RL7_VIEWPORT_DEBUG__) return;
  window.__RL7_VIEWPORT_DEBUG__ = true;

  function n(v){ return (typeof v === 'number' && isFinite(v)) ? Math.round(v*10)/10 : String(v); }
  function rect(sel){
    var el=document.querySelector(sel);
    if(!el) return null;
    var r=el.getBoundingClientRect();
    return {top:n(r.top),bottom:n(r.bottom),height:n(r.height),left:n(r.left),right:n(r.right)};
  }
  function standalone(){
    return !!((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone);
  }
  function snap(reason){
    var vv=window.visualViewport;
    var root=document.scrollingElement||document.documentElement;
    var data={
      t:new Date().toISOString().slice(11,23),
      reason:reason,
      standalone:standalone(),
      dpr:window.devicePixelRatio,
      screen:{w:screen.width,h:screen.height,aw:screen.availWidth,ah:screen.availHeight},
      window:{innerW:n(innerWidth),innerH:n(innerHeight),outerH:n(outerHeight),scrollY:n(scrollY)},
      doc:{
        clientH:n(document.documentElement.clientHeight),
        scrollH:n(document.documentElement.scrollHeight),
        bodyH:n(document.body && document.body.getBoundingClientRect().height),
        rootScrollTop:n(root && root.scrollTop)
      },
      vv:vv?{
        w:n(vv.width),h:n(vv.height),offsetTop:n(vv.offsetTop),
        pageTop:n(vv.pageTop),scale:n(vv.scale)
      }:null,
      rects:{
        app:rect('#app'),
        home:rect('#page-home'),
        bottomNav:rect('.bottom-nav'),
        chat:rect('#page-chat-room'),
        chatTop:rect('#page-chat-room .chat-room-topbar'),
        chatInputZone:rect('#page-chat-room .chat-input-zone'),
        chatInputBar:rect('#page-chat-room .chat-input-bar'),
        chatInput:rect('#chat-input')
      }
    };
    window.__rl7ViewportLast=data;
    var log=window.__rl7ViewportLog=window.__rl7ViewportLog||[];
    log.push(data); if(log.length>30) log.shift();
    render(data);
  }

  function line(k,v){return '<div><b>'+k+'</b> '+v+'</div>';}
  function rline(k,o){return line(k,o?('T '+o.top+' / B '+o.bottom+' / H '+o.height):'—');}
  function render(d){
    var box=document.getElementById('rl7-vp-debug');
    if(!box)return;
    var vv=d.vv||{};
    box.querySelector('.rl7-vp-body').innerHTML=
      line('state',d.reason+' · '+d.t)+
      line('standalone',d.standalone)+
      line('screen',d.screen.h+' · avail '+d.screen.ah)+
      line('innerH',d.window.innerH+' · outerH '+d.window.outerH)+
      line('scrollY',d.window.scrollY+' · root '+d.doc.rootScrollTop)+
      line('doc',d.doc.clientH+' / scroll '+d.doc.scrollH+' / body '+d.doc.bodyH)+
      line('visualViewport','H '+vv.h+' · offsetTop '+vv.offsetTop+' · pageTop '+vv.pageTop+' · scale '+vv.scale)+
      rline('app',d.rects.app)+
      rline('bottom-nav',d.rects.bottomNav)+
      rline('chat',d.rects.chat)+
      rline('chat-top',d.rects.chatTop)+
      rline('input-zone',d.rects.chatInputZone);
  }

  function make(){
    var box=document.createElement('div');
    box.id='rl7-vp-debug';
    box.innerHTML='<div class="rl7-vp-head"><span>Viewport Debug</span><button id="rl7-vp-snap">SNAP</button><button id="rl7-vp-copy">COPY</button><button id="rl7-vp-hide">×</button></div><div class="rl7-vp-body"></div>';
    var st=document.createElement('style');
    st.id='rl7-vp-debug-style';
    st.textContent=`
      #rl7-vp-debug{position:fixed!important;z-index:2147483647!important;left:8px!important;top:max(8px,env(safe-area-inset-top,0px))!important;width:min(360px,calc(100vw - 16px))!important;max-height:46vh!important;overflow:auto!important;background:rgba(0,0,0,.84)!important;color:#fff!important;border:1px solid rgba(255,255,255,.35)!important;border-radius:12px!important;padding:8px!important;font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace!important;box-shadow:0 8px 28px rgba(0,0,0,.35)!important;-webkit-backdrop-filter:blur(12px)!important;backdrop-filter:blur(12px)!important}
      #rl7-vp-debug *{box-sizing:border-box!important}
      .rl7-vp-head{display:flex!important;gap:6px!important;align-items:center!important;position:sticky!important;top:0!important;background:rgba(0,0,0,.92)!important;padding-bottom:5px!important}
      .rl7-vp-head span{font-weight:700!important;flex:1!important}
      .rl7-vp-head button{font:inherit!important;color:#fff!important;background:#333!important;border:1px solid #777!important;border-radius:6px!important;padding:3px 7px!important}
      .rl7-vp-body b{display:inline-block!important;width:92px!important;color:#9ee7ff!important}
    `;
    document.head.appendChild(st); document.body.appendChild(box);
    document.getElementById('rl7-vp-snap').onclick=function(){snap('manual-snap')};
    document.getElementById('rl7-vp-copy').onclick=function(){
      var txt=JSON.stringify(window.__rl7ViewportLast,null,2);
      if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).catch(function(){});
      else prompt('Copy viewport data:',txt);
    };
    document.getElementById('rl7-vp-hide').onclick=function(){box.style.display='none'};
  }

  function schedule(reason){
    [0,80,250,700,1500].forEach(function(ms){setTimeout(function(){snap(reason+'+'+ms)},ms)});
  }

  function boot(){
    make();
    schedule('boot');
    window.addEventListener('pageshow',function(){schedule('pageshow')},{passive:true});
    window.addEventListener('resize',function(){snap('window-resize')},{passive:true});
    window.addEventListener('scroll',function(){snap('window-scroll')},{passive:true});
    document.addEventListener('visibilitychange',function(){if(!document.hidden)schedule('visible')});
    if(window.visualViewport){
      visualViewport.addEventListener('resize',function(){snap('vv-resize')},{passive:true});
      visualViewport.addEventListener('scroll',function(){snap('vv-scroll')},{passive:true});
    }
    document.addEventListener('focusin',function(){setTimeout(function(){snap('focusin')},30)},true);
    document.addEventListener('focusout',function(){setTimeout(function(){snap('focusout')},100)},true);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
