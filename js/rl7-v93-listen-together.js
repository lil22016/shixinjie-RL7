/* RL7 V93 — 一起听歌（从 Uranus 一比一移植，替换原来的一起听歌）
 *
 * 来源：Uranus_Imessage-QD client/src/panels/music.jsx + client/src/musicstore.js
 * 界面、动画、播放逻辑（预取下一首、锁屏/后台自动切歌、Media Session、歌词、
 * 每日推荐 / 歌单 / 聊聊、播放方式、加入歌单、扫码登录）都照搬。
 *
 * 唯一的不同：Uranus 里 Ta 说的话由 AI 模型现写；拾心界没有模型，
 * 所以 Ta 的插话、表态、切歌台词、聊聊回复都从「听歌字卡」里抽（发现 → 听歌字卡），
 * 概率在设置里调，和 Uranus 一样每首歌掷一次骰子。
 *
 * 播放器本体活在界面之外：关掉这个页面、回到聊天，歌都不会停。
 */
(function(){
'use strict';

/* ============================================================ 图标（lucide） */
var IC={
  back:'<path d="m15 18-6-6 6-6"/>',
  phones:'<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
  set:'<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  menu:'<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
  prev:'<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/>',
  next:'<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>',
  play:'<polygon points="6 3 20 12 6 21 6 3"/>',
  pause:'<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  heart:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  list:'<path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/>',
  chat:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  shuffle:'<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>',
  one:'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  minus:'<path d="M5 12h14"/>',
  plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
  down:'<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>'
};
function ic(n,size,sw,fill){
  return '<svg width="'+(size||20)+'" height="'+(size||20)+'" viewBox="0 0 24 24" fill="'+(fill?'currentColor':'none')+'" stroke="currentColor" stroke-width="'+(sw||1.7)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+IC[n]+'</svg>';
}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function pick(a){return a[Math.floor(Math.random()*a.length)];}

/* ============================================================ 本机设置（同 Uranus 的 uranus.music.v1） */
var KEY='rl7.music.v2';
var local=(function(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){return {};}})(); // { api, cookie, uid, nick, mode, likeListId, likeListName }
function setLocal(p){for(var k in p)local[k]=p[k];try{localStorage.setItem(KEY,JSON.stringify(local));}catch(e){}emit();}

/* Ta 的设置（Uranus 存在 Companion 服务端，这里存本机） */
var MKEY='rl7.music.cfg';
var mcfg=(function(){var d={commentChance:.35,attitudeChance:.3,skipChance:.1};try{var s=JSON.parse(localStorage.getItem(MKEY)||'null');if(s)for(var k in s)d[k]=s[k];}catch(e){}return d;})();
function saveMcfg(p){for(var k in p)mcfg[k]=p[k];try{localStorage.setItem(MKEY,JSON.stringify(mcfg));}catch(e){}emit();}

/* Ta 的态度、聊聊记录 */
var AKEY='rl7.music.att', CKEY='rl7.music.chat';
function loadJ(k,d){try{return JSON.parse(localStorage.getItem(k)||'null')||d;}catch(e){return d;}}
function saveJ(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}

/* ============================================================ 网易云 API（自己部署的 NeteaseCloudMusicApi） */
function ne(path,params,opt){
  params=params||{};opt=opt||{};
  var api=opt.api!=null?opt.api:local.api;
  if(!/^https?:\/\//i.test(api||''))return Promise.reject(new Error('先在右上角设置里填音乐 API 地址'));
  var u=new URL(String(api).replace(/\/+$/,'')+path);
  Object.keys(params).forEach(function(k){if(params[k]!==undefined)u.searchParams.set(k,params[k]);});
  if(local.cookie&&!opt.anon)u.searchParams.set('cookie',local.cookie);
  u.searchParams.set('timestamp',String(Date.now()));
  return fetch(u.toString()).catch(function(){throw new Error('连不上音乐 API（地址写错了，或者那边没开跨域）');})
    .then(function(res){return res.json().catch(function(){return null;}).then(function(d){if(!d)throw new Error('音乐 API 返回了奇怪的东西 ('+res.status+')');return d;});});
}
function https(u){return u?String(u).replace(/^http:\/\//i,'https://'):'';}
function norm(t){
  return {id:String(t.id),name:t.name||'',artist:(t.ar||t.artists||[]).map(function(a){return a.name;}).join(' / '),
    cover:https((t.al&&t.al.picUrl)||(t.album&&t.album.picUrl)||''),dur:Math.round((t.dt||t.duration||0)/1000)};
}
function parseLrc(text){
  var out=[];
  String(text||'').split(/\r?\n/).forEach(function(ln){
    var re=/\[(\d+):(\d+(?:\.\d+)?)\]/g,m,tags=[];while((m=re.exec(ln)))tags.push(m);
    var body=ln.replace(/\[[^\]]*\]/g,'').trim();
    tags.forEach(function(m){if(body)out.push({t:Number(m[1])*60+Number(m[2]),s:body});});
  });
  return out.sort(function(a,b){return a.t-b.t;});
}

/* ============================================================ 状态 */
var st={queue:[],idx:-1,playing:false,pos:0,dur:0,lrc:[],att:loadJ(AKEY,[]),chat:loadJ(CKEY,[]),bubble:'',toast:'',liked:[]};
var subs=[];
function emit(){subs.forEach(function(f){try{f();}catch(e){}});}
function set(p){for(var k in p)st[k]=p[k];emit();}
var toastT;
function say(m){set({toast:m});clearTimeout(toastT);toastT=setTimeout(function(){set({toast:''});},3200);}

function partner(){
  var pid=(typeof _chatCurrentPartnerId!=='undefined'&&_chatCurrentPartnerId)||window._chatCurrentPartnerId||'';
  var list=[];try{list=Storage.getPartnerProfiles()||[];}catch(e){}
  if(!pid){
    try{var chats=Storage.getChats()||[],best=null;chats.forEach(function(c){if(String(c.id).indexOf('partner_')===0&&(!best||(c.lastTime||0)>(best.lastTime||0)))best=c;});if(best)pid=String(best.id).replace('partner_','');}catch(e){}
  }
  for(var i=0;i<list.length;i++)if(String(list[i].id)===String(pid))return list[i];
  return list[0]||{nickname:'Ta'};
}
function me(){try{return Storage.getMyProfile()||{};}catch(e){return {};}}
function names(){return {c:partner().nickname||'Ta',u:me().nickname||''};}

/* ============================================================ 音频 */
var audio=new Audio();
audio.preload='auto';
audio.setAttribute('playsinline','');
var PREFETCH_LEAD=40,PREFETCH_TTL=15*60*1000,EARLY_SWITCH=1.5,PREFETCH_RETRY=5000;
var pre=null,preBusy=false,preFailAt=0,resumeOnVisible=false,switching=false,history=[];
function isHidden(){return document.visibilityState==='hidden';}
function cur(){return st.queue[st.idx]||null;}
function lineNow(){var k=-1,t=audio.currentTime||0;for(var i=0;i<st.lrc.length;i++)if(st.lrc[i].t<=t+.2)k=i;return k>=0?st.lrc[k].s:'';}

audio.addEventListener('play',function(){window.__musicPlaying=true;switching=false;set({playing:true});syncSession();scheduleRoll();});
audio.addEventListener('pause',function(){if(switching)return;window.__musicPlaying=false;set({playing:false});syncSession();});
audio.addEventListener('timeupdate',function(){
  st.pos=audio.currentTime;emitPos();updatePosition();
  if(!isFinite(audio.duration)||!audio.duration)return;
  var left=audio.duration-audio.currentTime;
  if(left<PREFETCH_LEAD)prefetchNext();
  if(isHidden()&&!audio.paused&&left<EARLY_SWITCH&&local.mode!=='one')advancePrefetched();
});
audio.addEventListener('loadedmetadata',function(){set({dur:audio.duration||0});});
audio.addEventListener('ended',function(){
  if(audio.loop)return;
  if(local.mode==='one'&&cur()){audio.currentTime=0;audio.play().catch(function(){resumeOnVisible=true;});}
  else if(!advancePrefetched())next();
});
audio.addEventListener('error',function(){if(audio.src)say('这首加载失败了');});
audio.loop=local.mode==='one';

/* 进度只刷新进度相关的地方，不整页重画 */
var posSubs=[];
function emitPos(){posSubs.forEach(function(f){try{f();}catch(e){}});}

function pickNext(from){
  var n=st.queue.length,i=(from+1)%n;
  if(local.mode==='shuffle'&&n>1){do i=Math.floor(Math.random()*n);while(i===from);}
  return i;
}
function prefetchNext(){
  if(preBusy||!st.queue.length||local.mode==='one')return;
  if(pre&&pre.queue===st.queue&&pre.from===st.idx)return;
  if(Date.now()-preFailAt<PREFETCH_RETRY)return;
  preBusy=true;
  var queue=st.queue,from=st.idx,skipped=[],i=pickNext(from),tries=0;
  (function step(){
    if(tries>=3||i===from){preFailAt=Date.now();preBusy=false;return;}
    tries++;
    var s=queue[i];
    ne('/song/url/v1',{id:s.id,level:'standard'}).then(function(d){
      var it=d.data&&d.data[0];
      if(st.queue!==queue||st.idx!==from){preBusy=false;return;}
      if(it&&it.url){pre={queue:queue,from:from,idx:i,url:https(it.url),trial:!!it.freeTrialInfo,at:Date.now(),skipped:skipped};preBusy=false;return;}
      skipped.push(s.name);
      i=local.mode==='shuffle'?pickNext(i):(i+1)%queue.length;
      step();
    }).catch(function(){preFailAt=Date.now();preBusy=false;});
  })();
}
function advancePrefetched(){
  var p=pre;pre=null;
  if(!p||p.queue!==st.queue||p.from!==st.idx||Date.now()-p.at>PREFETCH_TTL)return false;
  var s=p.queue[p.idx];if(!s)return false;
  if(st.idx>=0)history.push(st.idx);history=history.slice(-50);
  clearTimeout(rollTimer);preFailAt=0;
  switching=!audio.paused;
  audio.src=p.url;audio.loop=local.mode==='one';
  var pr=audio.play();
  set({idx:p.idx,lrc:[],pos:0,dur:s.dur||0});syncSession();
  if(p.skipped.length)say('「'+p.skipped.join('」「')+'」放不了，已跳过');
  else if(p.trial)say('这首只有试听片段（会员歌曲）');
  if(pr&&pr.catch)pr.catch(function(){switching=false;set({playing:false});syncSession();resumeOnVisible=true;});
  loadLyric(s);
  return true;
}
function loadLyric(s){
  ne('/lyric',{id:s.id}).then(function(d){if(cur()&&cur().id===s.id)set({lrc:parseLrc(d.lrc&&d.lrc.lyric)});}).catch(function(){});
}
document.addEventListener('visibilitychange',function(){
  if(document.visibilityState==='visible'&&resumeOnVisible&&audio.src&&audio.paused){resumeOnVisible=false;audio.play().catch(function(){});}
});

function stopOldPlayer(){
  /* 原来那版一起听歌如果在放，先停掉，免得两边一起响 */
  try{document.querySelectorAll('audio').forEach(function(a){if(a!==audio&&a.id!=='rl7-background-keepalive-audio'&&!a.paused)a.pause();});}catch(e){}
}
function play(list,i){
  var s=list[i];if(!s)return;
  stopOldPlayer();
  clearTimeout(rollTimer);pre=null;preFailAt=0;
  set({queue:list,idx:i,lrc:[],pos:0,dur:s.dur||0});syncSession();
  ne('/song/url/v1',{id:s.id,level:'standard'}).then(function(d){
    var it=d.data&&d.data[0];
    if(!it||!it.url){
      say('「'+s.name+'」放不了（版权 / 会员 / 地区限制），跳到下一首');
      if(i+1<list.length)setTimeout(function(){play(list,i+1);},600);else set({playing:false});
      return;
    }
    if(it.freeTrialInfo)say('这首只有试听片段（会员歌曲）');
    audio.src=https(it.url);
    return audio.play().catch(function(){
      if(isHidden())resumeOnVisible=true;else say('浏览器拦住了自动播放，点一下播放键');
    });
  }).catch(function(e){say(e.message);});
  loadLyric(s);
}
function playAll(list){
  if(!list||!list.length)return;
  history=[];
  play(list,local.mode==='shuffle'?Math.floor(Math.random()*list.length):0);
}
function setMode(m){setLocal({mode:m});pre=null;audio.loop=m==='one';}
function next(){
  if(!st.queue.length)return;
  if(advancePrefetched())return;
  var i=pickNext(st.idx);
  if(st.idx>=0)history.push(st.idx);history=history.slice(-50);
  play(st.queue,i);
}
function prev(){
  if(!st.queue.length)return;
  if(audio.currentTime>4)return seek(0);
  var i=local.mode==='shuffle'&&history.length?history.pop():(st.idx-1+st.queue.length)%st.queue.length;
  play(st.queue,i);
}
function toggle(){if(!audio.src)return;if(audio.paused){stopOldPlayer();audio.play().catch(function(){});}else audio.pause();}
function seek(t){audio.currentTime=t;}

function syncSession(){
  if(!('mediaSession' in navigator))return;
  var s=cur();
  try{
    if(s&&window.MediaMetadata)navigator.mediaSession.metadata=new MediaMetadata({title:s.name,artist:s.artist,album:'Listen Together',artwork:s.cover?[{src:s.cover+'?param=512y512',sizes:'512x512'}]:[]});
    navigator.mediaSession.playbackState=st.playing?'playing':'paused';
    navigator.mediaSession.setActionHandler('play',function(){audio.play().catch(function(){});});
    navigator.mediaSession.setActionHandler('pause',function(){audio.pause();});
    navigator.mediaSession.setActionHandler('nexttrack',next);
    navigator.mediaSession.setActionHandler('previoustrack',prev);
    navigator.mediaSession.setActionHandler('seekto',function(d){seek(d.seekTime);});
  }catch(e){}
}
var lastPosAt=0;
function updatePosition(){
  if(!('mediaSession' in navigator)||!navigator.mediaSession.setPositionState)return;
  var now=Date.now();if(now-lastPosAt<3000||!isFinite(audio.duration))return;lastPosAt=now;
  try{navigator.mediaSession.setPositionState({duration:audio.duration,position:audio.currentTime,playbackRate:1});}catch(e){}
}

/* ============================================================ 我的 ♥ / 歌单 */
function loadLiked(){
  if(!local.api||!local.cookie)return Promise.resolve();
  var uidP=local.uid?Promise.resolve(local.uid):ne('/login/status').then(function(r){var p=(r.data&&r.data.profile)||r.profile;if(!p)throw 0;setLocal({uid:p.userId,nick:p.nickname});return p.userId;});
  return uidP.then(function(uid){return ne('/likelist',{uid:uid});}).then(function(d){if(Array.isArray(d.ids))set({liked:d.ids.map(String)});}).catch(function(){});
}
function toggleLike(){
  var s=cur();if(!s)return;
  var on=st.liked.indexOf(s.id)<0;
  set({liked:on?st.liked.concat([s.id]):st.liked.filter(function(x){return x!==s.id;})});
  ne('/like',{id:s.id,like:on?'true':'false'}).then(function(d){
    if(d.code!==200)throw new Error(d.message||d.msg||'网易云没有接受（可能没登录或接口不支持）');
    say(on?'已加入「我喜欢的音乐」':'已取消喜欢');
  }).catch(function(e){
    set({liked:on?st.liked.filter(function(x){return x!==s.id;}):st.liked.concat([s.id])});
    say(e.message);
  });
}
function addToList(pid,song,quiet){
  song=song||cur();if(!song||!pid)return Promise.resolve(false);
  return ne('/playlist/tracks',{op:'add',pid:pid,tracks:song.id}).then(function(d){
    var code=(d.body&&d.body.code)!=null?d.body.code:d.code;
    if(code===200){if(!quiet)say('已加入歌单');return true;}
    if(code===502){if(!quiet)say('这首已经在那个歌单里了');return true;}
    throw new Error((d.body&&(d.body.message||d.body.msg))||d.message||d.msg||'加入歌单没成功');
  }).catch(function(e){if(!quiet)say(e.message);return false;});
}
function createList(name){
  return ne('/playlist/create',{name:name,privacy:'10'}).then(function(d){if(d.code!==200||!d.id)throw new Error(d.message||d.msg||'新建歌单没成功');return {id:d.id,name:name};});
}

/* ============================================================ Ta 那边（字卡代替模型） */
var DEF={
  comment:["This one again? You do have a type, darling.","Hm. The bridge is better than it has any right to be.","I could listen to this while pretending not to enjoy it.","Turn it up a little. I'm not asking twice."],
  praise:["Oh, this one has taste.","Not completely dreadful. Your universe possesses a sliver of taste.","This one stays. Don't look so pleased; I meant the song."],
  dislike:["Who allowed this into the playlist?","This one is testing my generosity, darling."],
  skip:["I've endured enough of that one. Let's try something else.","A change of soundtrack, darling. Indulge me."],
  chat:["Mm. Keep talking, I'm listening.","Is that so? Tell me more while this plays.","You say the most curious things during good songs."]
};
function cards(){try{return JSON.parse(localStorage.getItem('lt_music_cards')||'{}')||{};}catch(e){return {};}}
function line(key){
  var c=cards(),arr=Object.prototype.hasOwnProperty.call(c,key)?c[key]:DEF[key];
  if((!arr||!arr.length)&&key==='chat'){
    /* 聊聊没单独写字卡时：用 Ta 平时聊天的字卡 */
    try{
      var p=partner(),pid=String(p.id||''),pool=[];
      (Storage.getSubCards()||[]).forEach(function(x){if(String(x.partnerId)===pid&&x.text)pool.push(x.text);});
      if(!pool.length)(Storage.getCards()||[]).forEach(function(x){if(x.category!=='格言'&&x.text)pool.push(x.text);});
      arr=pool;
    }catch(e){}
  }
  return arr&&arr.length?pick(arr):'';
}
function brief(s){return {id:s.id,name:s.name,artist:s.artist,cover:s.cover};}
function pushChat(m){var c=st.chat.concat([m]).slice(-200);saveJ(CKEY,c);set({chat:c});}
function showBubble(t){set({bubble:t});clearTimeout(showBubble.t);showBubble.t=setTimeout(function(){set({bubble:''});},7000);}
function clearChat(){saveJ(CKEY,[]);set({chat:[]});}
function sendChat(text){
  var s=cur(),sb=s?brief(s):null;
  pushChat({id:'u'+Date.now(),role:'user',text:text,song:sb});
  return new Promise(function(res){
    setTimeout(function(){
      var r=line('chat');
      if(r){pushChat({id:'c'+Date.now(),role:'character',text:r,kind:'chat',song:sb});showBubble(r);}
      res();
    },900+Math.random()*1600);
  });
}
function setAtt(song,attitude){
  var a=st.att.filter(function(x){return !(x.song&&x.song.id===song.id&&x.by==='character');});
  a.push({song:brief(song),by:'character',attitude:attitude,at:Date.now()});
  a=a.slice(-500);saveJ(AKEY,a);set({att:a});
}

/* 随机插话：每首歌一次，掷骰子决定说话 / 表态 / 想切歌 */
var rolled='',rollTimer;
function scheduleRoll(){
  var s=cur();if(!s||rolled===s.id)return;
  rolled=s.id;
  var priorRec=st.att.filter(function(a){return a.song&&a.song.id===s.id&&a.by==='character';})[0];
  var prior=priorRec?priorRec.attitude:'';
  var maxAt=Math.max(12,Math.min(70,(st.dur||120)*.6));
  var delay=(prior==='dislike'?3+Math.random()*5:8+Math.random()*(maxAt-8))*1000;
  clearTimeout(rollTimer);
  rollTimer=setTimeout(function(){
    var c=mcfg;
    if(!cur()||cur().id!==s.id||audio.paused)return;
    var wantText=Math.random()<c.commentChance;
    var wantAtt=Math.random()<c.attitudeChance;
    var wantSkip=prior==='dislike'?Math.random()<.7:prior==='like'?false:Math.random()<c.skipChance;
    if(!wantText&&!wantAtt&&!wantSkip)return;
    var attitude='',text='';
    if(wantAtt&&!prior){attitude=wantSkip?'dislike':(Math.random()<.75?'like':'dislike');setAtt(s,attitude);}
    if(wantSkip)text=line('skip');
    else if(attitude)text=line(attitude==='like'?'praise':'dislike');
    else if(wantText)text=line(prior==='like'?'praise':prior==='dislike'?'dislike':'comment');
    if(text){pushChat({id:'r'+Date.now(),role:'character',text:text,kind:'react',song:brief(s)});showBubble(text);}
    if(attitude==='like'&&prior!=='like'&&local.likeListId){
      addToList(local.likeListId,s,true).then(function(ok){if(ok)say(names().c+' 把《'+s.name+'》加进了「'+(local.likeListName||'他的歌单')+'」');});
    }
    if(wantSkip&&cur()&&cur().id===s.id)setTimeout(function(){if(cur()&&cur().id===s.id)next();},3000);
  },delay);
}

/* ============================================================ 界面 */
function fmt(s){s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}

var root=null, ui=null;
function $(sel){return root?root.querySelector(sel):null;}

function open(){
  if(root){root.style.display='';render();return;}
  injectCss();
  root=document.createElement('div');
  root.className='mu';root.id='rl7-mu';
  root.innerHTML=
    '<header class="mu-top">'+
      '<button type="button" class="mu-ico" data-act="exit" aria-label="返回">'+ic('back',22,1.7)+'</button>'+
      '<span class="mu-title">'+ic('phones',16,1.6)+' Listen Together</span>'+
      '<button type="button" class="mu-ico" data-act="settings" aria-label="音乐设置">'+ic('set',18,1.6)+'</button>'+
    '</header>'+
    '<div class="mu-body">'+
      '<div class="mu-pair wait"></div><div class="mu-join wait"></div>'+
      '<div class="mu-stage"></div>'+
      '<div class="mu-tabs">'+
        '<button type="button" data-tab="rec" class="on">每日推荐</button>'+
        '<button type="button" data-tab="lists">'+ic('list',14)+' 歌单</button>'+
        '<button type="button" data-tab="chat">'+ic('chat',14)+' 聊聊</button>'+
      '</div>'+
      '<div class="mu-lower"></div>'+
    '</div>'+
    '<div class="mu-toast" hidden></div><div class="mu-layer"></div>';
  document.body.appendChild(root);
  ui={tab:'rec',lists:[],openList:null,tracks:[],loadingTracks:false,showLrc:false,busy:false,draft:''};
  bind();
  buildPair();
  subs.push(render);
  posSubs.push(renderPos);
  render();
  if(local.api&&local.cookie){loadLists();loadRec();loadLiked();}
}
function close(){if(root)root.style.display='none';}

/* ---- 头像 + 耳机线（同 Uranus 的 Pair） ---- */
var PAIR_W=260,AV=64,MEET=(PAIR_W-2*AV)/2+3,pairPhase='wait',pairK=0,pairTimer=0,pairRaf=0;
function cablePath(dx,side){
  var pts=[[4+dx,40],[4+dx,64],[30+dx*.85,80],[72+dx*.5,91],[102+dx*.2,99],[122,104],[130,112],[141,124],[126,134],[120,146]]
    .map(function(p){return [side==='r'?PAIR_W-p[0]:p[0],p[1]];});
  function f(p){return p[0].toFixed(1)+' '+p[1];}
  return 'M'+f(pts[0])+' C'+f(pts[1])+' '+f(pts[2])+' '+f(pts[3])+' C'+f(pts[4])+' '+f(pts[5])+' '+f(pts[6])+' C'+f(pts[7])+' '+f(pts[8])+' '+f(pts[9]);
}
function avatarHtml(p,label){
  var img=p&&(p.avatarImage||'');
  return '<div class="mu-av" title="'+esc(label)+'">'+(img?'<img src="'+esc(img)+'" alt="'+esc(label)+'">':'<span>'+esc((label||'?').slice(0,1))+'</span>')+'</div>';
}
function buildPair(){
  var n=names();
  $('.mu-pair').innerHTML=
    '<div class="mu-who l"><div class="mu-say" hidden></div><div class="mu-wait">'+avatarHtml(partner(),n.c||'Ta')+'<span class="mu-dots" aria-hidden="true"><i></i><i></i><i></i></span></div><span class="mu-att" hidden></span></div>'+
    '<div class="mu-who r">'+avatarHtml(me(),n.u||'我')+'<span class="mu-att mine" hidden>'+ic('heart',12,1.7,true)+'</span></div>'+
    '<svg class="mu-cable" viewBox="0 0 '+PAIR_W+' 150" aria-hidden="true"><path class="c1"/><path class="c2"/></svg>';
  pairPhase='wait';pairK=0;drawPair();
  clearTimeout(pairTimer);cancelAnimationFrame(pairRaf);
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  pairTimer=setTimeout(function(){
    if(reduce){pairK=1;pairPhase='joined';drawPair();render();return;}
    pairPhase='meet';
    var t0=performance.now(),D=820;
    (function step(now){
      var t=Math.min(1,(now-t0)/D);
      pairK=t<1?t*t*(3-2*t)*(.85+.15*t):1;
      if(t<1){drawPair();pairRaf=requestAnimationFrame(step);}
      else{pairPhase='joined';drawPair();render();}
    })(t0);
  },2200+Math.random()*1800);
}
function drawPair(){
  var pr=$('.mu-pair');if(!pr)return;
  var dx=pairK*MEET;
  pr.className='mu-pair '+pairPhase;
  pr.querySelector('.mu-who.l').style.transform='translateX('+dx+'px)';
  pr.querySelector('.mu-who.r').style.transform='translateX('+(-dx)+'px)';
  pr.querySelector('.c1').setAttribute('d',cablePath(dx,'l'));
  pr.querySelector('.c2').setAttribute('d',cablePath(dx,'r'));
  var dots=pr.querySelector('.mu-dots');if(dots)dots.hidden=pairPhase!=='wait';
  var who=names().c||'Ta',j=$('.mu-join');
  var want=pairPhase==='joined'?'in':'wait';
  if(j.dataset.k!==want){
    j.dataset.k=want;
    j.className='mu-join '+pairPhase;
    j.innerHTML=pairPhase==='joined'?'<span>'+esc(who)+' 加入和你一起听啦！</span>':'<span>等待 '+esc(who)+' 加入中<span class="mu-ell" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></span>';
  }else j.className='mu-join '+pairPhase;
}

/* ---- 渲染 ---- */
var lastStageKey='',lastLowerKey='';
function render(){
  if(!root||root.style.display==='none')return;
  var song=cur();
  /* 头像上的态度 / 气泡 / 线 */
  var hisRec=song?st.att.filter(function(a){return a.song&&a.song.id===song.id&&a.by==='character';})[0]:null;
  var hisAtt=hisRec?hisRec.attitude:'';
  var iLike=song?st.liked.indexOf(song.id)>=0:false;
  var pr=$('.mu-pair');
  if(pr){
    var sayEl=pr.querySelector('.mu-say'),att=pr.querySelector('.mu-who.l .mu-att'),mine=pr.querySelector('.mu-att.mine');
    var showSay=!!(st.bubble&&pairPhase==='joined');
    if(showSay&&sayEl.textContent!==st.bubble){sayEl.textContent=st.bubble;sayEl.style.animation='none';void sayEl.offsetWidth;sayEl.style.animation='';}
    sayEl.hidden=!showSay;
    att.hidden=!(hisAtt&&pairPhase==='joined');
    if(hisAtt)att.innerHTML=hisAtt==='like'?ic('heart',12,1.7,true):ic('down',12,1.7);
    mine.hidden=!iLike;
    pr.querySelector('.mu-cable').classList.toggle('on',st.playing&&pairPhase==='joined');
  }
  renderStage(song,iLike);
  renderLower(song);
  var t=$('.mu-toast');t.hidden=!st.toast;t.textContent=st.toast;
}
function renderStage(song,iLike){
  var stg=$('.mu-stage');
  var key=song?(song.id+'|'+ui.showLrc+'|'+(song.cover?1:0)):('empty|'+!!local.api+'|'+!!local.cookie);
  if(key!==lastStageKey){
    lastStageKey=key;
    if(!song){
      stg.innerHTML='<div class="mu-empty">'+(!local.api?'先去右上角设置填好音乐 API 地址，再扫码登录。':!local.cookie?'还没登录。去设置里扫码登录网易云。':'从下面挑一首，和 Ta 戴上同一副耳机。')+'</div>';
    }else{
      stg.innerHTML=
        '<button type="button" class="mu-cover'+(ui.showLrc?' lrcon':'')+'" data-act="lrc" aria-label="切换封面和歌词">'+
          (ui.showLrc?'<div class="mu-lrc"></div>':song.cover?'<img src="'+esc(song.cover)+'?param=500y500" alt="">':ic('phones',48,1.2))+
        '</button>'+
        '<div class="mu-name">'+esc(song.name)+'</div><div class="mu-art">'+esc(song.artist)+'</div>'+
        '<div class="mu-line"'+(ui.showLrc?' hidden':'')+'></div>'+
        '<div class="mu-sl2" role="slider" aria-label="播放进度" tabindex="0"><span class="mu-sl2-track"><i></i></span><span class="mu-sl2-thumb"></span></div>'+
        '<div class="mu-time"><span class="a">0:00</span><span class="b">0:00</span></div>'+
        '<div class="mu-ctl">'+
          '<button type="button" class="mu-ico" data-act="menu" aria-label="播放方式和加入歌单">'+ic('menu',20,1.7)+'</button>'+
          '<button type="button" class="mu-ico" data-act="prev" aria-label="上一首">'+ic('prev',22,1.6)+'</button>'+
          '<button type="button" class="mu-play" data-act="toggle"></button>'+
          '<button type="button" class="mu-ico" data-act="next" aria-label="下一首">'+ic('next',22,1.6)+'</button>'+
          '<button type="button" class="mu-ico mu-like" data-act="like"></button>'+
        '</div>';
      makeSlider(stg.querySelector('.mu-sl2'),function(){return st.dur?st.pos/st.dur:0;},function(v){seek(v*(st.dur||0));});
      lastLrcKey='';
    }
  }
  if(!song)return;
  var pb=stg.querySelector('.mu-play');
  var pk=st.playing?'p':'s';
  if(pb.dataset.k!==pk){pb.dataset.k=pk;pb.innerHTML=st.playing?ic('pause',24,1.7,true):ic('play',24,1.7,true);pb.setAttribute('aria-label',st.playing?'暂停':'播放');}
  var lk=stg.querySelector('.mu-like'),lkk=iLike?'1':'0';
  if(lk.dataset.k!==lkk){lk.dataset.k=lkk;lk.classList.toggle('hot',iLike);lk.innerHTML=ic('heart',20,1.6,iLike);lk.setAttribute('aria-label',iLike?'取消喜欢':'喜欢（加入网易云我喜欢的音乐）');}
  renderLrcList();
  renderPos();
}
var lastLrcKey='',lastOn=-2;
function renderLrcList(){
  var box=$('.mu-lrc');if(!box)return;
  var k=(cur()?cur().id:'')+'|'+st.lrc.length;
  if(k!==lastLrcKey){
    lastLrcKey=k;lastOn=-2;
    box.innerHTML=st.lrc.length?st.lrc.map(function(l){return '<p>'+esc(l.s)+'</p>';}).join(''):'<p class="dim">没有歌词</p>';
  }
}
function renderPos(){
  if(!root||root.style.display==='none'||!cur())return;
  var stg=$('.mu-stage');
  var sl=stg.querySelector('.mu-sl2');if(sl&&sl._refresh)sl._refresh();
  var a=stg.querySelector('.mu-time .a'),b=stg.querySelector('.mu-time .b');
  if(a){a.textContent=fmt(st.pos);b.textContent=fmt(st.dur);}
  var k=-1;for(var i=0;i<st.lrc.length;i++)if(st.lrc[i].t<=st.pos+.2)k=i;
  var ln=stg.querySelector('.mu-line');
  if(ln&&!ui.showLrc){var tx=k>=0?st.lrc[k].s:'';if(ln.textContent!==tx)ln.textContent=tx;}
  var box=$('.mu-lrc');
  if(box&&k!==lastOn){
    lastOn=k;
    var ps=box.querySelectorAll('p');ps.forEach(function(p,i){p.classList.toggle('on',i===k);});
    var el=ps[k];
    if(el)box.scrollTo({top:el.offsetTop-box.clientHeight/2+el.clientHeight/2,behavior:'smooth'});
  }
}

function renderLower(song){
  var low=$('.mu-lower');
  root.querySelectorAll('.mu-tabs button').forEach(function(b){b.classList.toggle('on',b.dataset.tab===ui.tab);});
  if(ui.tab==='chat'){
    var ck='chat|'+st.chat.length+'|'+ui.busy;
    if(ck===lastLowerKey)return;
    var first=lastLowerKey.indexOf('chat|')!==0;
    lastLowerKey=ck;
    if(first){
      low.innerHTML='<div class="mu-chat"><div class="mu-msgs"></div>'+
        '<div class="mu-in"><input placeholder="说点什么…" enterkeyhint="send"><button type="button" class="mu-ico" data-act="send" aria-label="发送">'+ic('send',18,1.6)+'</button></div>'+
        '<button type="button" class="mu-link" data-act="clearchat" hidden>清空聊天</button></div>';
      var inp=low.querySelector('.mu-in input');
      inp.value=ui.draft;
      inp.addEventListener('input',function(){ui.draft=inp.value;low.querySelector('[data-act=send]').disabled=ui.busy||!inp.value.trim();});
      inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.isComposing)doSend();});
    }
    var msgs=low.querySelector('.mu-msgs');
    msgs.innerHTML=(st.chat.length?'':'<div class="mu-empty">只聊音乐。想到什么说什么，Ta 也会偶尔自己开口。</div>')+
      st.chat.map(function(m){
        return '<div class="mu-mrow'+(m.role==='user'?' me':'')+'">'+
          (m.song&&m.song.name?'<span class="mu-stag" title="'+esc(m.song.artist?m.song.name+' · '+m.song.artist:m.song.name)+'">♪ '+esc(m.song.name)+'</span>':'')+
          '<div class="mu-msg">'+esc(m.text)+'</div></div>';
      }).join('')+(ui.busy?'<div class="mu-msg dim">…</div>':'')+'<div class="mu-end"></div>';
    var end=msgs.querySelector('.mu-end');if(end&&end.scrollIntoView)end.scrollIntoView({block:'end'});
    low.querySelector('[data-act=send]').disabled=ui.busy||!ui.draft.trim();
    low.querySelector('[data-act=clearchat]').hidden=!st.chat.length;
    return;
  }
  var showList=ui.tab==='lists'&&!ui.openList?ui.lists:null;
  var key=[ui.tab,ui.openList&&ui.openList.id,ui.loadingTracks,ui.tracks.length,ui.tracks[0]&&ui.tracks[0].id,ui.lists.length,song&&song.id,st.liked.length,local.mode,!!local.api,!!local.cookie].join('|');
  if(key===lastLowerKey)return;
  lastLowerKey=key;
  var h='<div class="mu-list">';
  if(ui.tab==='lists'&&ui.openList&&ui.openList.id!=='rec')h+='<button type="button" class="mu-back" data-act="backlist">'+ic('back',15)+' '+esc(ui.openList.name)+'</button>';
  if(showList){
    h+=showList.map(function(pl,i){return '<button type="button" class="mu-row" data-pl="'+i+'"><img src="'+esc(https(pl.coverImgUrl))+'?param=80y80" alt=""><span class="mu-rt"><b>'+esc(pl.name)+'</b><i>'+(pl.trackCount||0)+' 首</i></span></button>';}).join('');
    if(!showList.length)h+='<div class="mu-empty">'+(local.api&&local.cookie?'还没读到歌单':'登录后这里会出现你的歌单')+'</div>';
  }else{
    if(ui.loadingTracks)h+='<div class="mu-empty">加载中…</div>';
    if(!ui.loadingTracks&&ui.tracks.length)h+='<button type="button" class="mu-all" data-act="playall"><span class="mu-all-ico">'+(local.mode==='shuffle'?ic('shuffle',16,1.8):ic('play',16,1.7,true))+'</span><span>'+(local.mode==='shuffle'?'随机播放全部':'播放全部')+'</span><i>'+ui.tracks.length+' 首</i></button>';
    h+=ui.tracks.map(function(t,i){
      return '<button type="button" class="mu-row'+(song&&song.id===t.id?' cur':'')+'" data-tr="'+i+'">'+
        (t.cover?'<img src="'+esc(t.cover)+'?param=80y80" alt="" loading="lazy">':'<span class="mu-ph"></span>')+
        '<span class="mu-rt"><b>'+esc(t.name)+'</b><i>'+esc(t.artist)+'</i></span>'+
        (st.liked.indexOf(t.id)>=0?'<span class="mu-mark">'+ic('heart',13,1.7,true)+'</span>':'')+'</button>';
    }).join('');
    if(!ui.loadingTracks&&!ui.tracks.length)h+='<div class="mu-empty">'+(local.api&&local.cookie?'这里还没有歌':'登录后这里会出现每日推荐和你的歌单')+'</div>';
  }
  low.innerHTML=h+'</div>';
}

