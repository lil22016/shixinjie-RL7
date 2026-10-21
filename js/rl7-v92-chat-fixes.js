/* RL7 V92 — 聊天页滑到底继续拖动时整页下移；站内消息横幅点击直达聊天
 *
 * 1. 聊天记录已经到底（或到顶）还继续拖时，iOS 会把这次拖动“传”给整个网页，
 *    整页一起被拉动，露出黑色底色。这里在边界处拦下这次拖动，只让聊天列表自己滚。
 * 2. 站内顶部消息横幅：点击后直接打开对应的聊天界面。
 */
(function(){
'use strict';

/* ---------- 1. 拦截聊天页边界处的整页拖动 ---------- */
function chatRoom(){ return document.getElementById('page-chat-room'); }
function chatActive(){ var r=chatRoom(); return !!(r && r.classList.contains('active')); }

function scrollableY(el){
  var room=chatRoom();
  while(el && el!==document.body && el!==document.documentElement){
    if(el.nodeType===1){
      var cs=getComputedStyle(el), oy=cs.overflowY;
      if((oy==='auto'||oy==='scroll') && el.scrollHeight>el.clientHeight+1) return el;
    }
    if(el===room) break;
    el=el.parentNode;
  }
  return null;
}

var sx=0, sy=0, scroller=null, tracking=false;
document.addEventListener('touchstart',function(e){
  tracking=false;
  if(!chatActive()||!e.touches||e.touches.length!==1) return;
  var room=chatRoom();
  if(!room.contains(e.target)) return;
  tracking=true;
  sx=e.touches[0].clientX; sy=e.touches[0].clientY;
  scroller=scrollableY(e.target);
},{passive:true,capture:true});

document.addEventListener('touchmove',function(e){
  if(!tracking||!e.cancelable||!e.touches||e.touches.length!==1) return;
  var dx=e.touches[0].clientX-sx, dy=e.touches[0].clientY-sy;
  if(Math.abs(dy)<=Math.abs(dx)) return;              /* 横向滑动（卡片、轮播）不管 */
  if(!scroller){ e.preventDefault(); return; }        /* 顶栏、空白处：本来就没东西可滚 */
  var top=scroller.scrollTop<=0;
  var bottom=scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-1;
  /* 手指往上推且已到底，或手指往下拉且已到顶 → 不再交给整个网页 */
  if((dy<0&&bottom)||(dy>0&&top)) e.preventDefault();
},{passive:false,capture:true});

document.addEventListener('touchend',function(){ tracking=false; scroller=null; },{passive:true,capture:true});
document.addEventListener('touchcancel',function(){ tracking=false; scroller=null; },{passive:true,capture:true});

/* ---------- 2. 横幅点击直达聊天 ---------- */
function bannerChatId(){
  var cid=(typeof _proactiveChatId!=='undefined'&&_proactiveChatId)||'';
  if(cid&&String(cid).indexOf('partner_')===0) return cid;
  try{
    var chats=Storage.getChats()||[],best=null;
    for(var i=0;i<chats.length;i++){
      if(String(chats[i].id).indexOf('partner_')!==0) continue;
      if(!best||(chats[i].lastTime||0)>(best.lastTime||0)) best=chats[i];
    }
    return best?best.id:'';
  }catch(e){ return ''; }
}
function openChat(cid){
  cid=cid||bannerChatId();
  if(cid&&typeof openChatRoom==='function'){ try{ openChatRoom(cid); return; }catch(e){} }
  if(window.Navigation){ try{ Navigation.navigateTo('chat-room'); }catch(e){} }
}
window.RL7OpenChat=openChat;

function patchBanner(){
  if(typeof window.showTopBanner!=='function'||window.showTopBanner.__v92) return false;
  var orig=window.showTopBanner;
  var wrapped=function(){
    var cid=bannerChatId();
    var r=orig.apply(this,arguments);
    var b=document.getElementById('msg-top-banner');
    if(b){
      try{
        var pid=String(cid).replace('partner_',''), nm='';
        (Storage.getPartnerProfiles()||[]).forEach(function(p){ if(String(p.id)===pid) nm=p.nickname||''; });
        var tt=b.querySelector('.msg-banner-title');
        if(nm&&tt) tt.textContent='『'+nm+'』发来消息';
      }catch(e){}
      b.onclick=function(ev){
        if(ev){ ev.stopPropagation(); }
        if(typeof dismissTopBanner==='function') dismissTopBanner();
        openChat(cid);
      };
    }
    return r;
  };
  wrapped.__v92=true;
  window.showTopBanner=wrapped;
  return true;
}
if(!patchBanner()){
  var n=0,t=setInterval(function(){ if(patchBanner()||++n>40) clearInterval(t); },250);
}
})();
