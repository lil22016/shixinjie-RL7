/* RL7 V102 — 全量备份 = 整个网站本机数据的完整复制
 *
 * 以前的全量备份是「按功能挑着备份」：聊天、字卡、表情、设置……
 * 每加一个新功能就可能漏一块（Loki 立绘、镜界数据库、只存在数据库里的设置、各种图片库），
 * 搬家后就会发现有东西没过来。
 *
 * 现在改成整体复制：
 *   - 本机设置（localStorage）里的每一个键；
 *   - 网站在这台设备上的每一个 IndexedDB 数据库：库的版本、每张表的结构（主键、自动编号、索引）、
 *     每一条记录（图片 / 二进制原样保存，不压缩）。
 * 导入时先清空、再按原结构原样写回，然后刷新。以后新增的功能也会自动包含在内。
 *
 * 唯一不复制的：离线推送的订阅（属于这一台设备上的这一个 App，换了需要重新开启）。
 */
(function(){
'use strict';

var SKIP_LOCAL=/^(rl7WebPushSub|rl7WebPushOn|rl7WebPushId)$/;
var SKIP_DB={'rl7-push':1};

/* ---------- 值的序列化（Blob / 二进制 / 日期都能进 JSON，再原样还原） ---------- */
function b64FromBytes(u8){ var s='',CH=0x8000; for(var i=0;i<u8.length;i+=CH)s+=String.fromCharCode.apply(null,u8.subarray(i,i+CH)); return btoa(s); }
function bytesFromB64(b){ var s=atob(b),u=new Uint8Array(s.length); for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i); return u; }
function blobToB64(blob){ return new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){ res(b64FromBytes(new Uint8Array(r.result))); }; r.onerror=function(){ rej(r.error); }; r.readAsArrayBuffer(blob); }); }

function enc(v){
  if(v===null||typeof v!=='object') return Promise.resolve(v);
  if(typeof Blob!=='undefined'&&v instanceof Blob){
    var name=(typeof File!=='undefined'&&v instanceof File)?v.name:null;
    return blobToB64(v).then(function(d){ return {__rl7:'blob',type:v.type,name:name,data:d}; });
  }
  if(v instanceof Date) return Promise.resolve({__rl7:'date',v:v.getTime()});
  if(v instanceof ArrayBuffer) return Promise.resolve({__rl7:'ab',data:b64FromBytes(new Uint8Array(v))});
  if(ArrayBuffer.isView(v)) return Promise.resolve({__rl7:'ta',kind:v.constructor.name,data:b64FromBytes(new Uint8Array(v.buffer,v.byteOffset,v.byteLength))});
  if(Array.isArray(v)) return Promise.all(v.map(enc));
  var keys=Object.keys(v);
  return Promise.all(keys.map(function(k){ return enc(v[k]); })).then(function(vals){ var o={}; keys.forEach(function(k,i){ o[k]=vals[i]; }); return o; });
}
function dec(v){
  if(v===null||typeof v!=='object') return v;
  if(Array.isArray(v)) return v.map(dec);
  if(v.__rl7==='blob'){ var u=bytesFromB64(v.data); return (v.name&&typeof File!=='undefined')?new File([u],v.name,{type:v.type}):new Blob([u],{type:v.type}); }
  if(v.__rl7==='date') return new Date(v.v);
  if(v.__rl7==='ab') return bytesFromB64(v.data).buffer;
  if(v.__rl7==='ta'){ var b=bytesFromB64(v.data),C=window[v.kind]||Uint8Array; return new C(b.buffer,0,b.byteLength/(C.BYTES_PER_ELEMENT||1)); }
  var o={}; Object.keys(v).forEach(function(k){ o[k]=dec(v[k]); }); return o;
}

/* ---------- 找出这台设备上本网站的所有数据库 ---------- */
var KNOWN=['mirror_app_kv_db','mirror_message_db','mirror_chat_image_db','MirrorStickers','mirror_chat_bg_db','mirror_call_bg_db',
  'mirror_journal_photo_db','mirror_sound_file_db','rl7_liquid_wallpaper_db_v1','rl7_companion_art_db_v1','mirror_world_db','mirror_manuals_db'];