/* ---- 列表 ---- */
function loadLists(){
  var uidP=local.uid?Promise.resolve(local.uid):ne('/login/status').then(function(r){var p=(r.data&&r.data.profile)||r.profile;if(!p)throw new Error('登录状态失效了，重新扫码登录一下');setLocal({uid:p.userId,nick:p.nickname});return p.userId;});
  return uidP.then(function(uid){return ne('/user/playlist',{uid:uid,limit:100});}).then(function(d){ui.lists=d.playlist||[];lastLowerKey='';render();}).catch(function(e){say(e.message);});
}
function loadRec(){
  ui.loadingTracks=true;render();
  return ne('/recommend/songs').then(function(d){
    var arr=(d.data&&d.data.dailySongs)||d.recommend||[];
    if(!arr.length)throw new Error(d.msg||d.message||'每日推荐是空的（没登录？）');
    ui.tracks=arr.map(norm);ui.openList={id:'rec',name:'每日推荐'};
  }).catch(function(e){say(e.message);}).then(function(){ui.loadingTracks=false;lastLowerKey='';render();});
}
function openPl(pl){
  ui.openList=pl;ui.loadingTracks=true;ui.tracks=[];render();
  ne('/playlist/track/all',{id:pl.id,limit:200}).then(function(d){ui.tracks=(d.songs||[]).map(norm);})
    .catch(function(e){say(e.message);}).then(function(){ui.loadingTracks=false;lastLowerKey='';render();});
}
function myLists(){return ui.lists.filter(function(pl){return String((pl.creator&&pl.creator.userId)!=null?pl.creator.userId:pl.userId)===String(local.uid);});}
function toTop(){var b=$('.mu-body');if(b)b.scrollTo({top:0,behavior:'smooth'});}
function doSend(){
  var inp=$('.mu-in input');var text=(inp?inp.value:ui.draft).trim();
  if(!text||ui.busy)return;
  ui.draft='';if(inp)inp.value='';
  ui.busy=true;lastLowerKey='';
  sendChat(text).then(function(){ui.busy=false;lastLowerKey='';render();});
}

