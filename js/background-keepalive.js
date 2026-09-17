/* RL7 Background Keepalive v24 — Mochi coexistence port
 * Core change: foreground media gets absolute priority. Keepalive never fights
 * a playing <audio>/<video>, and retries use exponential backoff instead of
 * repeated 3–4 second audio-focus grabs.
 */
(function(global){
'use strict';
global.createBackgroundKeepAlive=function(options){
 const opts=options||{};
 let enabled=false,audio=null,source='',retry=null,heartbeat=null,delay=5000,pauseStreak=0,lastPlayAt=0;
 const maxDelay=60000;
 function isOwn(el){return !!el&&el.id==='rl7-background-keepalive-audio'}
 function foregroundMediaPlaying(){
   try{
     if(global.__musicPlaying) return true;
     const list=document.querySelectorAll('audio,video');
     for(const el of list){
       if(isOwn(el)) continue;
       if(!el.paused&&!el.ended&&el.readyState>=2) return true;
     }
   }catch(e){}
   return false;
 }
 function report(error){try{opts.onStatus&&opts.onStatus({enabled,playing:!!audio&&!audio.paused&&!audio.ended,error:error?String(error.message||error):null})}catch(e){}}
 function makeWav(){
   const rate=22050,seconds=2,samples=rate*seconds,b=new ArrayBuffer(44+samples*2),v=new DataView(b);
   const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
   w(0,'RIFF');v.setUint32(4,36+samples*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,samples*2,true);
   for(let i=0;i<samples;i++){const fade=Math.min(1,i/800,(samples-i)/800);v.setInt16(44+i*2,Math.round(Math.sin(2*Math.PI*180*i/rate)*0.0015*fade*32767),true)}
   return URL.createObjectURL(new Blob([b],{type:'audio/wav'}));
 }
 function setKeepMediaSession(){
   if(!enabled||foregroundMediaPlaying()||opts.manageMediaSession===false||!navigator.mediaSession)return;
   try{
     if(global.MediaMetadata)navigator.mediaSession.metadata=new MediaMetadata({title:opts.title||'Background keepalive',artist:opts.artist||'拾心界',album:''});
     navigator.mediaSession.playbackState='playing';
   }catch(e){}
 }
 function makeAudio(){
   source=makeWav();audio=document.createElement('audio');audio.id='rl7-background-keepalive-audio';audio.loop=true;audio.volume=.05;audio.preload='auto';audio.setAttribute('playsinline','');audio.src=source;
   audio.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';document.body.appendChild(audio);
   audio.addEventListener('play',()=>{lastPlayAt=Date.now();delay=5000;report()});
   audio.addEventListener('pause',()=>{if(enabled&&!foregroundMediaPlaying())schedule(true);report()});
 }
 function stopRetry(){clearTimeout(retry);retry=null}
 function schedule(interrupted){
   if(!enabled||retry||foregroundMediaPlaying())return;
   if(interrupted){pauseStreak++;delay=Math.min(5000*Math.pow(2,Math.min(pauseStreak-1,4)),maxDelay)}
   retry=setTimeout(()=>{retry=null;play()},delay);
 }
 async function play(){
   if(!enabled)return false;
   if(foregroundMediaPlaying()){if(audio&&!audio.paused)audio.pause();stopRetry();return false}
   if(!audio)makeAudio();
   try{await audio.play();lastPlayAt=Date.now();setKeepMediaSession();report();return true}
   catch(e){report(e);schedule(true);return false}
 }
 function syncForMedia(){
   if(!enabled||!audio)return;
   if(foregroundMediaPlaying()){stopRetry();if(!audio.paused)audio.pause();return}
   if(audio.paused){pauseStreak=0;delay=5000;play()}else setKeepMediaSession();
 }
 function mediaEvent(e){if(isOwn(e.target))return;setTimeout(syncForMedia,0)}
 function heal(){if(!enabled)return;if(foregroundMediaPlaying())return syncForMedia();if(audio&&audio.paused)play();else setKeepMediaSession()}
 async function enable(){
   if(enabled)return play();enabled=true;if(!audio)makeAudio();
   document.addEventListener('play',mediaEvent,true);document.addEventListener('pause',mediaEvent,true);document.addEventListener('ended',mediaEvent,true);
   document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')heal()});
   global.addEventListener('pageshow',heal);global.addEventListener('focus',heal);
   heartbeat=setInterval(()=>{
     if(!enabled||!audio)return;
     if(foregroundMediaPlaying()){if(!audio.paused)audio.pause();return}
     if(!audio.paused){if(pauseStreak&&Date.now()-lastPlayAt>45000)pauseStreak=0;setKeepMediaSession()}
     else schedule(false);
   },5000);
   return play();
 }
 function disable(){
   enabled=false;stopRetry();clearInterval(heartbeat);heartbeat=null;
   document.removeEventListener('play',mediaEvent,true);document.removeEventListener('pause',mediaEvent,true);document.removeEventListener('ended',mediaEvent,true);
   global.removeEventListener('pageshow',heal);global.removeEventListener('focus',heal);
   if(audio){audio.pause();audio.removeAttribute('src');try{audio.load()}catch(e){};audio.remove();audio=null}
   if(source)URL.revokeObjectURL(source);source='';
   try{if(navigator.mediaSession&&!foregroundMediaPlaying()){navigator.mediaSession.playbackState='none';navigator.mediaSession.metadata=null}}catch(e){}
   report();
 }
 return{enable,disable,resume:play,get enabled(){return enabled},get playing(){return!!audio&&!audio.paused&&!audio.ended}};
};
})(window);
