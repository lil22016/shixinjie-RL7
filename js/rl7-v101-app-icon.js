/* RL7 V101 — 自定义桌面图标
 *
 * iPhone 把网页「添加到主屏幕」时，读的是页面里的 <link rel="apple-touch-icon">。
 * 这里让你在「外观设置」里上传一张图，裁成正方形 180×180 PNG 存在本机，
 * 每次打开网站都把它设成 apple-touch-icon。
 *
 * 注意：主屏幕上已经存在的图标不会自动变，要「删掉旧图标 → 重新添加到主屏幕」才会换。
 * 删掉旧图标会一起删掉它里面的数据，所以要先导出全量备份（页面上有引导）。
 */
(function(){
'use strict';
var KEY='rl7.appIcon.v1';
var DEFAULT='icons/apple-touch-icon.png?v=20261104';
/* V103：存进 IndexedDB（本机设置区 localStorage 常被聊天副本占满，存不下图片） */
var IDB='rl7_app_icon_db',STORE='icon',cached='';
function idb(){ return new Promise(function(res,rej){ var q=indexedDB.open(IDB,1); q.onupgradeneeded=function(){ if(!q.result.objectStoreNames.contains(STORE)) q.result.createObjectStore(STORE); }; q.onsuccess=function(){ res(q.result); }; q.onerror=function(){ rej(q.error); }; }); }
function idbGet(){ return idb().then(function(d){ return new Promise(function(res){ var r=d.transaction(STORE).objectStore(STORE).get('icon'); r.onsuccess=function(){ d.close(); res(r.result||''); }; r.onerror=function(){ d.close(); res(''); }; }); }).catch(function(){ return ''; }); }
function idbSet(v){ return idb().then(function(d){ return new Promise(function(res,rej){ var t=d.transaction(STORE,'readwrite'); v?t.objectStore(STORE).put(v,'icon'):t.objectStore(STORE).delete('icon'); t.oncomplete=function(){ d.close(); res(); }; t.onerror=function(){ d.close(); rej(t.error); }; }); }); }

function get(){ if(cached) return cached; try{ return localStorage.getItem(KEY)||''; }catch(e){ return ''; } }
function apply(){
  var href=get()||DEFAULT;
  var links=document.querySelectorAll('link[rel="apple-touch-icon"]');
  if(!links.length){ var l=document.createElement('link'); l.rel='apple-touch-icon'; document.head.appendChild(l); links=[l]; }
  links.forEach(function(l){ l.href=href; l.setAttribute('sizes','180x180'); });
}

/* 居中裁成正方形，透明的地方垫黑底（iOS 会把透明处显示成黑色，提前处理更可控） */
function toIcon(file){
  return new Promise(function(res,rej){
    var url=URL.createObjectURL(file),img=new Image();
    img.onload=function(){
      var s=Math.min(img.naturalWidth,img.naturalHeight),c=document.createElement('canvas');
      c.width=c.height=180;
      var g=c.getContext('2d');
      g.fillStyle='#000';g.fillRect(0,0,180,180);
      g.imageSmoothingQuality='high';
      g.drawImage(img,(img.naturalWidth-s)/2,(img.naturalHeight-s)/2,s,s,0,0,180,180);
      URL.revokeObjectURL(url);
      try{ res(c.toDataURL('image/png')); }catch(e){ rej(e); }
    };
    img.onerror=function(){ URL.revokeObjectURL(url); rej(new Error('这张图片读不出来，换一张试试')); };
    img.src=url;
  });
}
function toast(t){ try{ Core.toast(t); }catch(e){} }

function render(){
  var box=document.getElementById('rl7-appicon-box');if(!box)return;
  var cur=get();
  box.querySelector('.rl7-appicon-img').src=cur||DEFAULT;
  box.querySelector('.rl7-appicon-reset').style.display=cur?'':'none';
}
function inject(){
  if(document.getElementById('rl7-appicon-box'))return true;
  var anchor=document.querySelector('#page-appearance .custom-theme-box');if(!anchor)return false;
  var t=document.createElement('div');t.className='section-title';t.style.marginTop='20px';t.textContent='桌面图标';
  var box=document.createElement('div');box.className='custom-theme-box';box.id='rl7-appicon-box';
  box.innerHTML=
    '<div style="display:flex;align-items:center;gap:14px">'+
      '<img class="rl7-appicon-img" alt="当前桌面图标" style="width:64px;height:64px;border-radius:15px;object-fit:cover;flex:none;box-shadow:0 2px 8px rgba(0,0,0,.25)">'+
      '<div style="font-size:.8rem;line-height:1.55;opacity:.8">上传一张图片作为添加到主屏幕时的图标（会自动裁成正方形）。</div>'+
    '</div>'+
    '<div class="custom-theme-actions" style="margin-top:12px">'+
      '<button class="custom-theme-btn rl7-appicon-pick"><i class="fas fa-image"></i> 上传图标</button>'+
      '<button class="custom-theme-btn custom-theme-reset rl7-appicon-reset">恢复默认</button>'+
    '</div>'+
    '<div class="rl7-appicon-help" style="margin-top:12px;font-size:.78rem;line-height:1.65;opacity:.85">'+
      '<b>主屏上的旧图标不会自动变</b>，需要删掉重新添加。iPhone 删掉主屏图标时会把里面的数据一起删掉，所以请按顺序：<br>'+
      '① 设置 → 数据管理 → <b>全量备份导出</b>，存到「文件」里<br>'+
      '② 删除主屏上的旧图标<br>'+
      '③ 用 Safari 打开网站 → 分享 → 添加到主屏幕（会用上面的新图标）<br>'+
      '④ 从新图标打开 → 设置 → 数据管理 → <b>全量备份导入</b><br>'+
      '⑤ 如果用了离线推送，到聊天设置里重新打开一次'+
    '</div>'+
    '<input type="file" accept="image/*" hidden class="rl7-appicon-file">';
  anchor.parentNode.insertBefore(t,anchor.nextSibling);
  t.parentNode.insertBefore(box,t.nextSibling);
  var file=box.querySelector('.rl7-appicon-file');
  box.querySelector('.rl7-appicon-pick').onclick=function(){ file.click(); };
  file.onchange=function(){
    var f=file.files&&file.files[0];file.value='';if(!f)return;
    toIcon(f).then(function(d){
      return idbSet(d).then(function(){
        cached=d; try{ localStorage.removeItem(KEY); }catch(e){}
        apply();render();toast('图标已更新，重新添加到主屏幕后生效');
      });
    }).catch(function(e){ toast(e.message||'处理图片失败'); });
  };
  box.querySelector('.rl7-appicon-reset').onclick=function(){
    try{ localStorage.removeItem(KEY); }catch(e){}
    cached=''; idbSet('').catch(function(){}).then(function(){ apply();render();toast('已恢复默认图标'); });
  };
  render();
  return true;
}

apply();
idbGet().then(function(v){ if(v){ cached=v; apply(); render(); } });
function init(){ apply(); inject(); }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
setTimeout(init,1500);
document.addEventListener('click',function(e){
  var t=e.target.closest&&e.target.closest('[onclick*="appearance"]');
  if(t)setTimeout(function(){ inject();render(); },300);
},true);
window.RL7AppIcon={apply:apply,get:get};
})();