/* ---- 事件 ---- */
function bind(){
  root.addEventListener('click',function(e){
    var t=e.target.closest('[data-act],[data-tab],[data-pl],[data-tr]');if(!t||!root.contains(t))return;
    if(t.dataset.tab){
      var tab=t.dataset.tab;ui.tab=tab;lastLowerKey='';
      if(tab==='rec'&&(!ui.openList||ui.openList.id!=='rec')&&local.api&&local.cookie)loadRec();
      if(tab==='lists')ui.openList=null;
      render();return;
    }
    if(t.dataset.pl!=null){openPl(ui.lists[+t.dataset.pl]);return;}
    if(t.dataset.tr!=null){play(ui.tracks,+t.dataset.tr);toTop();return;}
    switch(t.dataset.act){
      case 'exit':close();break;
      case 'settings':openSettings();break;
      case 'lrc':ui.showLrc=!ui.showLrc;lastStageKey='';render();break;
      case 'menu':openMenu();break;
      case 'prev':prev();break;
      case 'next':next();break;
      case 'toggle':toggle();break;
      case 'like':toggleLike();break;
      case 'playall':playAll(ui.tracks);toTop();break;
      case 'backlist':ui.openList=null;lastLowerKey='';render();break;
      case 'send':doSend();break;
      case 'clearchat':clearChat();break;
    }
  });
}

