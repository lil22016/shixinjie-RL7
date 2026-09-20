/* RL7 V77 — Clear Glass theme.
   Visual source: the user's supplied “eve 气泡 - 清透浅背” stylesheet.
   This is a separate theme, not a recolor of Liquid Glass. */
(function(){'use strict';
if(window.__RL7_CLEAR_GLASS_V77__)return;window.__RL7_CLEAR_GLASS_V77__=1;

const DB='rl7_clear_glass_wallpaper_db_v1', STORE='wallpaper', KEY='home';
let objectUrl='';

function db(){return new Promise((res,rej)=>{try{let q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE)};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)}catch(e){rej(e)}})}
async function getWall(){let d=await db();return new Promise((res,rej)=>{let q=d.transaction(STORE,'readonly').objectStore(STORE).get(KEY);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}
async function setWall(v){let d=await db();return new Promise((res,rej)=>{let q=d.transaction(STORE,'readwrite').objectStore(STORE).put(v,KEY);q.onsuccess=()=>res();q.onerror=()=>rej(q.error)})}
async function delWall(){let d=await db();return new Promise((res,rej)=>{let q=d.transaction(STORE,'readwrite').objectStore(STORE).delete(KEY);q.onsuccess=()=>res();q.onerror=()=>rej(q.error)})}

function layer(){
 let x=document.getElementById('rl7-clear-wallpaper');
 if(!x){x=document.createElement('div');x.id='rl7-clear-wallpaper';x.setAttribute('aria-hidden','true');document.body.insertBefore(x,document.body.firstChild)}
 return x;
}
function active(){return !!(window.ThemeManager&&ThemeManager.currentTheme==='clear-glass')}
function applyClear(){
 document.documentElement.classList.toggle('clear-glass-theme',active());
 layer();
}
async function restore(){
 let b=null;try{b=await getWall()}catch(e){}
 if(objectUrl){try{URL.revokeObjectURL(objectUrl)}catch(e){}objectUrl=''}
 let x=layer();
 if(b instanceof Blob){objectUrl=URL.createObjectURL(b);x.style.backgroundImage='url("'+objectUrl.replace(/"/g,'\\"')+'")';x.classList.add('visible')}
 else{x.style.backgroundImage='none';x.classList.remove('visible')}
}
async function choose(inp){
 let f=inp.files&&inp.files[0];if(!f)return;
 if(f.size>12*1024*1024){if(window.Core)Core.toast('壁纸请控制在 12 MB 以内');inp.value='';return}
 try{await setWall(f);await restore();if(window.Core)Core.toast('清透浅背壁纸已保存')}catch(e){if(window.Core)Core.toast('壁纸保存失败')}
 inp.value='';
}
async function clearWall(){try{await delWall()}catch(e){}await restore();if(window.Core)Core.toast('清透浅背壁纸已清除')}

function controls(){
 let c=document.getElementById('theme-selector-container')||document.querySelector('.theme-grid');
 if(!c)return;
 let host=c.parentElement||c;
 if(document.getElementById('rl7-clear-controls'))return;
 let d=document.createElement('div');d.id='rl7-clear-controls';d.className='rl7-clear-controls';
 d.innerHTML='<h4>清透浅背</h4><div class="rl7-clear-actions"><button id="rl7-clear-pick">更换主页壁纸</button><button id="rl7-clear-remove">清除壁纸</button></div><input id="rl7-clear-file" type="file" accept="image/*" hidden><div class="rl7-clear-note">独立壁纸；清透浅背使用文档中的浅色透明玻璃、白色细边与内高光，不与 Liquid Glass 共用视觉参数。</div>';
 host.appendChild(d);
 d.querySelector('#rl7-clear-pick').onclick=()=>d.querySelector('#rl7-clear-file').click();
 d.querySelector('#rl7-clear-file').onchange=function(){choose(this)};
 d.querySelector('#rl7-clear-remove').onclick=clearWall;
}
function install(){
 if(!window.ThemeManager||!window.Storage)return false;
 if(!ThemeManager.themes.some(t=>t.id==='clear-glass'))ThemeManager.themes.push({id:'clear-glass',name:'清透浅背',color:'#EEF2F4'});
 if(!ThemeManager.__clearGlass77){
  ThemeManager.__clearGlass77=1;
  let oldApply=ThemeManager.apply.bind(ThemeManager);
  ThemeManager.apply=function(persist=true){let r=oldApply(persist);applyClear();return r};
  let oldRender=ThemeManager.renderThemeSelector.bind(ThemeManager);
  ThemeManager.renderThemeSelector=function(c){let r=oldRender(c);setTimeout(controls,0);return r};
  let oldGet=ThemeManager.getCurrent.bind(ThemeManager);
  ThemeManager.getCurrent=function(){if(this.currentTheme==='clear-glass')return{id:'clear-glass',name:'清透浅背',color:'#EEF2F4'};return oldGet()};
 }
 try{
  let saved=Storage.get('theme','default');
  if(saved==='clear-glass'&&ThemeManager.currentTheme!=='clear-glass'){ThemeManager.currentTheme='clear-glass';ThemeManager.apply(false)}
 }catch(e){}
 applyClear();controls();restore();return true;
}
function boot(){let n=0,t=setInterval(()=>{if(install()||++n>60)clearInterval(t)},120)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();