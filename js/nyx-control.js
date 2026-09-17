(() => {
'use strict';
const SERVICE_UUID='78667579-7b48-43db-b8c5-7928a6b0a335',TX_UUID='78667579-a914-49a4-8333-aa3c0cd8fedc';
let device=null,characteristic=null,randomTimer=null,current=0;
const $=id=>document.getElementById(id), slider=$('intensitySlider'), readout=$('intensityValue'), logEl=$('activityLog');
let speechTimer=null,lastSpeechAt=0;
function speech(text){if(!text)return;let el=document.getElementById('nyxSpeech');if(!el){el=document.createElement('div');el.id='nyxSpeech';el.className='nyx-speech';document.body.appendChild(el)}el.textContent=text;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(speechTimer);let ms=Math.max(4200,Math.min(9000,2200+text.length*75));speechTimer=setTimeout(()=>el.classList.remove('show'),ms);lastSpeechAt=Date.now()}
function card(key){return window.NyxCards&&NyxCards.get?NyxCards.get(key):''}
function intensityCard(v){return window.NyxCards&&NyxCards.keyForIntensity?card(NyxCards.keyForIntensity(v)):''}
const pick=a=>a[Math.floor(Math.random()*a.length)];
const lines={
upSuccess:["Fine. Since you're asking so nicely.","Greedy thing. I’ll allow it.","You wanted more. Don’t complain now.","Mm. That’s more like it."],
upFail:["No. You don’t get to rush me.","Cute attempt. My turn.","Did you really think I’d let you decide that?","Impatient. I noticed."],
downSuccess:["I suppose I can be merciful. Briefly.","Fine. Catch your breath.","There. Don’t get used to my generosity.","I’ll let you have that one."],
downFail:["Not yet.","Trying to escape my settings? Adorable.","No, darling. Stay exactly where I put you.","You can ask. I never said I had to listen."],
stopSuccess:["Fine. We’re done—for now.","Mercy granted. Try not to look too relieved.","All right. I’ll stop."],
stopFail:["Oh, absolutely not.","Nice try. I’m not finished.","You said stop. I heard you. I simply disagree."]
};
function stamp(){return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function addLog(text,cls=''){let d=document.createElement('div');d.className='log-entry '+cls;d.innerHTML='<span class="log-time">'+stamp()+'</span>'+text;logEl.prepend(d);}
function setUI(v){current=v;slider.value=v;readout.textContent=v;}
function build(v){v=Math.max(0,Math.min(100,Math.round(+v||0)));return new Uint8Array([0x10,0xff,0x04,0x0a,0x32,0x32,0x00,0x04,0x08,v,0x64,0x00,0x04,0x08,v,0x64,0x01]);}
async function rawWrite(v){if(!characteristic)throw Error('Nyx is not connected');let data=build(v);if(typeof characteristic.writeValueWithoutResponse==='function')await characteristic.writeValueWithoutResponse(data);else await characteristic.writeValue(data);setUI(v);}
function setConnected(on){$('statusDot').classList.toggle('connected',on);$('connectionText').textContent=on?(device?.name||'Connected'):'Offline';$('connectBtn').textContent=on?'Connected':'Connect Nyx';}
async function connect(){if(!navigator.bluetooth){$('browserWarning').classList.remove('hidden');return;}try{$('connectBtn').disabled=true;$('connectBtn').textContent='Connecting…';device=await navigator.bluetooth.requestDevice({filters:[{namePrefix:'nyx'}],optionalServices:[SERVICE_UUID]});device.addEventListener('gattserverdisconnected',()=>{characteristic=null;clearTimeout(randomTimer);setConnected(false);addLog('Nyx disconnected.','fail');});let s=await device.gatt.connect(),svc=await s.getPrimaryService(SERVICE_UUID);characteristic=await svc.getCharacteristic(TX_UUID);setConnected(true);addLog('Nyx connected. Loki has the controls.','loki');startLokiControl();}catch(e){setConnected(false);addLog('Connection failed: '+(e.message||e),'fail');}finally{$('connectBtn').disabled=false;}}
function weighted(){let r=Math.random(),a,b;if(r<.20)[a,b]=[0,20];else if(r<.55)[a,b]=[21,50];else if(r<.85)[a,b]=[51,80];else[a,b]=[81,100];return Math.floor(Math.random()*(b-a+1))+a;}
function delay(){return 2600+Math.floor(Math.random()*6001);}
async function lokiMove(){if(!characteristic)return;let v=weighted();try{await rawWrite(v);addLog('Loki turned the intensity to <b>'+v+'%</b>.','loki');if(Date.now()-lastSpeechAt>22000)speech(intensityCard(v));}catch(e){addLog('Loki tried to change the intensity. Device write failed.','fail');return;}randomTimer=setTimeout(lokiMove,delay());}
function startLokiControl(){clearTimeout(randomTimer);randomTimer=setTimeout(lokiMove,900);}
function allowAttempt(from,to){let dir=to===0?'stop':to>from?'up':'down';let successChance=dir==='up'?.64:dir==='down'?.48:.32;return {dir,ok:Math.random()<successChance};}
async function userAttempt(target){target=Math.max(0,Math.min(100,Math.round(+target||0)));if(!characteristic){setUI(current);addLog('Raylee tried to change the intensity, but Nyx is not connected.','fail');return;}let from=current;if(target===from)return;clearTimeout(randomTimer);let a=allowAttempt(from,target);addLog('Raylee tried to turn the intensity to <b>'+target+'%</b>.');if(!a.ok){setUI(from);let key=a.dir==='up'?'upFail':a.dir==='down'?'downFail':'stopFail';let say=card('fail-'+a.dir)||pick(lines[key]);addLog('“'+say+'” — Loki','loki fail');speech(say);randomTimer=setTimeout(lokiMove,delay());return;}try{await rawWrite(target);let key=a.dir==='up'?'upSuccess':a.dir==='down'?'downSuccess':'stopSuccess';addLog('Loki allowed it. Intensity changed to <b>'+target+'%</b>.','loki');let say=card('success-'+a.dir)||pick(lines[key]);addLog('“'+say+'” — Loki','loki');speech(say);}catch(e){setUI(from);addLog('Change failed at the device.','fail');}randomTimer=setTimeout(lokiMove,delay());}
$('connectBtn').addEventListener('click',connect);
slider.addEventListener('input',()=>{readout.textContent=slider.value;});
slider.addEventListener('change',()=>userAttempt(slider.value));
document.querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',()=>userAttempt(b.dataset.level)));
window.addEventListener('pagehide',()=>clearTimeout(randomTimer));
addLog('Private Frequency ready. Waiting for Nyx.');
if(!navigator.bluetooth)$('browserWarning').classList.remove('hidden');
})();
setInterval(()=>{if(characteristic&&Date.now()-lastSpeechAt>28000)speech(intensityCard(current));},30000);