/* ---- 滑块（同 Uranus：自己画，指针事件接管拖动） ---- */
function makeSlider(el,getV,onChange,onCommit){
  var drag=null;
  function at(e){var r=el.getBoundingClientRect();return Math.min(1,Math.max(0,(e.clientX-r.left-13)/Math.max(r.width-26,1)));}
  function paint(){
    var v=Math.min(1,Math.max(0,drag!=null?drag:(getV()||0)));
    el.querySelector('.mu-sl2-track i').style.width='calc(13px + (100% - 26px) * '+v+')';
    el.querySelector('.mu-sl2-thumb').style.left='calc(13px + (100% - 26px) * '+v+')';
    el.setAttribute('aria-valuenow',Math.round(v*100));
  }
  el.addEventListener('pointerdown',function(e){try{el.setPointerCapture(e.pointerId);}catch(_){}drag=at(e);paint();});
  el.addEventListener('pointermove',function(e){if(drag!=null){drag=at(e);paint();}});
  el.addEventListener('pointerup',function(e){if(drag==null)return;var x=at(e);drag=null;onChange(x);if(onCommit)onCommit(x);paint();});
  el.addEventListener('pointercancel',function(){drag=null;paint();});
  el.addEventListener('keydown',function(e){
    var d=e.key==='ArrowRight'||e.key==='ArrowUp'?.05:e.key==='ArrowLeft'||e.key==='ArrowDown'?-.05:0;if(!d)return;
    e.preventDefault();var x=Math.min(1,Math.max(0,(getV()||0)+d));onChange(x);if(onCommit)onCommit(x);paint();
  });
  el._refresh=function(){if(drag==null)paint();};
  paint();
}

