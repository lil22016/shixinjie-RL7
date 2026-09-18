/* RL7 Safe Cloud v40 — ADD ONLY. Never overwrite local objects; never delete local data. */
(function(){'use strict';
const C={url:'https://tncilkhksteqocbnqcrt.supabase.co',key:'sb_publishable_fj5yqUMg3BLws3HoMY9MiQ_TcGXjHsS',table:'user_sync'};
const A='__rl7_cloud_auth_v1',READY='__rl7_cloud_ready_v3',NS='safe:v40:';
let busy=false;
const J=(s,f)=>{try{return JSON.parse(s)}catch(e){return f}}, auth=()=>J(localStorage.getItem(A),null), uid=()=>auth()?.user?.id;
const enc=s=>encodeURIComponent(String(s)), dec=s=>decodeURIComponent(s);
function ident(x){
 if(x&&typeof x==='object'){
   for(const k of ['id','messageId','msgId','momentId','commentId','uuid','key','createdAt','time'])
     if(x[k]!=null)return k+':'+String(x[k]);
 }
 return 'json:'+JSON.stringify(x);
}
async function api(path,opt={}){
 let a=auth(),h=Object.assign({apikey:C.key,'Content-Type':'application/json'},opt.headers||{});
 if(a?.access_token)h.Authorization='Bearer '+a.access_token;
 let r=await fetch(C.url+path,Object.assign({},opt,{headers:h})),t=await r.text(),d=t?J(t,t):null;
 if(!r.ok)throw Error((d&&(d.msg||d.message||d.error_description||d.error))||('HTTP '+r.status));
 return d;
}
async function ensure(){
 let a=auth(); if(!a)return false;
 if(a.expires_at&&a.expires_at*1000<Date.now()+60000&&a.refresh_token){
   try{
     let d=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:a.refresh_token})});
     if(d.expires_in&&!d.expires_at)d.expires_at=Math.floor(Date.now()/1000)+Number(d.expires_in);
     localStorage.setItem(A,JSON.stringify(d));
   }catch(e){return false}
 }
 return !!uid();
}
function state(s){
 let e=document.getElementById('rl7-cloud-settings-state');
 if(e)e.textContent=s==='ok'?'已同步 · 安全添加模式':s==='error'?'同步失败':localStorage.getItem(READY)?'同步开启 · 安全添加模式':'同步暂停 · 点击开启';
}
function idbRows(dbName,storeName){
 return new Promise((res)=>{
   try{
     let q=indexedDB.open(dbName); q.onerror=()=>res([]);
     q.onsuccess=()=>{
       let d=q.result;if(!d.objectStoreNames.contains(storeName)){d.close();return res([])}
       let tx=d.transaction(storeName,'readonly'),st=tx.objectStore(storeName),out=[],cur=st.openCursor();
       cur.onsuccess=e=>{let c=e.target.result;if(c){out.push({key:c.key,value:c.value});c.continue()}else{d.close();res(out)}};
       cur.onerror=()=>{d.close();res(out)};
     };
   }catch(e){res([])}
 });
}
function getList(key){
 try{
   if(key.startsWith('mirror_')&&window.Storage){
     let v=Storage.get(key.slice(7),[]); return Array.isArray(v)?v:[];
   }
   let v=J(localStorage.getItem(key),[]); return Array.isArray(v)?v:[];
 }catch(e){return []}
}
function setList(key,list){
 try{
   if(key.startsWith('mirror_')&&window.Storage){Storage.set(key.slice(7),list);return}
   localStorage.setItem(key,JSON.stringify(list));
 }catch(e){}
}
function addMissing(list,item){
 let id=ident(item); if(list.some(x=>ident(x)===id))return false;
 list.push(item); return true;
}
function discoverAppendLists(){
 let out=[];
 for(let i=0;i<localStorage.length;i++){
   let k=localStorage.key(i); if(!k)continue;
   if(k.startsWith('mirror___ts_')||k.startsWith('mirror_msg_')||k==='mirror_chats'||k==='mirror_groupChats')continue;
   let allowed=k.startsWith('mirror_')||k.startsWith('shixin_')||k.startsWith('rl7_');
   if(!allowed)continue;
   let v=J(localStorage.getItem(k),null);
   if(Array.isArray(v)&&v.length&&v.every(x=>x&&typeof x==='object'&&!Array.isArray(x)))out.push({key:k,list:v});
 }
 return out;
}
async function localRecords(){
 let out=[];
 // 1. Messages: each message is an independent cloud object.
 let msgRows=await idbRows('mirror_message_db','messages');
 for(const r of msgRows){
   let row=r.value;if(!row||!row.chatId||String(row.chatId).startsWith('__meta_')||!Array.isArray(row.messages))continue;
   for(const m of row.messages)out.push({k:NS+'msg:'+enc(row.chatId)+':'+enc(ident(m)),d:{chatId:String(row.chatId),item:m}});
 }
 // 2. Generic append-only object arrays already persisted by the app.
 for(const rec of discoverAppendLists()){
   for(const item of rec.list)out.push({k:NS+'list:'+enc(rec.key)+':'+enc(ident(item)),d:{key:rec.key,item}});
 }
 // 3. Moments: posts and comments separately, so a comment can be added without replacing its post.
 try{
   let md=Storage.get('momentsFeed_v1',null);
   if(md&&Array.isArray(md.feed))for(const m of md.feed){
     out.push({k:NS+'moment:'+enc(ident(m)),d:{item:m}});
     for(const c of (Array.isArray(m.comments)?m.comments:[]))
       out.push({k:NS+'momentComment:'+enc(String(m.id))+':'+enc(ident(c)),d:{momentId:String(m.id),item:c}});
   }
 }catch(e){}
 // 4. Time mailbox letters independently.
 try{
   let mb=Storage.get('timeMailbox_v1',null);
   if(mb&&Array.isArray(mb.letters))for(const l of mb.letters)
     out.push({k:NS+'mail:'+enc(ident(l)),d:{item:l}});
 }catch(e){}
 // 5. Journal photos: real image payloads, one fixed slot each. Existing local slot is NEVER replaced.
 if(window.JournalPhotoDB)for(let i=0;i<4;i++){
   try{let v=await JournalPhotoDB.get('slot_'+i);if(v)out.push({k:NS+'journalPhoto:'+i,d:{slot:i,value:v}})}catch(e){}
 }
 // 6. Chat image/media IDB: preserve the actual binary/dataURL behind __IDB_IMG__ refs.
 let media=await idbRows('mirror_chat_image_db','chat_images');
 for(const r of media)if(r.value)out.push({k:NS+'chatMedia:'+enc(r.key),d:{key:String(r.key),value:r.value}});
 // Deduplicate same cloud key locally without changing data.
 let m=new Map();for(const x of out)if(!m.has(x.k))m.set(x.k,x);return [...m.values()];
}
async function cloudRows(){
 return api('/rest/v1/'+C.table+'?user_id=eq.'+enc(uid())+'&data_key=like.'+enc(NS)+'%25&select=data_key,data,updated_at');
}
async function insertOnly(items){
 for(let i=0;i<items.length;i+=20){
   let body=items.slice(i,i+20).map(x=>({user_id:uid(),data_key:x.k,data:x.d,updated_at:new Date().toISOString()}));
   await api('/rest/v1/'+C.table+'?on_conflict=user_id,data_key',{
     method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(body)
   });
 }
}
async function applyCloud(r){
 let k=r.data_key,d=r.data;if(!d)return false;
 // Messages
 if(k.startsWith(NS+'msg:')){
   let chatId=d.chatId,item=d.item;if(!chatId||!item||!window.Storage)return false;
   let list=Storage.getMessages(chatId)||[];if(!addMissing(list,item))return false;
   Storage.setMessages(chatId,list);
   let room=document.getElementById('page-chat-room');if(room&&String(room.dataset.chatId)===String(chatId)&&window.renderChatMessages)renderChatMessages(chatId);
   return true;
 }
 // Generic append-only list
 if(k.startsWith(NS+'list:')){
   let key=d.key,item=d.item;if(!key||!item)return false;
   let list=getList(key);if(!addMissing(list,item))return false;setList(key,list);return true;
 }
 // Moment post
 if(k.startsWith(NS+'moment:')&&!k.startsWith(NS+'momentComment:')){
   if(!window.Storage||!d.item)return false;
   let md=Storage.get('momentsFeed_v1',null)||{feed:[]};if(!Array.isArray(md.feed))md.feed=[];
   if(!addMissing(md.feed,d.item))return false;Storage.set('momentsFeed_v1',md);
   try{window.MomentsApp?.renderMoments?.()}catch(e){} return true;
 }
 // Moment comment: only append comment; never replace post.
 if(k.startsWith(NS+'momentComment:')){
   let md=Storage.get('momentsFeed_v1',null);if(!md||!Array.isArray(md.feed))return false;
   let m=md.feed.find(x=>String(x.id)===String(d.momentId));if(!m)return false;
   if(!Array.isArray(m.comments))m.comments=[];if(!addMissing(m.comments,d.item))return false;
   Storage.set('momentsFeed_v1',md);try{window.MomentsApp?.renderMoments?.()}catch(e){} return true;
 }
 // Mailbox letters
 if(k.startsWith(NS+'mail:')){
   let mb=Storage.get('timeMailbox_v1',null)||{letters:[],nextIncomingTime:0};if(!Array.isArray(mb.letters))mb.letters=[];
   if(!addMissing(mb.letters,d.item))return false;Storage.set('timeMailbox_v1',mb);return true;
 }
 // Journal photo: fill an EMPTY local slot only. Never replace an existing photo.
 if(k.startsWith(NS+'journalPhoto:')&&window.JournalPhotoDB){
   let slot=Number(d.slot);if(slot<0||slot>3||!d.value)return false;
   let cur=await JournalPhotoDB.get('slot_'+slot);if(cur)return false;
   await JournalPhotoDB.set('slot_'+slot,d.value);
   try{
     let jd=window.JournalCard?JournalCard._getData():null;
     if(jd&&(!jd.photos[slot]||jd.photos[slot]==='__idb__')){jd.photos[slot]='__idb__';JournalCard._save(jd);JournalCard.render(jd)}
   }catch(e){}
   return true;
 }
 // Chat media: fill missing IDB media only.
 if(k.startsWith(NS+'chatMedia:')&&window.ChatImageDB){
   let cur='';try{cur=await ChatImageDB.get(d.key)}catch(e){}
   if(cur||!d.value)return false;await ChatImageDB.set(d.key,d.value);return true;
 }
 return false;
}
async function sync(){
 if(busy||!localStorage.getItem(READY)||!await ensure())return;
 busy=true;
 try{
   let [local,cloud]=await Promise.all([localRecords(),cloudRows()]);
   let cm=new Set(cloud.map(r=>r.data_key));
   // Pull first: only ADD missing local objects.
   for(const r of cloud)await applyCloud(r);
   // Recollect after pull, then upload only cloud-missing objects. Existing cloud rows are never updated.
   local=await localRecords();
   let add=local.filter(x=>!cm.has(x.k));
   if(add.length)await insertOnly(add);
   state('ok');
 }catch(e){console.error('[RL7 Safe Cloud v40]',e);state('error')}
 finally{busy=false}
}
function enable(){localStorage.setItem(READY,'1');sync()}
function disable(){localStorage.removeItem(READY);state('off')}
function boot(){
 setInterval(()=>{if(document.visibilityState==='visible')sync()},3000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
 if(localStorage.getItem(READY))setTimeout(sync,700);
}
window.RL7CloudSync={syncNow:sync,enable,disable,mode:'safe-add-only-v40'};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();