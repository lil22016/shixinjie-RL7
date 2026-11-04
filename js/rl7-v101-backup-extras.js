/* RL7 V101 — 全量备份补全
 *
 * 原来的全量备份只带：聊天、字卡、表情、mirror_* 设置、消息里的图片、表情包。
 * 后来加的功能有不少数据存在别处，备份时会漏掉。这里补上：
 *   ① 其它 localStorage 键（记账、一起听歌设置/字卡/评分、玻璃主题强度、行踪设置、桌面图标……）
 *   ② 几个图片库：聊天背景、通话背景、手帐照片、自定义提示音、玻璃主题壁纸
 * 导出时写进同一个 JSON（extraLocal / extraIDB），导入时原样写回。
 */
(function(){
'use strict';

/* 不跨设备搬：推送订阅属于这台设备，换个 App 需要重新开启 */
var SKIP_LOCAL=/^(mirror_|rl7WebPushSub$|rl7WebPushOn$|rl7WebPushId$|__)/;
/* 这几个库结构相同：版本 1，一个用外部 key 的存储区 */
var DBS=[
  ['mirror_chat_bg_db','chat_bg'],
  ['mirror_call_bg_db','call_bg'],
  ['mirror_journal_photo_db','journal_photos'],
  ['mirror_sound_file_db','sound_files'],
  ['rl7_liquid_wallpaper_db_v1','wallpaper']
];

function openDb(name,store){
  return new Promise(function(res,rej){
    try{
      var q=indexedDB.open(name,1);
      q.onupgradeneeded=function(){ if(!q.result.objectStoreNames.contains(store)) q.result.createObjectStore(store); };
      q.onsuccess=function(){ res(q.result); };
      q.onerror=function(){ rej(q.error); };
    }catch(e){ rej(e); }
  });
}
function blobToDataUrl(b){
  return new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){res(r.result);}; r.onerror=function(){rej(r.error);}; r.readAsDataURL(b); });
}
function dataUrlToBlob(u){ return fetch(u).then(function(r){ return r.blob(); }); }

function dumpStore(name,store){
  return openDb(name,store).then(function(db){
    return new Promise(function(res){
      var out=[],tx;
      try{ tx=db.transaction(store,'readonly'); }catch(e){ db.close(); return res(out); }
      var cur=tx.objectStore(store).openCursor();
      cur.onsuccess=function(){ var c=cur.result; if(c){ out.push([c.key,c.value]); c.continue(); } };
      tx.oncomplete=function(){ db.close(); res(out); };
      tx.onerror=function(){ db.close(); res(out); };
    });
  }).then(function(rows){
    return Promise.all(rows.map(function(r){
      var v=r[1];
      if(typeof Blob!=='undefined'&&v instanceof Blob){
        return blobToDataUrl(v).then(function(d){ return [r[0],{__rl7blob:1,type:v.type,data:d}]; });
      }
      return [r[0],v];
    }));
  }).catch(function(){ return []; });
}
function writeStore(name,store,rows){
  if(!rows||!rows.length) return Promise.resolve();
  return Promise.all(rows.map(function(r){
    var v=r[1];
    if(v&&v.__rl7blob) return dataUrlToBlob(v.data).then(function(b){ return [r[0],b]; }).catch(function(){ return null; });
    return [r[0],v];
  })).then(function(items){
    return openDb(name,store).then(function(db){
      return new Promise(function(res){
        var tx=db.transaction(store,'readwrite'),os=tx.objectStore(store);
        items.forEach(function(it){ if(it) try{ os.put(it[1],it[0]); }catch(e){} });
        tx.oncomplete=function(){ db.close(); res(); };
        tx.onerror=function(){ db.close(); res(); };
      });
    });
  }).catch(function(){});
}

function collect(){
  var local={};
  try{
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i)||'';
      if(!SKIP_LOCAL.test(k)) local[k]=localStorage.getItem(k);
    }
  }catch(e){}
  return Promise.all(DBS.map(function(d){ return dumpStore(d[0],d[1]); })).then(function(dumps){
    var idb={};
    DBS.forEach(function(d,i){ if(dumps[i].length) idb[d[0]]=dumps[i]; });
    return {local:local,idb:idb};
  });
}
function restore(data){
  if(!data) return Promise.resolve();
  try{
    var L=data.extraLocal;
    if(L&&typeof L==='object') Object.keys(L).forEach(function(k){ if(!SKIP_LOCAL.test(k)&&typeof L[k]==='string') try{ localStorage.setItem(k,L[k]); }catch(e){} });
  }catch(e){}
  var I=data.extraIDB||{};
  return DBS.reduce(function(p,d){
    return p.then(function(){ return writeStore(d[0],d[1],I[d[0]]); });
  },Promise.resolve());
}
function summary(data){
  var n=0,m=0;
  try{ n=Object.keys(data.extraLocal||{}).length; }catch(e){}
  try{ Object.keys(data.extraIDB||{}).forEach(function(k){ m+=(data.extraIDB[k]||[]).length; }); }catch(e){}
  return {local:n,images:m};
}

window.RL7BackupExtras={collect:collect,restore:restore,summary:summary,_dbs:DBS};
})();