/* ---- 底部弹层 ---- */
function sheet(html){
  var layer=$('.mu-layer');
  layer.innerHTML='<div class="mu-over"><div class="mu-sheet">'+html+'</div></div>';
  var over=layer.querySelector('.mu-over');
  over.addEventListener('click',function(e){if(e.target===over)closeSheet();});
  over.querySelectorAll('[data-close]').forEach(function(b){b.addEventListener('click',closeSheet);});
  return over.querySelector('.mu-sheet');
}
var qrPoll=0;
function closeSheet(){clearInterval(qrPoll);var l=$('.mu-layer');if(l)l.innerHTML='';}
function sheetHead(t){return '<div class="mu-top" style="padding:0"><b>'+t+'</b><button type="button" class="mu-ico" data-close aria-label="关闭">'+ic('x',18)+'</button></div>';}

function openMenu(){
  var song=cur(),lists=myLists();
  var modes=[['seq','顺序播放','list'],['shuffle','随机播放','shuffle'],['one','单曲循环','one']];
  var mode=local.mode||'seq';
  var sh=sheet(sheetHead('播放方式')+
    modes.map(function(m){return '<button type="button" class="mu-opt'+(mode===m[0]?' on':'')+'" data-mode="'+m[0]+'">'+ic(m[2],18,1.6)+'<span>'+m[1]+'</span>'+(mode===m[0]?ic('check',16):'')+'</button>';}).join('')+
    '<h4>把「'+esc(song?song.name:'这首歌')+'」加入歌单</h4>'+
    (!song?'<p class="mu-hint">先放一首歌。</p>':!lists.length?'<p class="mu-hint">还没读到你自己创建的歌单（要先登录）。</p>':
      lists.map(function(pl){return '<button type="button" class="mu-opt" data-add="'+pl.id+'"><img src="'+esc(https(pl.coverImgUrl))+'?param=60y60" alt="" class="mu-optimg"><span>'+esc(pl.name)+'</span><i>'+(pl.trackCount||0)+' 首</i></button>';}).join('')));
  sh.querySelectorAll('[data-mode]').forEach(function(b){b.addEventListener('click',function(){setMode(b.dataset.mode);lastLowerKey='';openMenu();});});
  sh.querySelectorAll('[data-add]').forEach(function(b){b.addEventListener('click',function(){addToList(b.dataset.add,song).then(function(ok){if(ok)closeSheet();});});});
}

