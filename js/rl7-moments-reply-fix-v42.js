/* RL7 v41 — reliable Loki Moments replies */
(function(){'use strict';
if(window.__RL7_MOMENTS_REPLY_V41__)return;window.__RL7_MOMENTS_REPLY_V41__=1;
function roles(){try{return Storage.getPartnerProfiles?Storage.getPartnerProfiles():[]}catch(e){return[]}}
function partnerFor(m){let a=roles();if(!a.length)return null;if(m&&m.authorId){let p=a.find(x=>String(x.id)===String(m.authorId));if(p)return p}return a[0]}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
const POST_LINES=["Oh, so this is what you're broadcasting to the world today?","I saw this. Of course I did.","Mm. You look very pleased with yourself.","You posted this knowing I'd see it, didn't you?","Noted, darling. I'm keeping an eye on you.","There you are. Causing trouble on my feed again.","Cute. I suppose I'll allow everyone else to see this too.","And here I was wondering what you were up to."];
const REPLY_LINES=["You really had to say that where everyone can see it?","Mm. I was wondering when you'd show up.","Careful, darling. I can reply here too.","Noted. Loud and clear.","You're very bold in my comments today.","I saw that. Obviously.","And here I thought you'd behave.","That's what you decided to leave under my post?","Cute. Keep talking.","I knew that would get your attention."];
function add(mid,text,replyTo){
 let h=MomentsApp._findMoment(mid);if(!h||!h.moment)return;let p=partnerFor(h.moment);if(!p)return;
 h.moment.comments=h.moment.comments||[];
 h.moment.comments.push({id:'c_loki_'+Date.now()+'_'+Math.floor(Math.random()*1000),authorId:p.id,name:p.nickname||p.name||'Loki',avatar:p.avatar||'',color:p.avatarColor||p.color||'',avatarImage:p.avatarImage||'',text:text,time:Date.now(),replyTo:replyTo||''});
 MomentsApp._saveFeed(h.data);MomentsApp._renderFeed();try{window.RL7CloudSync?.syncNow?.()}catch(e){}
}
function install(){
 if(!window.MomentsApp||MomentsApp.__reply41)return false;MomentsApp.__reply41=true;
 let oldPost=MomentsApp.submitMomentsPublish;
 MomentsApp.submitMomentsPublish=function(){
  let before=this._loadFeed(),ids=new Set((before.feed||[]).map(x=>String(x.id))),r=oldPost.apply(this,arguments);
  let after=this._loadFeed(),m=(after.feed||[]).slice().reverse().find(x=>!ids.has(String(x.id))&&String(x.authorId)==='me');
  if(m&&Math.random()<.70)setTimeout(()=>add(m.id,pick(POST_LINES),''),900+Math.random()*1800);return r;
 };
 let oldComment=MomentsApp.submitMomentComment;
 MomentsApp.submitMomentComment=function(){
  let mid=this._commentMomentId,h=this._findMoment(mid),partnerPost=!!(h&&h.moment&&this._isPartnerId(h.moment.authorId));
  let ids=new Set((h&&h.moment&&h.moment.comments||[]).map(x=>String(x.id))),r=oldComment.apply(this,arguments);
  if(partnerPost&&Math.random()<.70){let x=this._findMoment(mid),mine=(x&&x.moment.comments||[]).slice().reverse().find(c=>!ids.has(String(c.id))&&String(c.authorId)==='me');if(mine)setTimeout(()=>add(mid,pick(REPLY_LINES),mine.name||''),900+Math.random()*1800)}
  return r;
 };return true;
}
let n=0,t=setInterval(()=>{if(install()||++n>40)clearInterval(t)},250);setTimeout(install,0);
})();

/* RL7 v42 additions — Pat reply reliability + mobile Decision modal readability/keyboard scrolling */
(function(){'use strict';
if(window.__RL7_PAT_DECISION_V42__)return;window.__RL7_PAT_DECISION_V42__=1;

/* PAT: current chat-extra already calls schedulePatAutoReplyFlow, but scheduleAutoReply can be
   suppressed by other pending special messages. Add one guarded fallback normal reply attempt.
   This does NOT force a reply if the normal reply engine itself decides not to answer. */
function installPat(){
 if(typeof window.sendPat!=='function'||window.sendPat.__rl7v42)return false;
 var old=window.sendPat;
 window.sendPat=function(mode){
   var chatId=(typeof _currentChatId==='function')?_currentChatId():(document.getElementById('page-chat-room')||{}).dataset?.chatId;
   var before=chatId&&window.Storage?Storage.getMessages(chatId).length:0;
   var r=old.apply(this,arguments);
   if(mode!=='other'&&chatId){
     setTimeout(function(){
       try{
         var now=Storage.getMessages(chatId);
         var gotOther=now.slice(before).some(function(m){return m&&m.type==='other'});
         if(!gotOther){
           if(typeof scheduleGroupAutoReply==='function'&&typeof isGroupChatId==='function'&&isGroupChatId(chatId))scheduleGroupAutoReply(chatId);
           else if(typeof scheduleAutoReply==='function')scheduleAutoReply(chatId);
         }
       }catch(e){}
     },900);
   }
   return r;
 };
 window.sendPat.__rl7v42=1;return true;
}

/* Decision modal: readable fields + scroll the focused field above iOS keyboard. */
function installDecision(){
 if(typeof window.openDecisionPanel!=='function'||window.openDecisionPanel.__rl7v42)return false;
 var old=window.openDecisionPanel;
 window.openDecisionPanel=function(){
   var r=old.apply(this,arguments);
   setTimeout(enhanceDecision,0);return r;
 };
 window.openDecisionPanel.__rl7v42=1;
 return true;
}
function enhanceDecision(){
 var ov=document.getElementById('decision-overlay'),panel=ov&&ov.querySelector('.decision-panel');
 if(!ov||!panel)return;
 panel.style.overflowY='auto';panel.style.webkitOverflowScrolling='touch';panel.style.touchAction='pan-y';
 function lift(el){
   setTimeout(function(){
     try{
       el.scrollIntoView({behavior:'smooth',block:'center'});
       if(window.visualViewport){
         var rr=el.getBoundingClientRect(),bottom=window.visualViewport.height-18;
         if(rr.bottom>bottom)panel.scrollTop+=rr.bottom-bottom+24;
       }
     }catch(e){}
   },180);
 }
 panel.querySelectorAll('input,textarea').forEach(function(el){
   el.addEventListener('focus',function(){lift(el)});
   el.addEventListener('input',function(){lift(el)});
 });
 if(window.visualViewport&&!panel.__vv42){
   panel.__vv42=1;
   window.visualViewport.addEventListener('resize',function(){
     var a=document.activeElement;if(a&&panel.contains(a))lift(a);
   });
 }
}
let n=0,t=setInterval(function(){var a=installPat(),b=installDecision();if((a&&b)||++n>60)clearInterval(t)},250);
setTimeout(function(){installPat();installDecision()},0);
})();