function listDbs(){
  if(indexedDB.databases) return indexedDB.databases().then(function(a){ return a.filter(function(d){ return d&&d.name; }).map(function(d){ return {name:d.name,version:d.version}; }); }).catch(function(){ return null; });
  return Promise.resolve(null);
}
function openExisting(name){
  return new Promise(function(res,rej){
    var created=false, q=indexedDB.open(name);
    q.onupgradeneeded=function(){ created=true; };                 /* 不存在的库：不要凭空建出来 */
    q.onsuccess=function(){ var db=q.result; if(created){ db.close(); try{indexedDB.deleteDatabase(name);}catch(e){} res(null);} else res(db); };
    q.onerror=function(){ rej(q.error); };
    q.onblocked=function(){ rej(new Error('数据库被占用：'+name)); };
  });
}

function dumpDb(name){
  return openExisting(name).then(function(db){
    if(!db) return null;
    var out={name:name,version:db.version,stores:[]};
    var names=Array.prototype.slice.call(db.objectStoreNames);
    return names.reduce(function(p,sn){
      return p.then(function(){
        return new Promise(function(res,rej){
          var tx=db.transaction(sn,'readonly'),os=tx.objectStore(sn);
          var st={name:sn,keyPath:os.keyPath,autoIncrement:os.autoIncrement,indexes:[],rows:[]};
          Array.prototype.slice.call(os.indexNames).forEach(function(iname){ var ix=os.index(iname); st.indexes.push({name:iname,keyPath:ix.keyPath,unique:ix.unique,multiEntry:ix.multiEntry}); });
          var raw=[],cur=os.openCursor();
          cur.onsuccess=function(){ var c=cur.result; if(c){ raw.push([c.primaryKey,c.value]); c.continue(); } };
          tx.oncomplete=function(){
            Promise.all(raw.map(function(r){ return Promise.all([enc(r[0]),enc(r[1])]); })).then(function(rows){ st.rows=rows; out.stores.push(st); res(); },rej);
          };
          tx.onerror=function(){ rej(tx.error); };
        });
      });
    },Promise.resolve()).then(function(){ db.close(); return out; },function(e){ db.close(); throw e; });
  });
}

function flushApp(){
  try{ if(window.Storage&&Storage.flushAll) return Promise.resolve(Storage.flushAll()).catch(function(){}); }catch(e){}
  return Promise.resolve();
}

function exportAll(){
  return flushApp().then(listDbs).then(function(list){
    var names=list?list.map(function(d){return d.name;}):KNOWN.slice();
    names=names.filter(function(n){ return !SKIP_DB[n]; });
    var dbs=[];
    return names.reduce(function(p,n){
      return p.then(function(){ return dumpDb(n).then(function(d){ if(d) dbs.push(d); }); });
    },Promise.resolve()).then(function(){
      var local={};
      for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k!=null&&!SKIP_LOCAL.test(k)) local[k]=localStorage.getItem(k); }
      return {format:1,origin:location.origin+location.pathname.replace(/[^/]*$/,''),local:local,dbs:dbs};
    });
  });
}