function openSettings(){
  var lists=myLists();
  var sh=sheet(sheetHead('音乐设置')+
    '<h4>音乐 API（网易云，自己部署）</h4>'+
    '<input class="s-url" placeholder="https://你的音乐api.vercel.app" value="'+esc(local.api||'')+'">'+
    '<div class="mu-row2"><button type="button" class="mu-pill s-save">保存地址</button><button type="button" class="mu-pill solid s-qr">扫码登录</button>'+
    (local.cookie?'<button type="button" class="mu-pill s-out">退出登录</button>':'')+'</div>'+
    '<p class="mu-hint">'+(local.cookie?'已登录'+(local.nick?'：'+esc(local.nick):'')+'。':'未登录。')+'地址和登录凭证只保存在这台设备的浏览器里。</p>'+
    '<div class="s-qrbox"></div>'+
    '<h4>Ta 点的爱心放到哪个歌单</h4>'+
    '<select class="s-like"><option value="">不加到网易云（只在这里表达喜欢）</option>'+lists.map(function(pl){return '<option value="'+pl.id+'"'+(String(local.likeListId)===String(pl.id)?' selected':'')+'>'+esc(pl.name)+'</option>';}).join('')+'</select>'+
    '<div class="mu-row2"><input style="flex:1" class="s-new" placeholder="或者新建一个歌单，名字…"><button type="button" class="mu-pill s-create">新建</button></div>'+
    '<p class="mu-hint">Ta 点爱心时，这首歌会被加进上面选的歌单。点踩只在这里显示，不影响网易云；但踩过的歌，Ta 之后更容易想跳过。</p>'+
    '<h4>Ta 多久开口一次（每首歌各掷一次）</h4>'+
    [['commentChance','随口说一句'],['attitudeChance','表态（喜欢 / 不喜欢）'],['skipChance','嫌弃到想切歌']].map(function(c){
      return '<div class="mu-ch" data-k="'+c[0]+'"><div class="mu-ch-h"><span>'+c[1]+'</span><b></b></div><div class="mu-ch-r">'+
        '<button type="button" class="mu-step" data-d="-1" aria-label="'+c[1]+'减少">'+ic('minus',16)+'</button>'+
        '<div class="mu-sl2" role="slider" aria-label="'+c[1]+'" tabindex="0"><span class="mu-sl2-track"><i></i></span><span class="mu-sl2-thumb"></span></div>'+
        '<button type="button" class="mu-step" data-d="1" aria-label="'+c[1]+'增加">'+ic('plus',16)+'</button></div></div>';
    }).join('')+
    '<p class="mu-hint">只有在放歌时才会触发（关掉这个页面、切到后台也算，只要歌还在放）。Ta 说的话从「发现 → 听歌字卡」里抽，概率由这里的数字决定。</p>');
  var url=sh.querySelector('.s-url');
  sh.querySelector('.s-save').addEventListener('click',function(){setLocal({api:url.value.trim().replace(/\/+$/,'')});say('已保存');});
  var out=sh.querySelector('.s-out');if(out)out.addEventListener('click',function(){setLocal({cookie:'',uid:'',nick:''});ui.lists=[];ui.tracks=[];ui.openList=null;lastLowerKey='';openSettings();});
  sh.querySelector('.s-qr').addEventListener('click',function(){qrLogin(url.value,sh.querySelector('.s-qrbox'));});
  sh.querySelector('.s-like').addEventListener('change',function(e){
    var pl=lists.filter(function(x){return String(x.id)===e.target.value;})[0];
    setLocal({likeListId:pl?String(pl.id):'',likeListName:pl?pl.name:''});
  });
  sh.querySelector('.s-create').addEventListener('click',function(){
    var n=sh.querySelector('.s-new').value.trim();if(!n)return;
    createList(n).then(function(pl){
      ui.lists.unshift({id:pl.id,name:pl.name,creator:{userId:local.uid},trackCount:0});
      setLocal({likeListId:String(pl.id),likeListName:pl.name});
      say('已新建「'+pl.name+'」并设为他的歌单');openSettings();
    }).catch(function(e){say(e.message);});
  });
  sh.querySelectorAll('.mu-ch').forEach(function(row){
    var k=row.dataset.k,b=row.querySelector('b');
    function show(){b.textContent=Math.round((mcfg[k]||0)*100)+'%';}
    var sl=row.querySelector('.mu-sl2');
    makeSlider(sl,function(){return mcfg[k]||0;},function(v){saveMcfg((function(o){o[k]=Math.round(v*100)/100;return o;})({}));show();});
    row.querySelectorAll('.mu-step').forEach(function(btn){btn.addEventListener('click',function(){
      var x=Math.min(1,Math.max(0,Math.round((mcfg[k]||0)*20+Number(btn.dataset.d))/20));
      var o={};o[k]=x;saveMcfg(o);show();sl._refresh();
    });});
    show();
  });
}
function qrLogin(rawUrl,box){
  var api=String(rawUrl||'').trim().replace(/\/+$/,'');
  if(!api)return say('先填音乐 API 地址');
  setLocal({api:api});
  clearInterval(qrPoll);
  function msg(t,img){box.innerHTML=img?'<div class="mu-qr"><img src="'+esc(img)+'" alt="登录二维码"><span>'+esc(t)+'</span></div>':(t?'<p class="mu-hint">'+esc(t)+'</p>':'');}
  ne('/login/qr/key',{},{anon:true,api:api}).then(function(k){
    var key=k.data&&k.data.unikey;if(!key)throw new Error('拿不到二维码 key');
    return ne('/login/qr/create',{key:key,qrimg:'true'},{anon:true,api:api}).then(function(c){
      var img=(c.data&&c.data.qrimg)||'';
      msg('用网易云 App 扫码，并在手机上确认',img);
      qrPoll=setInterval(function(){
        ne('/login/qr/check',{key:key},{anon:true,api:api}).then(function(r){
          if(r.code===800){clearInterval(qrPoll);msg('二维码过期了，重新点一次');}
          else if(r.code===802)msg('已扫码，在手机上点确认',img);
          else if(r.code===803){
            clearInterval(qrPoll);
            var raw=String(r.cookie||''),m=raw.match(/MUSIC_U=[^;]+/);
            setLocal({cookie:m?m[0]+';':raw,uid:'',nick:''});
            say('登录成功');closeSheet();
            loadLists();loadRec();loadLiked();
          }
        }).catch(function(){});
      },2000);
    });
  }).catch(function(e){say(e.message);});
}

