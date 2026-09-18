/* RL7 v43 — Moments use normal card pool; reply labels/unread; resolved shop cards */
(function(){'use strict';
if(window.__RL7_V43__)return;window.__RL7_V43__=1;
function partners(){try{return Storage.getPartnerProfiles?Storage.getPartnerProfiles():[]}catch(e){return[]}}
function partner(m){var a=partners();if(!a.length)return null;return a.find(function(x){return m&&String(x.id)===String(m.authorId)})||a[0]}
function me(){try{return MomentsApp._meSnapshot()}catch(e){return {id:'me',name:'Raylee'}}}
function cardReply(p){
 try{
  var main=(Storage.getCards?Storage.getCards():[]).filter(function(c){return c&&c.category!=='格言'&&c.text});
  var sub=[]; if(p&&Storage.getSubCards){var blocked=Storage.getBlockedSubCards?Storage.getBlockedSubCards():[];sub=(Storage.getSubCards()||[]).filter(function(c){return c&&c.text&&String(c.partnerId)===String(p.id)&&blocked.indexOf(c.id)<0})}
  var pool=(sub.length&&main.length)?(Math.random()<.5?sub:main):(sub.length?sub:main); if(!pool.length)return '';
  var first=pool[Math.floor(Math.random()*pool.length)], texts=[first.text];
  if(Storage.getSpellCardSend&&Storage.getSpellCardSend()&&pool.length>1){var extra=1+Math.floor(Math.random()*2);while(extra--){var c=pool[Math.floor(Math.random()*pool.length)];if(c&&c.text)texts.push(c.text)}}
  return texts.join(Storage.getSpellCardSend&&Storage.getSpellCardSend()?'，':'');
 }catch(e){return ''}
}
function markUnread(){try{localStorage.setItem('rl7_moments_reply_unread_v43',String(Date.now()))}catch(e){};paintUnread()}
function clearUnread(){try{localStorage.removeItem('rl7_moments_reply_unread_v43')}catch(e){};paintUnread()}
function hasUnread(){try{return !!localStorage.getItem('rl7_moments_reply_unread_v43')}catch(e){return false}}
function badge(host,parent){if(!host)return;var b=host.querySelector(':scope > .rl7-v43-moment-badge');if(!hasUnread()){if(b)b.remove();return}if(!b){b=document.createElement('span');b.className='rl7-unread-badge rl7-v43-moment-badge'+(parent?' dot parent-dot':'');if(!parent)b.textContent='1';host.classList.add('rl7-badge-host');host.appendChild(b)}}
function paintUnread(){
 var d=document.getElementById('page-discover'); if(d){var rows=d.querySelectorAll('.discover-item');for(var i=0;i<rows.length;i++){if((rows[i].textContent||'').replace(/\s+/g,'').indexOf('朋友圈')===0){badge(rows[i].querySelector('.discover-icon')||rows[i],false);break}}}
 var navs=document.querySelectorAll('.bottom-nav .nav-item,.bottom-nav-item,.nav-item');for(var j=0;j<navs.length;j++){if(/发现/.test(navs[j].textContent||'')){badge(navs[j].querySelector('.nav-icon,.bottom-nav-icon,.icon-wrap,.icon')||navs[j],true);break}}
}
function addComment(mid,text,replyTo){var h=MomentsApp._findMoment(mid);if(!h||!h.moment||!text)return;var p=partner(h.moment);if(!p)return;h.moment.comments=h.moment.comments||[];h.moment.comments.push({id:'c_loki_'+Date.now()+'_'+Math.floor(Math.random()*1000),authorId:p.id,name:p.nickname||p.name||'Loki',avatar:p.avatar||'',color:p.avatarColor||p.color||'',avatarImage:p.avatarImage||'',text:text,time:Date.now(),replyTo:replyTo||''});MomentsApp._saveFeed(h.data);MomentsApp._renderFeed();markUnread();try{window.RL7CloudSync&&RL7CloudSync.syncNow&&RL7CloudSync.syncNow()}catch(e){}}
function installMoments(){if(!window.MomentsApp||MomentsApp.__v43)return false;MomentsApp.__v43=1;
 var op=MomentsApp.submitMomentsPublish;MomentsApp.submitMomentsPublish=function(){var before=this._loadFeed(),ids=new Set((before.feed||[]).map(function(x){return String(x.id)})),r=op.apply(this,arguments),after=this._loadFeed(),m=(after.feed||[]).slice().reverse().find(function(x){return !ids.has(String(x.id))&&String(x.authorId)==='me'});if(m&&Math.random()<.70){var p=partner(m),t=cardReply(p);if(t)setTimeout(function(){addComment(m.id,t,me().name||'Raylee')},900+Math.random()*1800)}return r};
 var oc=MomentsApp.submitMomentComment;MomentsApp.submitMomentComment=function(){var mid=this._commentMomentId,h=this._findMoment(mid),partnerPost=!!(h&&h.moment&&this._isPartnerId(h.moment.authorId)),ids=new Set((h&&h.moment&&h.moment.comments||[]).map(function(x){return String(x.id)})),r=oc.apply(this,arguments);if(partnerPost&&Math.random()<.70){var x=this._findMoment(mid),mine=(x&&x.moment.comments||[]).slice().reverse().find(function(c){return !ids.has(String(c.id))&&String(c.authorId)==='me'}),p=x&&partner(x.moment),t=cardReply(p);if(mine&&t)setTimeout(function(){addComment(mid,t,mine.name||me().name||'Raylee')},900+Math.random()*1800)}return r};
 var card=MomentsApp._momentCardHtml;MomentsApp._momentCardHtml=function(m){var h=card.call(this,m);(m.comments||[]).forEach(function(c){if(c.replyTo){var a='<span class="c-name">'+Core.escapeHtml(c.name)+'：</span>',b='<span class="c-name">'+Core.escapeHtml(c.name)+'</span><span class="c-reply"> 回复 '+Core.escapeHtml(c.replyTo)+'：</span>';h=h.replace(a,b)}});return h};return true}
function resolveShopCards(){var rows=Array.from(document.querySelectorAll('#page-chat-room .message-row'));rows.forEach(function(row,idx){if(!row.classList.contains('self'))return;var card=row.querySelector('.rl7-action-card');if(!card||card.dataset.v43resolved)return;var buttons=card.querySelectorAll('button');if(!buttons.length)return;var other=null;for(var j=idx+1;j<rows.length;j++){if(rows[j].classList.contains('self'))break;if(rows[j].classList.contains('other')){other=rows[j];break}}if(!other)return;var el=other.querySelector('.message-bubble .message-text,.message-bubble,.gift-card-greeting,.gift-card-note,.gift-card-name');var txt=el?(el.textContent||'').trim():'';if(!txt)return;card.dataset.v43resolved='1';var acts=card.querySelector('.rl7-card-actions');if(acts)acts.remove();else buttons.forEach(function(b){b.remove()});var st=card.querySelector('.rl7-card-status')||document.createElement('div');st.className='rl7-card-status rl7-v43-shop-result';st.textContent='Loki replied: '+txt;if(!st.parentNode)card.appendChild(st)})}
document.addEventListener('click',function(e){var row=e.target&&e.target.closest&&e.target.closest('#page-discover .discover-item');if(row&&/朋友圈/.test(row.textContent||''))clearUnread()},true);
var n=0,t=setInterval(function(){installMoments();paintUnread();resolveShopCards();if(++n>240){}},500);setTimeout(function(){installMoments();paintUnread();resolveShopCards()},0);
})();