/* ---------- 还原 ---------- */
function openForRestore(d){
  /* 先看现在的版本和表；只有缺表时才升级，避免和页面里已打开的连接冲突 */
  return new Promise(function(res,rej){
    var probeCreated=false,pq=indexedDB.open(d.name);
    pq.onupgradeneeded=function(){ probeCreated=true; };
    pq.onsuccess=function(){
      var db=pq.result,cur=db.version,have=Array.prototype.slice.call(db.objectStoreNames);
      var missing=d.stores.filter(function(s){ return have.indexOf(s.name)<0; });
      if(!probeCreated&&!missing.length) return res(db);
      db.close();
      var target=probeCreated?Math.max(d.version||1,1):Math.max(cur+1,d.version||1);
      if(probeCreated){ try{ indexedDB.deleteDatabase(d.name); }catch(e){} }
      var q=indexedDB.open(d.name,target),t=setTimeout(function(){ rej(new Error('数据库被占用：'+d.name)); },6000);
      q.onupgradeneeded=function(){
        var udb=q.result;
        d.stores.forEach(function(s){
          if(udb.objectStoreNames.contains(s.name)) return;
          var opt={}; if(s.keyPath!=null) opt.keyPath=s.keyPath; if(s.autoIncrement) opt.autoIncrement=true;
          var os=udb.createObjectStore(s.name,opt);
          (s.indexes||[]).forEach(function(ix){ try{ os.createIndex(ix.name,ix.keyPath,{unique:!!ix.unique,multiEntry:!!ix.multiEntry}); }catch(e){} });
        });
      };
      q.onsuccess=function(){ clearTimeout(t); res(q.result); };
      q.onerror=function(){ clearTimeout(t); rej(q.error); };
      q.onblocked=function(){};
    };
    pq.onerror=function(){ rej(pq.error); };
  });
}
function restoreDb(d){
  return openForRestore(d).then(function(db){
    return d.stores.reduce(function(p,s){
      return p.then(function(){
        return new Promise(function(res,rej){
          var tx=db.transaction(s.name,'readwrite'),os=tx.objectStore(s.name),inline=os.keyPath!=null;
          os.clear();
          s.rows.forEach(function(r){ var k=dec(r[0]),v=dec(r[1]); if(inline) os.put(v); else os.put(v,k); });
          tx.oncomplete=function(){ res(); };
          tx.onerror=function(){ rej(tx.error); };
          tx.onabort=function(){ rej(tx.error||new Error('写入中断：'+d.name+'/'+s.name)); };
        });
      });
    },Promise.resolve()).then(function(){ db.close(); },function(e){ db.close(); throw e; });
  });
}

/* 还原期间冻结网站自己的写入，免得旧内存里的数据在刷新前又写回去 */
function freezeAppWrites(){
  try{
    if(window.Storage){
      ['set','setMessages','setChats','setGroupChats','setCards','setEmojis','setKaomojis','remove','_asyncVerifyFromIDB','syncAllFromIDB','_writeMsgMirror'].forEach(function(m){ if(typeof Storage[m]==='function') Storage[m]=function(){ return Promise.resolve(); }; });
      if(Storage._memCache) Storage._memCache={};
    }
    ['AppKVDB','MessageDB','ChatImageDB','StickerDB'].forEach(function(n){
      var o=window[n]; if(!o) return;
      ['set','put','del','delete','clearAll','setMeta','replaceCategories'].forEach(function(m){ if(typeof o[m]==='function') o[m]=function(){ return Promise.resolve(); }; });
    });
  }catch(e){}
}

function restoreAll(clone){
  if(!clone||!clone.dbs) return Promise.reject(new Error('备份里没有完整数据'));
  return flushApp().then(function(){
    freezeAppWrites();
    /* 本机设置：保留推送订阅，其余全部换成备份里的 */
    var keep={};
    for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(SKIP_LOCAL.test(k)) keep[k]=localStorage.getItem(k); }
    localStorage.clear();
    Object.keys(keep).forEach(function(k){ localStorage.setItem(k,keep[k]); });
    var failed=[];
    Object.keys(clone.local||{}).forEach(function(k){ if(SKIP_LOCAL.test(k)) return; try{ localStorage.setItem(k,clone.local[k]); }catch(e){ failed.push(k); } });
    return clone.dbs.reduce(function(p,d){
      return p.then(function(){ return restoreDb(d).catch(function(e){ failed.push(d.name+'：'+(e&&e.message||e)); }); });
    },Promise.resolve()).then(function(){ return failed; });
  });
}

function summarize(clone){
  var recs=0;
  (clone&&clone.dbs||[]).forEach(function(d){ d.stores.forEach(function(s){ recs+=s.rows.length; }); });
  return {dbs:(clone&&clone.dbs||[]).length,records:recs,localKeys:Object.keys(clone&&clone.local||{}).length};
}

window.RL7FullClone={exportAll:exportAll,restoreAll:restoreAll,summarize:summarize,_enc:enc,_dec:dec,_listDbs:listDbs,_dumpDb:dumpDb};
})();