/* ============================================================ 接入：替换原来的一起听歌入口 */
function openFromMenu(){
  try{if(typeof closePlusMenu==='function')closePlusMenu();}catch(e){}
  try{var ov=document.getElementById('listen-together-overlay');if(ov&&ov.style.display!=='none'&&window.__rl7OldCloseLT)window.__rl7OldCloseLT();}catch(e){}
  if(root){buildPair();lastStageKey='';lastLowerKey='';}
  open();
}
function install(){
  if(window.openListenTogetherPanel&&window.openListenTogetherPanel.__v93)return;
  window.__rl7OldCloseLT=window.closeListenTogetherPanel;
  var f=function(){openFromMenu();};f.__v93=true;
  window.openListenTogetherPanel=f;
}
install();
document.addEventListener('DOMContentLoaded',install);
setTimeout(install,1500);

/* 「听歌字卡」编辑页补上两个新情境：随口说一句、聊聊里的回复 */
function patchCardEditor(){
  var sel=document.getElementById('lt-card-category');if(!sel)return;
  [['comment','TA 随口说一句'],['chat','聊聊里 TA 的回复']].forEach(function(o){
    if(!sel.querySelector('option[value="'+o[0]+'"]')){var op=document.createElement('option');op.value=o[0];op.textContent=o[1];sel.appendChild(op);}
  });
}
var origRender=null;
function hookCards(){
  if(typeof window.ltRenderCards!=='function'||window.ltRenderCards.__v93)return;
  origRender=window.ltRenderCards;
  var w=function(){
    var sel=document.getElementById('lt-card-category'),want=sel&&sel.value;
    origRender.apply(this,arguments);patchCardEditor();
    if(want&&(want==='comment'||want==='chat')){
      sel.value=want;
      var input=document.getElementById('lt-card-lines'),saved=cards();
      if(input)input.value=(Object.prototype.hasOwnProperty.call(saved,want)?saved[want]:DEF[want]).join('\n');
    }
  };
  w.__v93=true;window.ltRenderCards=w;
}
hookCards();setTimeout(hookCards,1500);

window.RL7Music={open:open,close:close,play:play,next:next,prev:prev,toggle:toggle,audio:audio,_state:function(){return st;},_local:function(){return local;}};

/* ============================================================ 样式（照搬 Uranus） */
function injectCss(){
  if(document.getElementById('rl7-mu-css'))return;
  var s=document.createElement('style');s.id='rl7-mu-css';
  s.textContent=[
'.mu{--l:#ffffff2e;--ink:#f5f3f1;--dim:#bdb5b3;--ac:#d6c2a8;position:fixed;inset:0;z-index:2147482000;display:flex;flex-direction:column;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans SC",sans-serif;',
' background:radial-gradient(120% 70% at 20% 0%,#3a3550 0,transparent 60%),radial-gradient(100% 60% at 100% 30%,#2e3a3d 0,transparent 55%),#101117;overflow:hidden;text-shadow:none}',
'.mu *{box-sizing:border-box}',
'.mu button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent;margin:0;box-shadow:none}',
'.mu [hidden]{display:none!important}',
'.mu-top{flex:none;display:flex;align-items:center;justify-content:space-between;gap:4px;padding:calc(6px + env(safe-area-inset-top)) 12px 2px;max-width:520px;width:100%;margin:0 auto}',
'.mu-top b{font-weight:600}',
'.mu-title{flex:1;display:flex;align-items:center;gap:6px;font-family:Georgia,serif;letter-spacing:.08em;font-size:15px}',
'.mu-body{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 16px calc(28px + env(safe-area-inset-bottom));max-width:520px;width:100%;margin:0 auto;-webkit-overflow-scrolling:touch}',
'.mu-ico{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;color:var(--dim)!important}',
'.mu-ico:hover,.mu-ico.hot{color:var(--ac)!important}',
'.mu-ico:disabled{opacity:.4}',
'.mu-pair{position:relative;width:260px;max-width:100%;height:150px;margin:18px auto 0}',
'.mu-who{position:absolute;top:0;width:64px;z-index:1;will-change:transform}',
'.mu-who.l{left:0}.mu-who.r{right:0;z-index:2}',
'.mu-wait{position:relative;transition:filter .7s ease}',
'.mu-pair.wait .mu-wait{filter:grayscale(.85) brightness(.5)}',
'.mu-dots{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:6px}',
'.mu-dots i{width:7px;height:7px;border-radius:50%;background:#f5f3f1;animation:mudot 1.2s ease-in-out infinite}',
'.mu-dots i:nth-child(2){animation-delay:.18s}.mu-dots i:nth-child(3){animation-delay:.36s}',
'@keyframes mudot{0%,70%,100%{opacity:.25;transform:translateY(0)}35%{opacity:1;transform:translateY(-3px)}}',
'.mu-pair.joined .mu-who.l .mu-av{animation:mubumpl .42s cubic-bezier(.3,1.6,.5,1)}',
'.mu-pair.joined .mu-who.r .mu-av{animation:mubumpr .42s cubic-bezier(.3,1.6,.5,1)}',
'@keyframes mubumpl{0%{transform:translateX(3px) scale(.96,1.03)}100%{transform:none}}',
'@keyframes mubumpr{0%{transform:translateX(-3px) scale(.96,1.03)}100%{transform:none}}',
'.mu-pair::after{content:"";position:absolute;left:50%;top:32px;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:var(--ac);opacity:0;pointer-events:none}',
'.mu-pair.joined::after{animation:muspark .7s ease-out}',
'@keyframes muspark{0%{opacity:.75;transform:scale(.4)}100%{opacity:0;transform:scale(7)}}',
'.mu-join{text-align:center;font-size:14px;letter-spacing:.06em;color:var(--dim);min-height:22px;margin:2px 0 6px}',
'.mu-join span{display:inline-block;animation:mujoin .45s ease}',
'.mu-join.joined{color:var(--ink)}',
'@keyframes mujoin{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}',
'.mu-ell i{font-style:normal;animation:muell 1.4s infinite}',
'.mu-ell i:nth-child(2){animation-delay:.2s}.mu-ell i:nth-child(3){animation-delay:.4s}',
'@keyframes muell{0%,100%{opacity:.15}40%{opacity:1}}',
'@media (prefers-reduced-motion:reduce){.mu-dots i,.mu-ell i,.mu-pair.joined::after,.mu-pair.joined .mu-av{animation:none}}',
'.mu-av{width:64px;height:64px;border-radius:50%;overflow:hidden;border:1px solid var(--l);background:#ffffff14;display:grid;place-items:center;font-family:Georgia,serif;font-size:22px;color:var(--ink)}',
'.mu-av img{width:100%;height:100%;object-fit:cover}',
'.mu-att{position:absolute;top:-5px;right:-5px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#101117;border:1px solid var(--ac);color:var(--ac)}',
'.mu-cable{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;color:var(--dim);pointer-events:none;transition:color .4s}',
'.mu-cable path{fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}',
'.mu-cable.on{color:var(--ac)}',
'.mu-cable.on path.c1{animation:mucab 2.4s ease-in-out infinite}',
'.mu-cable.on path.c2{animation:mucab 2.4s ease-in-out -1.2s infinite}',
'@keyframes mucab{0%,100%{transform:translateY(0)}50%{transform:translateY(4px)}}',
'.mu-say{position:absolute;top:100%;left:6px;margin-top:6px;width:max-content;max-width:210px;padding:8px 11px;border-radius:3px 14px 14px 14px;background:#ffffff20;border:1px solid var(--l);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);font-size:13px;line-height:1.45;z-index:2;animation:musay .25s ease}',
'@keyframes musay{from{opacity:0}to{opacity:1}}',
'.mu-stage{display:flex;flex-direction:column;align-items:center;margin-top:8px}',
'.mu-cover{width:min(62vw,230px);aspect-ratio:1;border-radius:18px;overflow:hidden;border:1px solid var(--l)!important;background:#ffffff12!important;display:grid;place-items:center;color:var(--dim)!important;padding:0}',
'.mu-cover img{width:100%;height:100%;object-fit:cover}',
'.mu-lrc{width:100%;height:100%;overflow:auto;padding:40% 14px;text-align:center;scrollbar-width:none;background:#0000008c;position:relative}',
'.mu-lrc p{margin:0 0 10px;font-size:14px;line-height:1.5;color:var(--dim)}',
'.mu-cover.lrcon{width:calc(100% + 32px);margin:0 -16px;aspect-ratio:auto;height:min(62vw,260px);border:0!important;border-radius:0;background:none!important;overflow:visible}',
'.mu-cover.lrcon .mu-lrc{background:none;padding:calc(min(62vw,260px) / 2 - 12px) 16px;-webkit-mask-image:linear-gradient(transparent,#000 18%,#000 82%,transparent);mask-image:linear-gradient(transparent,#000 18%,#000 82%,transparent)}',
'.mu-cover.lrcon .mu-lrc p{font-size:15px}',
'.mu-cover.lrcon .mu-lrc p.on{font-size:17px}',
'.mu-lrc p.on{color:var(--ink);font-size:15.5px}',
'.mu-name{margin-top:12px;font-family:Georgia,serif;font-size:17px;text-align:center}',
'.mu-art{font-size:12.5px;color:var(--dim);margin-top:2px;text-align:center}',
'.mu-line{margin-top:8px;font-size:13px;color:var(--ac);text-align:center;min-height:19px}',
'.mu-time{width:100%;display:flex;justify-content:space-between;font-size:11px;color:var(--dim);margin-top:0}',
'.mu-ctl{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:4px}',
'.mu-play{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:var(--ac)!important;color:#1c1a18!important}',
'.mu-empty{padding:26px 12px;text-align:center;font-size:13px;color:var(--dim);line-height:1.6}',
'.mu-tabs{display:flex;gap:6px;margin:14px 0 8px;border-top:1px solid var(--l);padding-top:10px}',
'.mu-tabs button{display:flex;align-items:center;gap:4px;padding:6px 12px;border-radius:99px;font-size:13px;color:var(--dim)!important;border:1px solid transparent!important}',
'.mu-tabs button.on{color:var(--ink)!important;border-color:var(--l)!important;background:#ffffff14!important}',
'.mu-list{display:flex;flex-direction:column}',
'.mu-row{display:flex;align-items:center;gap:10px;padding:7px 4px;text-align:left;border-radius:10px;width:100%}',
'.mu-row:hover,.mu-row.cur{background:#ffffff12!important}',
'.mu-row img,.mu-ph{width:42px;height:42px;border-radius:8px;object-fit:cover;flex:none;background:#ffffff14}',
'.mu-rt{display:flex;flex-direction:column;min-width:0;flex:1}',
'.mu-rt b{font-weight:400;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}',
'.mu-rt i{font-style:normal;font-size:11.5px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.mu-row.cur .mu-rt b{color:var(--ac)}',
'.mu-mark{color:var(--ac);flex:none;display:grid}',
'.mu-all{display:flex;align-items:center;gap:10px;padding:8px 4px 10px;font-size:14px;color:var(--ink)!important}',
'.mu-all-ico{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--ac);color:#1c1a18}',
'.mu-all i{font-style:normal;font-size:12px;color:var(--dim)}',
'.mu-all:active .mu-all-ico{transform:scale(.94)}',
'.mu-back{display:flex;align-items:center;gap:2px;padding:4px 2px 8px;font-size:13px;color:var(--ac)!important}',
'.mu-chat{display:flex;flex-direction:column;gap:8px}',
'.mu-msgs{display:flex;flex-direction:column;gap:7px;max-height:320px;overflow:auto;padding:2px;overscroll-behavior:contain}',
'.mu-msg{align-self:flex-start;max-width:82%;padding:8px 12px;border-radius:14px 14px 14px 3px;background:#ffffff18;border:1px solid var(--l);font-size:13.5px;line-height:1.5;white-space:pre-wrap;color:var(--ink)}',
'.mu-msg.dim{color:var(--dim)}',
'.mu-mrow{align-self:flex-start;max-width:82%;display:flex;flex-direction:column;align-items:flex-start}',
'.mu-mrow.me{align-self:flex-end;align-items:flex-end}',
'.mu-mrow .mu-msg{max-width:100%;align-self:auto}',
'.mu-mrow.me .mu-msg{border-radius:14px 14px 3px 14px;background:#d6c2a82e}',
'.mu-stag{position:relative;z-index:1;margin:0 10px -6px;max-width:calc(100% - 20px);padding:1px 9px;border-radius:999px;background:#2a2b35;border:1px solid var(--l);color:var(--ac);font-size:11px;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 6px #0004}',
'.mu-in{display:flex;align-items:center;gap:4px;border:1px solid var(--l);border-radius:99px;padding:2px 4px 2px 14px;background:#ffffff0e}',
'.mu-in input{flex:1;background:none!important;border:0!important;outline:none;color:var(--ink)!important;font-size:16px;padding:8px 0;min-width:0;box-shadow:none!important}',
'.mu-link{align-self:center;font-size:12px;color:var(--dim)!important;text-decoration:underline}',
'.mu-toast{position:fixed;left:50%;bottom:calc(30px + env(safe-area-inset-bottom));transform:translateX(-50%);max-width:88vw;padding:9px 16px;border-radius:99px;background:#000000d0;border:1px solid var(--l);font-size:13px;z-index:60;text-align:center;color:var(--ink)}',
'.mu-over{position:fixed;inset:0;background:#000000a0;z-index:50;display:flex;align-items:flex-end;justify-content:center}',
'.mu-sheet{width:100%;max-width:520px;max-height:88vh;overflow:auto;overscroll-behavior:contain;background:#1b1c25;border:1px solid var(--l);border-radius:22px 22px 0 0;padding:14px 16px calc(26px + env(safe-area-inset-bottom));color:var(--ink)}',
'.mu-sheet h4{margin:18px 0 8px;font-family:Georgia,serif;font-weight:400;font-size:13px;color:var(--ac);letter-spacing:.06em}',
'.mu-sheet input,.mu-sheet select{width:100%;margin-bottom:6px;padding:10px 12px;border-radius:12px;border:1px solid var(--l)!important;background:#ffffff10!important;color:var(--ink)!important;font:inherit;font-size:16px;min-width:0;-webkit-appearance:none;appearance:none}',
'.mu-sheet select option{color:#111}',
'.mu-row2{display:flex;gap:6px;flex-wrap:wrap}',
'.mu-row2 select{flex:1}',
'.mu-pill{padding:8px 16px;border-radius:99px;border:1px solid var(--l)!important;font-size:13px}',
'.mu-pill.solid{background:var(--ac)!important;color:#1c1a18!important;border-color:transparent!important}',
'.mu-hint{font-size:12px;color:var(--dim);line-height:1.55;margin:6px 0}',
'.mu-opt{display:flex;align-items:center;gap:12px;width:100%;padding:12px 6px;border-radius:12px;text-align:left;font-size:15px}',
'.mu-opt span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
'.mu-opt i{font-style:normal;font-size:12px;color:var(--dim)}',
'.mu-opt.on{color:var(--ac)!important}',
'.mu-opt:active{background:#ffffff12!important}',
'.mu-optimg{width:36px;height:36px;border-radius:7px;object-fit:cover}',
'.mu-qr{display:flex;flex-direction:column;align-items:center;gap:6px;margin:8px 0}',
'.mu-qr img{width:170px;height:170px;background:#fff;border-radius:10px;padding:6px}',
'.mu-qr span{font-size:12.5px;color:var(--dim)}',
'.mu-sl2{position:relative;flex:1;height:40px;touch-action:none;cursor:pointer;outline:none;user-select:none;-webkit-user-select:none}',
'.mu-stage .mu-sl2{width:100%;flex:none}',
'.mu-sl2-track{position:absolute;left:0;right:0;top:50%;height:6px;margin-top:-3px;border-radius:6px;background:#ffffff33;overflow:hidden}',
'.mu-sl2-track i{display:block;height:100%;background:var(--ac);border-radius:6px}',
'.mu-sl2-thumb{position:absolute;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:var(--ac);border:3px solid #1b1c25;box-shadow:0 0 0 1px #ffffff55,0 3px 10px #0008}',
'.mu-sl2:focus-visible .mu-sl2-thumb{box-shadow:0 0 0 3px #d6c2a888}',
'.mu-ch{margin:6px 0 12px}',
'.mu-ch-h{display:flex;justify-content:space-between;font-size:13px}',
'.mu-ch-h b{color:var(--ac);font-weight:400}',
'.mu-ch-r{display:flex;align-items:center;gap:6px}',
'.mu-ch-r .mu-sl2{margin:0 6px}',
'.mu-step{display:grid;place-items:center;flex:none;width:34px;height:34px;border-radius:50%;border:1px solid var(--l)!important;color:var(--dim)!important}',
'.mu-step:active{background:#ffffff18!important}'
  ].join('\n');
  document.head.appendChild(s);
}
})();
