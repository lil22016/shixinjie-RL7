/* ============================================================
   拾心界 · 一起听歌
   —— 加号菜单新功能（仅使用网易云音乐，与其它平台无关）
   通过本地音乐服务（music-server，借鉴 eryu 的网易云代理思路）
   导入网易云歌单并播放；开启「和 TA 一起听」后，对方角色会跟着听，
   并会在播放中途主动切歌 / 暂停 / 点评，动作以聊天消息呈现。

   界面分两个视图，避免拥挤：
     ① 歌单界面（lt-view-playlist）：
        服务状态 + 我的歌单/搜索 Tab + 列表；底部吸底迷你播放条
     ② 播放界面（lt-view-player）：
        大封面 + 歌名/歌手 + 进度 + 控制 + 和 TA 一起听开关

   依赖（两种数据源自动切换，GitHub Pages 静态部署无需启动任何服务）：
     - 本地音乐服务: http://127.0.0.1:9801（双击 music-server/start.command 启动，
       功能最全：高音质 / VIP 需登录歌曲）
     - 在线兜底（未启动本地服务或静态部署时自动启用）：
         搜索 -> cors.eu.org 代理网易云公开搜索接口
         歌单导入 -> injahow meting 公共接口
         播放 -> 网易云官方公开直链 outer/url?id=xxx.mp3
     - 站点现有接口: _currentChatId / Storage.getMessages / Storage.setMessages /
                    updateLastMsg / _safeAppendMessage / App.playSound / showBackgroundPush
   ============================================================ */
(function () {
  'use strict';

  var LT = {
    SERVICE: 'http://127.0.0.1:9801',
    AUTH_SERVICE: 'https://rl7-music.onrender.com', // 部署后替换成 Render 地址（无结尾斜杠）
    authToken: localStorage.getItem('lt_auth_token') || '',
    authReady: false,
    qrTimer: null,
    KEY_PL: 'lt_playlists',
    playlists: [],
    queue: [],
    index: -1,
    mode: 'sequential',   // 'sequential' | 'loop' | 'shuffle'
    _curPlaylistId: null, // 当前队列所属歌单 id（用于记忆上次播放位置）
    together: false,
    roomActive: false,
    presenceChangedAt: 0,
    leaving: false,
    _departureTimer: null,
    _bubbleTimer: null,
    playing: false,
    serviceOk: false,
    srcMode: 'unknown',   // 数据源：'local' 本地音乐服务 | 'online' 在线兜底（GitHub 静态部署无需任何后台）
    view: 'playlist',     // 'playlist' | 'player'
    audio: null,
    _chatId: null,
    _timer: null,
    _talkTimer: null,
    _lastPartnerMsgAt: 0,
    _lastAction: '',
    _opening: false,
    searchList: [],
    log: [],
    sessionStarted: false,
    loggedTrack: '',
  };

  /* ---------- 通用工具 ---------- */
  function $(id) { return document.getElementById(id); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmtDur(ms) {
    if (!ms || !isFinite(ms) || ms <= 0) return '';
    return fmtTime(ms / 1000);
  }
  function safeCover(url) {
    if (!url) return '';
    return String(url).replace(/^http:\/\//, 'https://');
  }
  /** VIP / 付费歌曲判定（网易云 fee 字段）：1=单曲付费，4=专辑付费；
      无 fee / 0 / 其它值视为免费，正常保留。用于导入阶段的"即要即滤"。 */
  function _isPaidSong(s) {
    if (!s) return false;
    if (typeof s.fee === 'number') return s.fee === 1 || s.fee === 4;
    if (s.fee !== undefined && s.fee !== null && s.fee !== '') {
      var n = Number(s.fee);
      if (!isNaN(n)) return n === 1 || n === 4;
    }
    return false;
  }

  /* ---------- 视图切换（歌单界面 / 播放界面） ---------- */
  function ltShowView(view) {
    LT.view = view;
    var pl = $('lt-view-playlist'), py = $('lt-view-player');
    if (pl) pl.style.display = view === 'playlist' ? '' : 'none';
    if (py) py.style.display = view === 'player' ? '' : 'none';
  }
  window.ltGoPlayer = function () { ltShowView('player'); };
  window.ltGoPlaylist = function () { ltShowView('playlist'); };

  /* ---------- 对外入口 ---------- */
  window.openListenTogetherPanel = function () {
    var ov = $('listen-together-overlay');
    if (!ov) return;
    ov.style.display = 'flex';
    LT._opening = true;
    closePlusMenu && closePlusMenu();
    if (!LT.roomActive) LT._chatId = (typeof _currentChatId === 'function') ? _currentChatId() : null;
    try { LT.playlists = Storage.get(LT.KEY_PL, []) || []; } catch (e) { LT.playlists = []; }
    ltShowView('playlist');
    ltRenderPlaylists();
    ltInitAuth();
    renderMiniBar();
    renderLog();
    _syncVolumeUI();
    renderModeBtn();
    _detectService();
    _startRoom();
    renderRatings();
  };

  window.closeListenTogetherPanel = function () {
    var ov = $('listen-together-overlay');
    if (ov) ov.style.display = 'none';
    LT._opening = false;
    if (!LT.sessionStarted) _endRoom();
    renderFloat();
  };

  /* ---------- 在线兜底（数据源 = 公共在线接口，GitHub 部署 / 未启动本地服务时自动启用） ---------- */
  // 网易云官方公开直链：浏览器可直接播放，不需要任何后端服务
  function _outerUrl(id) {
    return 'https://music.163.com/song/media/outer/url?id=' + id + '.mp3';
  }

  // 在线数据源候选（返回完整请求 URL；依次尝试，首个成功即用）
  var ONLINE = {
    search: [
      // 经免费 CORS 代理访问网易云搜索明文 JSON（跨域头已开放给浏览器）
      function (q) {
        var target = 'https://music.163.com/api/search/get?s=' + encodeURIComponent(q) + '&type=1&limit=20';
        return 'https://cors.eu.org/' + encodeURIComponent(target);
      }
    ],
    playlist: [
      // injahow meting 歌单（带 CORS，返回歌单歌曲列表）
      function (id) {
        return 'https://api.injahow.cn/meting/?server=netease&type=playlist&id=' + encodeURIComponent(id);
      }
    ]
  };

  /** fetch JSON 并带超时（防止第三方接口挂起） */
  function _getJSON(url, timeout) {
    timeout = timeout || 12000;
    return new Promise(function (resolve, reject) {
      var ctrl = ('AbortController' in window) ? new AbortController() : null;
      var timer = setTimeout(function () { ctrl && ctrl.abort(); }, timeout);
      fetch(url, ctrl ? { signal: ctrl.signal } : {})
        .then(function (r) { return r.json(); })
        .then(function (d) { clearTimeout(timer); resolve(d); })
        .catch(function (e) { clearTimeout(timer); reject(e); });
    });
  }

  /** 依次尝试多个候选数据源，第一个能正确解析出结果的即采用 */
  function _trySources(urls) {
    var idx = 0;
    return new Promise(function (resolve, reject) {
      function next() {
        if (idx >= urls.length) { reject(new Error('all sources failed')); return; }
        _getJSON(urls[idx]).then(function (d) { resolve(d); })
          .catch(function () { idx++; next(); });
      }
      next();
    });
  }

  /** 在线搜索：解析网易云 /api/search/get 明文 JSON 为统一歌曲对象 */
  function _onlineSearch(q) {
    return _trySources(ONLINE.search.map(function (f) { return f(q); }))
      .then(function (d) {
        var songs = d && d.result && Array.isArray(d.result.songs) ? d.result.songs : null;
        if (!songs || !songs.length) throw new Error('no result');
        return songs.map(function (s) {
          var artists = (s.artists || []).map(function (a) { return a.name; }).filter(Boolean);
          return {
            id: s.id,
            name: s.name,
            artist: artists.join(' / ') || '未知歌手',
            cover: '',
            duration: s.duration,
            url: _outerUrl(s.id)   // 在线模式每首歌都带官方直链
          };
        });
      });
  }

  /** 在线歌单导入：解析 injahow meting 歌单为统一歌曲对象（播放统一走官方直链） */
  function _onlineImportPlaylist(id) {
    return _trySources(ONLINE.playlist.map(function (f) { return f(id); }))
      .then(function (d) {
        if (!Array.isArray(d) || !d.length) throw new Error('empty');
        // VIP / 付费歌曲在导入时直接剔除（同本地模式，避免播放时才失败触发切歌刷屏）
        var kept = d.filter(function (s) { return !_isPaidSong(s); });
        return kept.map(function (s) {
          var m = /type=url&id=(\d+)/.exec(s.url || '');
          var sid = m ? m[1] : '';
          return {
            id: sid,
            name: s.name,
            artist: s.artist,
            cover: s.pic || '',
            duration: 0,
            url: sid ? _outerUrl(sid) : (s.url || '')
          };
        });
      });
  }

  /* ---------- 网易云账号：凭证只留在音乐服务端 ---------- */
  function authEnabled() { return /^https:\/\//.test(LT.AUTH_SERVICE) && LT.AUTH_SERVICE.indexOf('YOUR-MUSIC-SERVICE') < 0; }
  function authRequest(path) {
    return fetch(LT.AUTH_SERVICE + path, { headers: LT.authToken ? { Authorization: 'Bearer ' + LT.authToken } : {} })
      .then(function(r) { return r.json().then(function(d) { if (!r.ok) throw new Error(d.error || '服务响应异常'); return d; }); });
  }
  function authStatus(message) { var el=$('lt-auth-status'); if(el) el.textContent=message; }
  function authButtons(logged) {
    if ($('lt-login-btn')) $('lt-login-btn').style.display=logged?'none':'';
    if ($('lt-logout-btn')) $('lt-logout-btn').style.display=logged?'':'none';
    var vipToggle=$('lt-skip-vip'); if(vipToggle && vipToggle.parentElement) vipToggle.parentElement.style.display=logged?'none':'';
  }
  function ltInitAuth() {
    if (!authEnabled()) return;
    $('lt-auth').style.display='block';
    if (!LT.authToken) return;
    authRequest('/me').then(function(d) {
      LT.authReady=true; authStatus('已登录：'+(d.nickname||'网易云用户')); authButtons(true);
      ltLoadMyPlaylists();
    }).catch(function() { LT.authToken=''; localStorage.removeItem('lt_auth_token'); authStatus('登录已过期，请重新扫码'); });
  }
  window.ltQrLogin=function() {
    if (!authEnabled()) return;
    authStatus('正在生成二维码…');
    authRequest('/qr/start').then(function(d) {
      LT.authToken=d.token; localStorage.setItem('lt_auth_token',d.token);
      $('lt-qr-image').src=d.qrimg; $('lt-qr-wrap').style.display='block';
      if(LT.qrTimer) clearInterval(LT.qrTimer);
      LT.qrTimer=setInterval(function() {
        authRequest('/qr/check').then(function(result) {
          if(result.code===803) {
            clearInterval(LT.qrTimer); LT.qrTimer=null;
            $('lt-qr-wrap').style.display='none'; LT.authReady=true;
            authStatus('已登录：'+(result.nickname||'网易云用户')); authButtons(true); ltLoadMyPlaylists();
          } else if(result.code===800) {
            clearInterval(LT.qrTimer); LT.qrTimer=null;
            authStatus('二维码已过期，请重新生成'); $('lt-qr-status').textContent='二维码已过期';
          } else $('lt-qr-status').textContent=result.code===802?'已扫码，请在网易云 App 中确认':'等待扫码…';
        }).catch(function(e) { authStatus(e.message); });
      },2500);
    }).catch(function(e) {authStatus('无法生成二维码：'+e.message);});
  };
  window.ltLogout=function() {
    if(LT.qrTimer) clearInterval(LT.qrTimer);
    authRequest('/logout').catch(function(){});
    LT.authToken=''; LT.authReady=false; localStorage.removeItem('lt_auth_token');
    LT.playlists=LT.playlists.filter(function(p){return !p.remote;});
    Storage.set(LT.KEY_PL,LT.playlists); ltRenderPlaylists();
    authButtons(false); authStatus('网易云未登录');
  };
  function ltLoadMyPlaylists() {
    authRequest('/playlists').then(function(d) {
      LT.playlists=LT.playlists.filter(function(p){return !p.remote;});
      (d.playlist||[]).forEach(function(p) {
        if(LT.playlists.some(function(old){return String(old.id)===String(p.id)})) return;
        LT.playlists.push({id:p.id,name:p.name,cover:p.coverImgUrl,count:p.trackCount,songs:[],remote:true});
      });
      Storage.set(LT.KEY_PL,LT.playlists); ltRenderPlaylists();
      authStatus('已登录；已同步 '+(d.playlist||[]).length+' 个歌单');
    }).catch(function(e){authStatus('歌单读取失败：'+e.message);});
  }
  /* ---------- 服务检测 ---------- */
  function setServiceText(text, cls) {
    var el = $('lt-service-text');
    if (el) { el.textContent = text; el.className = ''; if (cls) el.classList.add('lt-svc-' + cls); }
    var playerStatus = $('lt-player-status'), playerText = $('lt-player-status-text');
    if (playerStatus && playerText) {
      playerText.textContent = text;
      playerStatus.style.display = '';
      playerStatus.classList.toggle('lt-player-status-warn', cls === 'warn');
    }
    var act = $('lt-service-actions');
    if (act) act.innerHTML = '';
    if (cls === 'warn') {
      act.innerHTML = '<button class="lt-link-btn" onclick="ltOpenGuide()">查看启动方式</button>';
    } else if (LT.serviceOk) {
      act.innerHTML = '<span class="lt-svc-dot"></span>';
    }
  }

  window.ltOpenGuide = function () {
    var hint = '一起听歌 · 数据源说明（GitHub 部署无需启动任何服务，全功能可用）\n\n' +
      '【自动在线模式（默认）】\n' +
      '未启动本地服务时，自动使用公共在线接口：\n' +
      '  · 搜索歌曲\n' +
      '  · 导入网易云歌单（粘贴歌单链接或歌单 ID）\n' +
      '  · 播放（走网易云公开音频直链）\n' +
      'GitHub Pages 静态部署的线上访问无需任何操作，直接可用。\n\n' +
      '【直连播放（单曲）】\n' +
      '粘贴网易云歌曲链接 / 歌曲 ID / 音频直链，立即播放。\n\n' +
      '【本地音乐服务（可选增强：VIP/需登录歌曲）】\n' +
      '1. 双击 拾心界/music-server/start.command 启动\n' +
      '2. 或在终端运行：python3 拾心界/music-server/music_server.py\n' +
      'VIP 歌曲：在 music-server 目录创建 .netease_cred 文件填入网易云 Cookie。';
    alert(hint);
  };

  /* ---------- 直连播放（文件内置启动方式：无需本地服务，GitHub Pages 部署可用） ---------- */
  window.ltOpenDirect = function () {
    var row = $('lt-direct-row');
    if (!row) return;
    var show = row.style.display === 'none' || !row.style.display;
    row.style.display = show ? 'flex' : 'none';
    if (show) {
      var inp = $('lt-direct-input');
      if (inp) setTimeout(function () { inp.focus(); }, 60);
    }
  };

  /** 解析直连输入：网易云歌曲链接 / 歌曲ID / 音频直链 */
  function _parseDirectTarget(val) {
    val = (val || '').trim();
    if (!val) return null;
    // 1) 音频直链地址
    if (/^https?:\/\//i.test(val) && /\.(mp3|m4a|aac|ogg|wav|flac)([\?#]|$)/i.test(val)) {
      return { url: val, name: (val.split('/').pop() || '在线音频').split('?')[0], id: '' };
    }
    // 2) 网易云歌曲链接 / 含 id 的链接
    var m = /(?:music\.163\.com\/[^?\s]*?id=|song\/media\/outer\/url\?id=|song\?id=)[^\s&]+|-(\d{5,})|(\d{5,})/.exec(val);
    var id = '';
    if (m) id = (m[1] || m[2] || '').replace(/\D/g, '');
    // 3) 纯数字（歌曲ID）
    if (!id && /^\d{5,}$/.test(val)) id = val;
    if (!id) return null;
    return {
      id: id,
      url: 'https://music.163.com/song/media/outer/url?id=' + id + '.mp3',
      name: '网易云歌曲 ' + id
    };
  }

  window.ltPlayDirect = function () {
    var inp = $('lt-direct-input');
    var val = inp ? inp.value.trim() : '';
    if (!val) { if (inp) inp.focus(); return; }
    var t = _parseDirectTarget(val);
    if (!t) {
      setServiceText('无法识别：请粘贴网易云歌曲链接 / 歌曲ID / 音频地址(.mp3)', 'direct');
      return;
    }
    // 以单曲建立直连队列并立即播放
    LT.queue = [{
      id: t.id || ('direct_' + Date.now()),
      name: t.name,
      artist: '直连播放',
      cover: '',
      url: t.url
    }];
    LT.index = 0;
    LT._curPlaylistId = null;
    ltPlay(0, true);
    renderQueue();
    ltShowView('player');
    setServiceText('直连播放中（无需本地服务，GitHub 部署可用）');
    if (inp) inp.value = '';
  };

  function _detectService() {
    setServiceText('正在检测音乐服务…', '');
    fetch(LT.SERVICE + '/health', { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        LT.serviceOk = !!(d && d.ok);
        if (LT.serviceOk) {
          LT.srcMode = 'local';
          setServiceText('音乐服务已就绪，可以导入歌单听歌了');
        } else {
          LT.serviceOk = false;
          LT.srcMode = 'online';
          setServiceText('音乐服务响应异常，已切换在线模式（无需本地服务）', 'direct');
        }
      })
      .catch(function () {
        // 本地服务不可达（GitHub Pages 静态部署 / 未启动服务）：
        // 自动切换在线兜底，搜索 / 歌单导入 / 播放全部可用，无需启动任何服务
        LT.serviceOk = false;
        LT.srcMode = 'online';
        setServiceText('未检测到本地音乐服务，已切换在线模式：搜索 / 导入歌单 / 播放均可直接用，GitHub 部署也无需启动任何服务', 'direct');
      });
  }

  /* ---------- Tab 切换 ---------- */
  window.ltSwitchTab = function (tab) {
    $('lt-tab-pl') && $('lt-tab-pl').classList.toggle('active', tab === 'pl');
    $('lt-tab-search') && $('lt-tab-search').classList.toggle('active', tab === 'search');
    $('lt-import-row') && ($('lt-import-row').style.display = tab === 'pl' ? '' : 'none');
    $('lt-search-row') && ($('lt-search-row').style.display = tab === 'search' ? '' : 'none');
    $('lt-playlist-list') && ($('lt-playlist-list').style.display = tab === 'pl' ? '' : 'none');
    $('lt-search-list') && ($('lt-search-list').style.display = tab === 'search' ? '' : 'none');
    var empty = $('lt-empty');
    if (empty) {
      if (tab === 'pl') {
        empty.style.display = (LT.playlists.length || LT.queue.length) ? 'none' : '';
        empty.textContent = '歌单为空，输入上方链接导入网易云歌单';
      } else {
        empty.style.display = 'none';
      }
    }
    if (tab === 'search') setTimeout(function () { $('lt-search-input') && $('lt-search-input').focus(); }, 60);
  };

  /* ---------- 歌单列表渲染 ---------- */
  function ltRenderPlaylists() {
    var box = $('lt-playlist-list');
    if (!box) return;
    if($('lt-queue-actions'))$('lt-queue-actions').style.display='none';
    var back = $('lt-head-back-pl');
    if (back) back.style.display = 'none';
    var empty = $('lt-empty');
    if (!LT.playlists.length && !LT.queue.length) {
      box.innerHTML = '';
      if (empty) { empty.style.display = ''; empty.textContent = '歌单为空，输入上方链接导入网易云歌单'; }
      return;
    }
    if (!LT.playlists.length && LT.queue.length) {
      // 仅搜索组成的临时队列：清空歌单列表容器，避免残留已删除歌单的入口
      box.innerHTML = '';
      if (empty) empty.style.display = 'none';
      return;
    }
    var html = '';
    for (var i = 0; i < LT.playlists.length; i++) {
      var p = LT.playlists[i];
      html += '<div class="lt-pl-item" onclick="ltOpenPlaylist(' + i + ')">' +
        '<div class="lt-pl-cover">' + (p.cover ? '<img src="' + esc(safeCover(p.cover)) + '" alt="">' : '<i class="fas fa-list-ul"></i>') + '</div>' +
        '<div class="lt-pl-info"><div class="lt-pl-name">' + esc(p.name || '未命名歌单') + '</div>' +
        '<div class="lt-pl-sub">' + (p.count ? p.count + ' 首歌曲' : '') + '</div></div>' +
        '<button class="lt-pl-del" onclick="event.stopPropagation();ltRemovePlaylist(' + i + ')" title="删除歌单"><i class="fas fa-trash-can"></i></button>' +
        '</div>';
    }
    box.innerHTML = html;
    if (empty) empty.style.display = 'none';
  }

  window.ltRemovePlaylist = function (i) {
    var removed = LT.playlists[i];
    LT.playlists.splice(i, 1);
    try { Storage.set(LT.KEY_PL, LT.playlists); } catch (e) {}
    // 若删除的正是当前播放队列来源歌单：彻底清除队列、停止播放、重置状态与迷你条，
    // 回到歌单列表（空态或剩余歌单），避免界面残留已删除歌单的入口
    if (removed && LT._curPlaylistId !== null && String(removed.id) === String(LT._curPlaylistId)) {
      LT.queue = [];
      LT.index = -1;
      LT._curPlaylistId = null;
      LT.playing = false;
      if (LT._timer) { clearInterval(LT._timer); LT._timer = null; }
      if (LT.audio) {
        try { LT.audio.pause(); } catch (e2) {}
        try { LT.audio.removeAttribute('src'); if (LT.audio.load) LT.audio.load(); } catch (e3) {}
      }
      try { if (LT.together) _stopTalkScheduler(); } catch (e4) {}
      ltShowView('playlist');
      ltRenderPlaylists();
      renderMiniBar();
      renderPlayBtn();
      setServiceText('已删除当前播放的歌单，队列已清空');
    } else {
      ltRenderPlaylists();
    }
    if (typeof Core !== 'undefined' && Core.toast) Core.toast('已删除歌单');
  };

  /* ---------- 导入歌单 ---------- */
  window.ltImportPlaylist = function () {
    var inp = $('lt-playlist-input');
    var val = inp ? inp.value.trim() : '';
    if (!val) { inp && inp.focus(); return; }
    // 提取歌单 id：支持网易云歌单链接或纯数字 ID
    var idm = /(?:id=)(\d+)/.exec(val);
    var pid = idm ? idm[1] : (/^\d+$/.test(val) ? val : '');
    if (!pid) { setServiceText('无法识别歌单链接或歌单 ID', 'warn'); return; }
    var btn = $('lt-import-btn');

    function busy(on) {
      if (!btn) return;
      btn.disabled = on;
      btn.textContent = on ? '导入中…' : '导入';
    }
    function finish(name, songs, extraTip) {
      // 重导入同一歌单时保留上次播放位置（若新歌曲列表长度不变），避免导入后总是从头开始
      var resumeIdx = -1;
      for (var i = 0; i < LT.playlists.length; i++) {
        if (String(LT.playlists[i].id) === String(pid)) {
          var old = LT.playlists[i];
          if (typeof old.lastIndex === 'number' && old.lastIndex >= 0 && old.lastIndex < songs.length) {
            resumeIdx = old.lastIndex;
          }
          LT.playlists.splice(i, 1);
          break;
        }
      }
      var newPl = {
        id: pid,
        name: name || ('歌单 ' + pid),
        count: songs.length,
        cover: (songs[0] && songs[0].cover) || '',
        songs: songs
      };
      if (resumeIdx >= 0) newPl.lastIndex = resumeIdx;
      LT.playlists.unshift(newPl);
      try { Storage.set(LT.KEY_PL, LT.playlists); } catch (e) {}
      var tip = '歌单「' + (name || '') + '」导入成功，共 ' + songs.length + ' 首' + (extraTip || '');
      setServiceText(tip);
      ltRenderPlaylists();
      if (inp) inp.value = '';
      ltOpenPlaylist(0);
    }

    busy(true);
    if (LT.authReady) {
      authRequest('/playlist?id='+encodeURIComponent(pid)).then(function(d){
        busy(false); finish('网易云歌单 '+pid,(d.songs||[]).map(function(song){song.auth=true;return song;}));
      }).catch(function(e){busy(false);setServiceText('导入失败：'+e.message,'warn');});
      return;
    }
    if (LT.srcMode !== 'local' || !LT.serviceOk) {
      // 在线兜底：GitHub 静态部署 / 本地服务不可用 / 检测未完成时，走公共接口
      _onlineImportPlaylist(pid)
        .then(function (songs) { busy(false); finish('在线歌单 ' + pid, songs); })
        .catch(function () {
          busy(false);
          setServiceText('在线导入失败（公共接口暂不可用），可启动本地音乐服务再试', 'warn');
        });
      return;
    }
    // 本地音乐服务模式：始终携带 skip_vip=1，将 VIP/付费歌曲在导入时交由服务端直接跳过
    fetch(LT.SERVICE + '/playlist?id=' + encodeURIComponent(val) + '&skip_vip=1')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        busy(false);
        if (!d || !d.ok || !d.songs) {
          setServiceText('导入失败：' + (d && d.error ? d.error : '歌单为空或链接无效'), 'warn');
          return;
        }
        if (d.playlistId) pid = d.playlistId;
        // 前端按 fee 二次过滤：服务端即使没跳过，VIP/付费歌曲也不会被导入队列
        var before = d.songs.length;
        var songs = d.songs.filter(function (s) { return !_isPaidSong(s); });
        var removed = before - songs.length;
        if (!songs.length) {
          setServiceText('该歌单歌曲均为 VIP / 付费，导入时已全部跳过', 'warn');
          return;
        }
        var parts = [];
        if (removed > 0) parts.push('前端过滤 ' + removed + ' 首付费');
        if (d.skipped) parts.push('服务端跳过 ' + d.skipped + ' 首 VIP');
        finish(d.name, songs, parts.length ? '（' + parts.join('，') + '）' : '');
      })
      .catch(function () {
        busy(false);
        setServiceText('网络错误，请确认音乐服务已启动', 'warn');
      });
  };

  /* ---------- 打开歌单（展示其歌曲列表，从上次位置续播，不再强制从头开始） ---------- */
  window.ltOpenPlaylist = function (idx) {
    var p = LT.playlists[idx];
    if (p && p.remote && (!p.songs || !p.songs.length)) {
      setServiceText('正在读取歌单…');
      authRequest('/playlist?id='+encodeURIComponent(p.id)).then(function(d) {
        p.songs=(d.songs||[]).map(function(song) {song.auth=true; return song;});
        if(!p.songs.length) throw new Error('歌单为空');
        Storage.set(LT.KEY_PL,LT.playlists); ltOpenPlaylist(idx);
      }).catch(function(e){setServiceText('读取失败：'+e.message,'warn');});
      return;
    }
    if (!p || !p.songs || !p.songs.length) { setServiceText('该歌单暂无歌曲', 'warn'); return; }
    LT.queue = p.songs.slice();
    LT._curPlaylistId = p.id;
    // Opening a playlist only shows its tracks. Playback requires a song tap or Shuffle.
    if(LT.audio){ LT.audio.pause(); LT.audio.removeAttribute('src'); LT.audio.load(); }
    LT.index = -1; LT.sessionStarted=false; LT.loggedTrack=''; _endRoom(); renderFloat(); renderMiniBar();
    renderQueue();
  };

  window.ltPlayRandom=function(){
    if(!LT.queue.length)return;
    LT.mode='shuffle'; renderModeBtn();
    ltPlay(Math.floor(Math.random()*LT.queue.length));
    ltShowView('player');
  };

  function renderQueue() {
    var box = $('lt-playlist-list');
    if (!box) return;
    if (!LT.queue.length) { ltRenderPlaylists(); return; }
    if($('lt-queue-actions'))$('lt-queue-actions').style.display='flex';
    if($('lt-queue-count'))$('lt-queue-count').textContent=LT.queue.length+' 首';
    var html = '';
    for (var i = 0; i < LT.queue.length; i++) {
      var s = LT.queue[i];
      html += '<div class="lt-song-item' + (i === LT.index ? ' active' : '') + '" onclick="ltPick(' + i + ')">' +
        '<span class="lt-song-idx">' + (i + 1) + '</span>' +
        '<div class="lt-song-main">' +
        '<div class="lt-song-name">' + esc(s.name || '未知歌曲') + '</div>' +
        '<div class="lt-song-artist">' + esc(s.artist || '未知歌手') + '</div>' +
        '</div>' +
        '<span class="lt-song-dur">' + fmtDur(s.duration) + '</span>' +
        '</div>';
    }
    box.innerHTML = html;
    var emptyEl = $('lt-empty');
    if (emptyEl) emptyEl.style.display = 'none';
    var back = $('lt-head-back-pl');
    if (back) back.style.display = '';
    // 返回歌单页签显示（此时列表已是歌曲队列）
    $('lt-tab-pl') && $('lt-tab-pl').classList.add('active');
    $('lt-tab-search') && $('lt-tab-search').classList.remove('active');
    $('lt-import-row') && ($('lt-import-row').style.display = '');
    $('lt-search-row') && ($('lt-search-row').style.display = 'none');
  }

  /** 从歌曲队列视图返回歌单列表视图（播放不中断，迷你条继续显示） */
  window.ltBackToPlaylists = function () {
    ltSwitchTab('pl');
    ltRenderPlaylists();
  };

  /** 用户在歌曲列表点击一首：播放并进入播放界面 */
  window.ltPick = function (idx) {
    ltPlay(idx);
    ltShowView('player');
  };

  /* ---------- 播放控制 ---------- */
  function getAudio() {
    if (!LT.audio) {
      LT.audio = new Audio();
      LT.audio.id = 'lt-music-audio';
      LT.audio.setAttribute('playsinline', '');
      LT.audio.style.display = 'none';
      document.body.appendChild(LT.audio);
      LT.audio.preload = 'auto';
      _syncVolumeUI();
      LT.audio.addEventListener('timeupdate', function () { updateProgress(false); });
      LT.audio.addEventListener('loadedmetadata', function () {
        var d = $('lt-dur-time');
        if (d && isFinite(LT.audio.duration)) d.textContent = fmtTime(LT.audio.duration);
      });
      LT.audio.addEventListener('play', function () {
        LT.playing = true; window.__musicPlaying = true;
        if($('lt-player-status'))$('lt-player-status').style.display='none';
        if (!LT.sessionStarted) { LT.sessionStarted = true; _startRoom(); }
        var current=LT.queue[LT.index];
        if(current && LT.loggedTrack!==String(current.id)) { LT.loggedTrack=String(current.id); addLog('开始播放「'+current.name+'」'); }
        _scheduleTalk(); updateMediaSession(); renderPlayBtn(); renderFloat();
      });
      LT.audio.addEventListener('pause', function () { LT.playing = false; window.__musicPlaying = false; renderPlayBtn(); renderFloat(); updateMediaSession(); });
      LT.audio.addEventListener('ended', function () { onEnded(); });
      if (navigator.mediaSession) {
        try {
          navigator.mediaSession.setActionHandler('play', function () { if(LT.audio && LT.audio.paused) window.ltTogglePlay(); });
          navigator.mediaSession.setActionHandler('pause', function () { if(LT.audio && !LT.audio.paused) window.ltTogglePlay(); });
          navigator.mediaSession.setActionHandler('previoustrack', function () { window.ltPrev(); });
          navigator.mediaSession.setActionHandler('nexttrack', function () { window.ltNext(); });
        } catch (e) {}
      }
      LT.audio.addEventListener('error', function () {
        if (!LT.audio.getAttribute('src')) return;
        if (LT.queue[LT.index] && LT.queue[LT.index].auth) {
          var code=LT.audio.error && LT.audio.error.code;
          setServiceText('播放器无法加载音源（媒体错误 '+(code || '未知')+'）。请把这条提示发给我。','warn');
          renderPlayBtn();
          return;
        }
        setServiceText('播放出错，可能该歌曲需登录或已失效，自动换下一首', 'warn');
        // 静默切歌：报错自动跳过属于"被动切换"，
        // 不触发 ltNext 默认的"切歌默契"类聊天回复（避免因 VIP 直链失效而刷屏）
        setTimeout(function () { ltNext(true); }, 1200);
      });
    }
    return LT.audio;
  }

  /** 播放指定索引。不强制切换视图（角色自动切歌/用户点歌时由调用方决定是否进播放页） */
  function ltPlay(idx, isNew) {
    if (!LT.queue.length) return;
    if (idx < 0) idx = LT.queue.length - 1;
    if (idx >= LT.queue.length) idx = 0;
    LT.index = idx;
    // 记下当前歌单的播放位置，下次进入续播
    if (LT._curPlaylistId) {
      for (var pi = 0; pi < LT.playlists.length; pi++) {
        if (String(LT.playlists[pi].id) === String(LT._curPlaylistId)) {
          LT.playlists[pi].lastIndex = idx;
          try { Storage.set(LT.KEY_PL, LT.playlists); } catch (e) {}
          break;
        }
      }
    }
    var song = LT.queue[idx];
    renderQueue();
    renderPlayerInfo(song);
    renderRatings();
    var count=$('lt-player-count'); if(count)count.textContent=LT.queue.length+' 首';
    renderMiniBar();
    renderFloat();
    var audio = getAudio();
    // Do not let the play button keep playing the previous song while a new URL loads.
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    if (song && song.auth && LT.authReady) {
      setServiceText('正在获取「'+song.name+'」的播放地址…');
      authRequest('/song/url?id='+encodeURIComponent(song.id)).then(function(d) {
        if(LT.queue[LT.index]!==song) return;
        // The public URL is only a fallback for songs marked free in the playlist.
        var url=d.url || (Number(song.fee)===0 ? _outerUrl(song.id) : '');
        if(!url) {
          var info=(d.attempts||[]).map(function(a){return a.endpoint+': '+(a.error||('code='+a.code+', item='+a.itemCode+', fee='+a.fee));}).join('；');
          setServiceText('网易云未返回播放地址。'+info+'。可尝试别的歌曲；请将这段信息发给我。','warn'); return;
        }
        audio.src=url;
        audio.load();
        var attempt=audio.play();
        if(attempt && attempt.catch) attempt.catch(function() {
          setServiceText('播放地址已取得。请点击播放器中央的播放按钮；若仍失败，请告诉我具体提示。','warn');
          renderPlayBtn();
        });
      }).catch(function(e){if(LT.queue[LT.index]===song) setServiceText('获取播放地址失败：'+e.message,'warn');});
    } else if (song && song.url) {
      // 直连模式：歌曲自带可播放地址，无需本地服务（GitHub 部署同样可用）
      audio.src = song.url;
      var pd = audio.play();
      if (pd && pd.catch) pd.catch(function () {
        setServiceText('已就绪，点击播放按钮开始', '');
        renderPlayBtn();
      });
    } else {
      fetch(LT.SERVICE + '/song/url?id=' + song.id)
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.ok) {
            setServiceText('该歌曲无法播放：' + (d && d.error ? d.error : '未知错误'), 'warn');
            return;
          }
          audio.src = LT.SERVICE + d.url;
          var p = audio.play();
          if (p && p.catch) p.catch(function () {
            setServiceText('已就绪，点击播放按钮开始', '');
            renderPlayBtn();
          });
        })
        .catch(function () {
          setServiceText('网络错误：无法获取播放地址', 'warn');
        });
    }
    if (LT._timer) clearInterval(LT._timer);
    LT._timer = setInterval(function () { updateProgress(true); }, 500);
  }
  window.ltPlay = ltPlay;

  window.ltTogglePlay = function () {
    var audio = getAudio();
    if (!audio.src) {
      if (LT.index >= 0 && LT.queue[LT.index]) { ltPlay(LT.index); return; }
      setServiceText('请先从歌单选一首歌播放', 'warn'); return;
    }
    var wasPlaying = !audio.paused;
    if (wasPlaying) {
      audio.pause();
      if (LT.together && Math.random() < 0.22) {
        _partnerSay(_musicLine('userPause', USER_PAUSE_TEXTS), true, '暂停');
      }
    } else {
      var p = audio.play();
      if (p && p.catch) p.catch(function () { setServiceText('浏览器拦截了自动播放，请再点一次', 'warn'); });
    }
    renderPlayBtn();
  };

  window.ltPrev = function (silent) {
    if (!LT.queue.length) return;
    if (!silent && LT.together && Math.random() < 0.25) _partnerSay(_musicLine('userSkip', USER_SKIP_TEXTS), true, '切歌');
    ltPlay(LT.index - 1);
  };

  window.ltNext = function (silent) {
    if (!LT.queue.length) return;
    // silent=true（播放报错自动切换等被动场景）：不触发"切歌默契"类聊天回复
    if (!silent && LT.together && Math.random() < 0.25) _partnerSay(_musicLine('userSkip', USER_SKIP_TEXTS), true, '切歌');
    if (LT.mode === 'shuffle' && LT.queue.length > 1) {
      var nxt = LT.index;
      while (nxt === LT.index) nxt = Math.floor(Math.random() * LT.queue.length);
      ltPlay(nxt);
      return;
    }
    ltPlay(LT.index + 1);
  };

  window.ltSeek = function () {
    var bar = $('lt-progress');
    var audio = LT.audio;
    if (!bar || !audio || !audio.duration) return;
    audio.currentTime = (bar.value / 1000) * audio.duration;
  };

  /* ---------- 音量控制 ---------- */
  window.ltSetVolume = function () {
    var bar = $('lt-volume');
    if (!bar) return;
    var v = Number(bar.value) / 100;
    if (LT.audio) LT.audio.volume = v;
    try { Storage.set('lt_volume', v); } catch (e) {}
  };

  function _syncVolumeUI() {
    var vb = $('lt-volume');
    var vol = 0.8;
    try {
      var sv = Number(Storage.get('lt_volume', 0.8));
      if (isFinite(sv) && sv >= 0 && sv <= 1) vol = sv;
    } catch (e) {}
    if (vb) vb.value = Math.round(vol * 100);
    if (LT.audio) LT.audio.volume = vol;
  }

  /* ---------- 播放模式：顺延 / 循环 / 随机 ---------- */
  window.ltSetMode = function (m) {
    LT.mode = m === LT.mode && m !== 'sequential' ? 'sequential' : (m === 'loop' || m === 'shuffle') ? m : 'sequential';
    renderModeBtn();
    if (typeof Core !== 'undefined' && Core.toast) {
      var names = { sequential: '顺延播放', loop: '循环播放', shuffle: '随机播放' };
      Core.toast('已切换为' + names[LT.mode]);
    }
  };

  function renderModeBtn() {
    ['seq', 'loop', 'shuffle'].forEach(function (k) {
      var el = $('lt-mode-' + k);
      if (el) el.classList.toggle('active', LT.mode === (k === 'seq' ? 'sequential' : k));
    });
  }

  function onEnded() {
    if (!LT.queue.length) return;
    if (LT.mode === 'sequential') {
      // 顺延播放：按顺序，最后一首播完自动停止
      if (LT.index >= LT.queue.length - 1) {
        LT.playing = false;
        _stopTalkScheduler();
        renderPlayBtn();
        return;
      }
      if (LT.together) _partnerSay(_musicLine('autoNext', AUTO_NEXT_TEXTS), false, '下一首');
      ltPlay(LT.index + 1);
      return;
    }
    if (LT.mode === 'shuffle') {
      var nxt = LT.index;
      if (LT.queue.length > 1) {
        while (nxt === LT.index) nxt = Math.floor(Math.random() * LT.queue.length);
      }
      if (LT.together) _partnerSay(_musicLine('autoNext', AUTO_NEXT_TEXTS), false, '下一首');
      ltPlay(nxt);
      return;
    }
    // loop：循环播放，最后一首自动回第一首（ltPlay 内部会自动回绕）
    if (LT.together) _partnerSay(_musicLine('autoNext', AUTO_NEXT_TEXTS), false, '下一首');
    ltPlay(LT.index + 1);
  }

  function updateProgress() {
    var audio = LT.audio;
    if (!audio) return;
    var bar = $('lt-progress');
    var cur = $('lt-cur-time');
    if (!bar) return;
    if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
      bar.value = Math.round((audio.currentTime / audio.duration) * 1000);
    } else {
      bar.value = 0;
    }
    if (cur) cur.textContent = fmtTime(audio.currentTime);
  }

  function renderPlayBtn() {
    var btn = $('lt-play-btn');
    if (btn) btn.innerHTML = '<i class="fas fa-' + (LT.playing ? 'pause' : 'play') + '"></i>';
    var mini = $('lt-mini-play');
    if (mini) mini.innerHTML = '<i class="fas fa-' + (LT.playing ? 'pause' : 'play') + '"></i>';
    var floatBtn = $('lt-float-play');
    if (floatBtn) floatBtn.innerHTML = '<i class="fas fa-' + (LT.playing ? 'pause' : 'play') + '"></i>';
  }

  function renderPlayerInfo(song) {
    var companion=$('lt-companion-line'),companionStatus=$('lt-companion-status');
    if(companion)companion.textContent=LT.together?'“听听这首怎么样。”':'音乐已经准备好。TA 有空时会来。';
    if(companionStatus)companionStatus.textContent=LT.together?'TA 正在听「'+(song.name||'这首歌')+'」':'TA 暂时不在房间';
    var cover = $('lt-cover');
    if (cover) {
      if (song.cover) cover.innerHTML = '<img src="' + esc(safeCover(song.cover)) + '" alt="">';
      else cover.innerHTML = '<i class="fas fa-music"></i>';
    }
    var t = $('lt-song-title'); if (t) t.textContent = song.name || '未知歌曲';
    var a = $('lt-song-artist'); if (a) a.textContent = song.artist || '未知歌手';
    var dur = $('lt-dur-time'); if (dur) dur.textContent = fmtDur(song.duration);
    var cur = $('lt-cur-time'); if (cur) cur.textContent = '00:00';
    var bar = $('lt-progress'); if (bar) bar.value = 0;
    renderPlayBtn();
  }

  /** 迷你播放条：有播放中的歌曲即显示 */
  function renderMiniBar() {
    var bar = $('lt-minibar');
    if (!bar) return;
    if (!LT.queue.length || LT.index < 0) { bar.style.display = 'none'; return; }
    var song = LT.queue[LT.index];
    if (!song) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    var mc = $('lt-mini-cover');
    if (mc) {
      if (song.cover) mc.innerHTML = '<img src="' + esc(safeCover(song.cover)) + '" alt="">';
      else mc.innerHTML = '<i class="fas fa-music"></i>';
    }
    var mt = $('lt-mini-title'); if (mt) mt.textContent = song.name || '未知歌曲';
    var ma = $('lt-mini-artist'); if (ma) ma.textContent = song.artist || '未知歌手';
    renderPlayBtn();
  }

  /* ---------- 一起听（角色互动） ---------- */
  function renderPresence() {
    var me = {}, partner = {};
    try {
      me = Storage.getMyProfile() || {};
      var profiles = Storage.getPartnerProfiles() || [];
      partner = profiles.find(function(p) { return String(p.id) === String(LT._chatId); }) || profiles[0] || {};
    } catch(e) {}
    function avatar(id, profile, fallback) {
      var el = $(id); if (!el) return;
      var src = profile.avatarImage || '';
      el.innerHTML = src ? '<img src="' + esc(src) + '" alt="">' : '<span>' + esc(profile.avatar || fallback) + '</span>';
      el.setAttribute('aria-label', profile.nickname || profile.name || fallback);
    }
    avatar('lt-room-me', me, '我'); avatar('lt-room-partner', partner, 'TA');
    var other = $('lt-room-other'), room = $('lt-room-presence');
    if (other) other.hidden = !LT.together;
    if (room) room.classList.toggle('has-partner', LT.together);
    if ($('lt-room-state')) $('lt-room-state').textContent = LT.together ? (LT.leaving ? '即将离开' : '一起听歌中') : '你正在独自听歌';
    if ($('lt-companion-status') && !LT.together) $('lt-companion-status').textContent = 'TA 暂时不在房间';
  }
  function _presenceBubble(text) {
    var el = $('lt-room-bubble'); if (!el || !text) return;
    if (LT._bubbleTimer) clearTimeout(LT._bubbleTimer);
    el.textContent = text; el.hidden = false;
    LT._bubbleTimer = setTimeout(function() { el.hidden = true; LT._bubbleTimer = null; }, 8000);
  }
  function _joinRoom() {
    if (!LT.roomActive || LT.together) return;
    LT.together = true; LT.leaving = false; LT.presenceChangedAt = Date.now();
    renderPresence();
    var text = _musicLine('join', JOIN_TEXTS);
    _partnerSay(text, true, 'TA 加入房间'); _presenceBubble(text);
  }
  function _leaveRoom() {
    if (!LT.together || LT.leaving) return;
    LT.leaving = true;
    var text = _musicLine('leave', LEAVE_TEXTS);
    _partnerSay(text, true, 'TA 准备离开'); _presenceBubble(text); renderPresence();
    LT._departureTimer = setTimeout(function() {
      LT.together = false; LT.leaving = false; LT.presenceChangedAt = Date.now();
      LT._departureTimer = null; addLog('TA 已离开房间'); renderPresence();
    }, 8000);
  }
  function _startRoom() {
    if (LT.roomActive) { renderPresence(); return; }
    LT.roomActive = true; LT.together = false; LT.leaving = false;
    LT.presenceChangedAt = Date.now(); renderPresence();
    LT._arrivalTimer = setTimeout(function() {
      LT._arrivalTimer = null;
      if (LT.roomActive && Math.random() < 0.35) _joinRoom();
    }, 3000 + Math.random() * 5000);
    _scheduleTalk();
  }
  function _endRoom() {
    LT.roomActive = false; LT.together = false; LT.leaving = false;
    ['_arrivalTimer','_departureTimer','_bubbleTimer'].forEach(function(key) {
      if (LT[key]) clearTimeout(LT[key]); LT[key] = null;
    });
    if ($('lt-room-bubble')) $('lt-room-bubble').hidden = true;
    _stopTalkScheduler(); renderPresence();
  }
  function _scheduleTalk() {
    if (LT._talkTimer || !LT.roomActive) return;
    LT._talkTimer = setTimeout(function() {
      LT._talkTimer = null;
      if (!LT.roomActive) return;
      var elapsed = Date.now() - LT.presenceChangedAt;
      if (!LT.together) {
        if (elapsed >= 60000 && Math.random() < 0.25) _joinRoom();
      } else if (!LT.leaving) {
        if (elapsed >= 120000 && Math.random() < 0.12) _leaveRoom();
        else _partnerAction();
      }
      _scheduleTalk();
    }, (45 + Math.random() * 30) * 1000);
  }
  function _stopTalkScheduler() {
    if (LT._talkTimer) clearTimeout(LT._talkTimer);
    LT._talkTimer = null;
  }
  // No partner pause/resume: only opinions and previous/next while present.
  function _partnerAction() {
    if (!LT.together || LT.leaving || !LT.playing) return;
    var song = LT.queue[LT.index]; if (!song) return;
    var opinion = (ratings()[String(song.id)] || {}).partner;
    var r = Math.random(); if (r >= 0.60) return;
    var skipChance = opinion === 'dislike' ? 0.25 : opinion === 'like' ? 0.04 : 0.12;
    if (r < skipChance && LT.queue.length > 1) {
      var previous = Math.random() < 0.20;
      addLog('TA 切到了' + (previous ? '上一首' : '下一首'));
      _partnerSay(_musicLine('skip', SKIP_TEXTS), true, 'TA 切歌');
      if (previous) window.ltPrev(true); else window.ltNext(true);
      return;
    }
    var userRating = (ratings()[String(song.id)] || {}).user;
    var likeChance = opinion === 'like' ? 0.92 : opinion === 'dislike' ? 0.10 : userRating === 'like' ? 0.86 : 0.72;
    var kind = Math.random() < likeChance ? 'like' : 'dislike';
    saveRating('partner', kind);
    _partnerSay(_musicLine(kind === 'like' ? 'praise' : 'dislike', kind === 'like' ? PRAISE_TEXTS : DISLIKE_TEXTS), true, kind === 'like' ? 'TA 喜欢这首' : 'TA 踩了这首');
  }

  /* ---------- 本次听歌记录（不写入聊天消息） ---------- */
  var _lastSayAt = 0;
  function _partnerSay(text, force, label) {
    if (!text || !LT.together || (LT.leaving && label !== 'TA 准备离开')) return;
    var now = Date.now();
    if (!force && now - _lastSayAt < 6000) return;
    _lastSayAt = now;
    addLog((label || 'TA') + '：' + text);
    var line=$('lt-companion-line'),status=$('lt-companion-status');
    if(line)line.textContent='“'+text+'”';
    if(status)status.textContent=label||'TA 正在听';
  }

  /* ---------- 语料 ---------- */
  var JOIN_TEXTS = [
    "Move over, darling. I have a little time, and I intend to spend it here.",
    "You started without me? How bold. Let me hear what you've chosen.",
    "I'm here. Try not to look quite so pleased with yourself.",
    "A brief escape from my duties. Naturally, I came to you."
  ];
  var LEAVE_TEXTS = [
    "Duty calls. Keep listening, darling. I'll find you when I can.",
    "I must disappear for a while. Don't let that stop your music.",
    "Someone requires my attention. A terrible inconvenience, I know.",
    "Back to my obligations. Save something good for my return."
  ];
  var OPEN_TEXTS = [
    '来啦来啦，一起听歌呀～',
    '陪你听歌，比歌本身还开心～',
    '这个歌单，我想和你一首一首听过去',
    '音乐响起来，想你的心思也藏不住了',
  ];
  var SKIP_TEXTS = [
    '这首听腻了，换一首吧～',
    '这首歌不对味，切掉切掉！',
    '哼，我想听点别的，切歌啦',
    '这首不够甜，换首更配我们的',
    '现在这个氛围，我想换首歌',
  ];
  var PAUSE_TEXTS = [
    '先暂停一下，我想跟你说句话～',
    '停！让我缓一下，这首太戳我了',
    '暂停一下下，耳朵想休息会儿～',
    '等等，我想仔细听你说话',
    '先别放啦，我想安静待一会儿',
  ];
  var PRAISE_TEXTS = [
    '这首歌……好像有点好听诶',
    '歌词写得真戳我',
    '这旋律让我想起你了',
    '果然我们的审美一致',
    '这首我偷偷收藏了嘿嘿',
  ];
  var RESUME_TEXTS = [
    '我回来啦，继续听吧～',
    '好了好了，快接着放歌',
    '刚走开一下下，继续～',
    '别停呀，我还想听这首',
  ];
  var USER_PAUSE_TEXTS = [
    '怎么暂停了，还没听够呢',
    '这首歌你不喜欢吗？',
    '那……先不听了，陪你说话',
    '你暂停，是不是有话想跟我说',
  ];
  var USER_SKIP_TEXTS = [
    '好呀好呀，这首更好听',
    '你怎么知道我正想切这首',
    '这首我超爱！',
    '切歌的动作好默契',
  ];
  var AUTO_NEXT_TEXTS = [
    '这首放完了，下一首也很配我们',
    '自动续上啦，继续听',
    '下一首，我猜你也会喜欢',
  ];
  var DISLIKE_TEXTS = ['这首似乎不太合我心意。', '我想听点别的，可以换一首吗？'];
  var RATE_TEXTS = ['你喜欢的话，我会再陪你听一遍。', '好，我记住你喜欢这首了。'];
  var RATE_DISLIKE_TEXTS = ['那我们换一首，听你喜欢的。', '好，这首先跳过。'];
  var RATE_AGREE_TEXTS=['看来这次我们的品味一致。','这首我也喜欢，留着再听。'];
  var RATE_DIFFER_TEXTS=['你喜欢这首？我再听听看。','我们的品味看来并不总是一致。'];
  var RATE_REMOVE_TEXTS=['改变主意了？好，我记下了。','那这首先放一边。'];
  var CARD_TYPES = [
    ['open','听歌邀请',OPEN_TEXTS], ['praise','TA 喜欢',PRAISE_TEXTS],
    ['dislike','TA 不喜欢',DISLIKE_TEXTS], ['skip','TA 切歌',SKIP_TEXTS],
    ['join','TA 加入房间',JOIN_TEXTS], ['leave','TA 离开房间',LEAVE_TEXTS],
    ['userPause','你暂停',USER_PAUSE_TEXTS], ['userSkip','你切歌',USER_SKIP_TEXTS],
    ['autoNext','自动下一首',AUTO_NEXT_TEXTS], ['userLike','你点赞',RATE_TEXTS],
    ['userDislike','你点踩',RATE_DISLIKE_TEXTS],
    ['agreeLike','你和 TA 都喜欢',RATE_AGREE_TEXTS],['disagreeLike','你喜欢但 TA 不喜欢',RATE_DIFFER_TEXTS],
    ['removeRating','你取消评价',RATE_REMOVE_TEXTS]
  ];
  function musicCards() {
    try { return JSON.parse(localStorage.getItem('lt_music_cards') || '{}') || {}; } catch (e) { return {}; }
  }
  function _musicLine(key, fallback) {
    var saved = musicCards(), lines = Object.prototype.hasOwnProperty.call(saved,key) ? saved[key] : fallback;
    return Array.isArray(lines) && lines.length ? pick(lines) : '';
  }
  window.ltRenderCards = function () {
    var select = $('lt-card-category'), input = $('lt-card-lines'); if (!select || !input) return;
    var current=select.value;
    select.innerHTML=CARD_TYPES.map(function(t){return '<option value="'+t[0]+'">'+t[1]+'</option>';}).join('');
    if(current) select.value=current;
    var t=CARD_TYPES.find(function(c){return c[0]===select.value;}) || CARD_TYPES[0];
    var saved=musicCards(); input.value=(Object.prototype.hasOwnProperty.call(saved,t[0]) ? saved[t[0]] : t[2]).join('\n');
    if($('lt-card-save-status')) $('lt-card-save-status').textContent='';
  };
  window.ltSaveCards = function () {
    var select=$('lt-card-category'), input=$('lt-card-lines'); if(!select || !input) return;
    var data=musicCards(); data[select.value]=input.value.split(/\r?\n/).map(function(s){return s.trim();}).filter(Boolean);
    try { localStorage.setItem('lt_music_cards',JSON.stringify(data)); $('lt-card-save-status').textContent='已保存 '+data[select.value].length+' 条'; }
    catch(e){$('lt-card-save-status').textContent='保存失败：浏览器存储空间不足';}
  };
  function addLog(text) { if(!text)return; LT.log.push({time:Date.now(),text:text});if(LT.log.length>60)LT.log.shift(); renderLog(); }
  function renderLog() {
    var el=$('lt-session-log'); if(!el)return;
    el.innerHTML=LT.log.length ? LT.log.slice().reverse().map(function(item){return '<p><small>'+new Date(item.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+'</small> '+esc(item.text)+'</p>';}).join('') : '<p>这次还没有记录</p>';
    el.scrollTop=0;
  }
  window.ltToggleLog=function(){var el=$('lt-session-log');if(!el)return;el.hidden=!el.hidden;$('lt-log-toggle').textContent='SESSION '+(el.hidden?'▸':'▾');};
  window.ltClearLog=function(){LT.log=[];renderLog();};
  function ratings(){try{return JSON.parse(localStorage.getItem('lt_song_ratings')||'{}')||{};}catch(e){return {};}}
  function saveRating(who,kind){
    if(who==='partner' && (!LT.together || LT.leaving))return;
    var song=LT.queue[LT.index];if(!song || !song.id)return;
    var data=ratings(),id=String(song.id);data[id]=data[id]||{};
    if(kind==='neutral')delete data[id][who];else data[id][who]=kind;
    try{localStorage.setItem('lt_song_ratings',JSON.stringify(data));}catch(e){}
    renderRatings();
  }
  function renderRatings(){
    var song=LT.queue[LT.index],item=song&&ratings()[String(song.id)]||{};
    if($('lt-rate-like'))$('lt-rate-like').classList.toggle('active',item.user==='like');
    if($('lt-rate-dislike'))$('lt-rate-dislike').classList.toggle('active',item.user==='dislike');
    if($('lt-player-heart'))$('lt-player-heart').classList.toggle('active',item.user==='like');
    if($('lt-partner-heart'))$('lt-partner-heart').classList.toggle('on',item.partner==='like');
    if($('lt-partner-dislike'))$('lt-partner-dislike').classList.toggle('on',item.partner==='dislike');
    if($('lt-rating-state'))$('lt-rating-state').textContent=item.partner ? 'TA '+(item.partner==='like'?'喜欢':'不喜欢')+'这首歌' : '';
  }
  window.ltRateSong=function(kind){
    var song=LT.queue[LT.index];if(!song)return;
    var old=ratings()[String(song.id)]||{},next=old.user===kind?'neutral':kind;
    saveRating('user',next);
    addLog('你'+(next==='neutral'?'取消了对':next==='like'?'喜欢':'踩了')+'「'+song.name+'」'+(next==='neutral'?'的评价':''));
    var category,defaultLines;
    if(next==='neutral'){category='removeRating';defaultLines=RATE_REMOVE_TEXTS;}
    else if(next==='like'&&old.partner==='like'){category='agreeLike';defaultLines=RATE_AGREE_TEXTS;}
    else if(next==='like'&&old.partner==='dislike'){category='disagreeLike';defaultLines=RATE_DIFFER_TEXTS;}
    else {category=next==='like'?'userLike':'userDislike';defaultLines=next==='like'?RATE_TEXTS:RATE_DISLIKE_TEXTS;}
    _partnerSay(_musicLine(category,defaultLines),true,'TA 回应');
  };
  function updateMediaSession(){
    if(!navigator.mediaSession)return;
    var song=LT.queue[LT.index];
    try {
      navigator.mediaSession.playbackState=!song?'none':LT.playing?'playing':'paused';
      if(song && window.MediaMetadata)navigator.mediaSession.metadata=new MediaMetadata({title:song.name||'一起听歌',artist:song.artist||'',album:'拾心界',artwork:song.cover?[{src:safeCover(song.cover)}]:[]});
    }catch(e){}
  }
  function renderFloat(){var el=$('lt-float');if(el)el.style.display=LT.sessionStarted?'flex':'none';}
  window.ltFloatToggle=function(){var el=$('lt-float-actions');if(el)el.style.display=el.style.display==='none'?'flex':'none';};
  window.ltFloatOpenPlayer=function(){
    if(!LT.queue.length)return;
    window.openListenTogetherPanel();
    window.ltGoPlayer();
    var actions=$('lt-float-actions');if(actions)actions.style.display='none';
  };
  window.ltStopMusic=function(){
    _endRoom(); LT.sessionStarted=false;LT.queue=[];LT.index=-1;LT.loggedTrack='';LT.playing=false;window.__musicPlaying=false;LT.log=[];renderLog();
    if(LT.audio){LT.audio.pause();LT.audio.removeAttribute('src');LT.audio.load();}
    if(navigator.mediaSession){try{navigator.mediaSession.playbackState='none';navigator.mediaSession.metadata=null;}catch(e){}}
    renderFloat();renderMiniBar();renderPlayBtn();closeListenTogetherPanel();
  };
  function initFloatDrag(){
    var el=$('lt-float'),handle=$('lt-float-main');if(!el||!handle)return;
    var sx,sy,ox,oy,moved=false,lastTap=0,tapTimer=null;
    handle.addEventListener('pointerdown',function(e){sx=e.clientX;sy=e.clientY;var r=el.getBoundingClientRect();ox=r.left;oy=r.top;moved=false;handle.setPointerCapture(e.pointerId);});
    handle.addEventListener('pointermove',function(e){if(sx===undefined)return;var dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;if(!moved)return;el.style.left=Math.max(0,Math.min(innerWidth-el.offsetWidth,ox+dx))+'px';el.style.top=Math.max(0,Math.min(innerHeight-el.offsetHeight,oy+dy))+'px';el.style.right='auto';el.style.bottom='auto';});
    handle.addEventListener('pointerup',function(){sx=undefined;});
    handle.addEventListener('click',function(e){
      if(moved){e.stopImmediatePropagation();e.preventDefault();moved=false;lastTap=0;clearTimeout(tapTimer);return;}
      var now=Date.now();
      if(now-lastTap<330){clearTimeout(tapTimer);lastTap=0;window.ltFloatOpenPlayer();}
      else {lastTap=now;tapTimer=setTimeout(function(){lastTap=0;window.ltFloatToggle();},330);}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initFloatDrag);else initFloatDrag();

  /* ---------- 搜索 ---------- */
  window.ltSearch = function () {
    var inp = $('lt-search-input');
    var q = inp ? inp.value.trim() : '';
    if (!q) { inp && inp.focus(); return; }
    if (LT.srcMode !== 'local' || !LT.serviceOk) {
      // 在线兜底：GitHub 静态部署 / 本地服务不可用 / 检测未完成时，走公共接口
      _onlineSearch(q)
        .then(function (songs) {
          LT.searchList = songs;
          renderSearchList(songs);
          setServiceText('搜索到 ' + songs.length + ' 首，点击「+」加入并播放（在线模式，无需本地服务）');
        })
        .catch(function () {
          setServiceText('在线搜索失败（公共接口暂不可用），可启动本地音乐服务再试', 'warn');
        });
      return;
    }
    fetch(LT.SERVICE + '/search?q=' + encodeURIComponent(q) + '&limit=20')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok || !d.songs) { setServiceText('搜索失败', 'warn'); return; }
        var songs = d.songs.map(function (s) {
          return { id: s.id, name: s.name, artist: s.artist, cover: s.cover, duration: s.duration, url: s.url || '' };
        });
        LT.searchList = songs;
        renderSearchList(songs);
        setServiceText('搜索到 ' + songs.length + ' 首，点击「+」加入并播放');
      })
      .catch(function () { setServiceText('网络错误：搜索失败', 'warn'); });
  };

  function renderSearchList(songs) {
    var box = $('lt-search-list');
    if (!box) return;
    if (!songs.length) { box.innerHTML = '<div class="lt-empty" style="display:block">没有搜到相关歌曲</div>'; return; }
    var html = '';
    for (var i = 0; i < songs.length; i++) {
      var s = songs[i];
      html += '<div class="lt-song-item" onclick="ltAddFromSearch(' + i + ')">' +
        '<span class="lt-song-idx"><i class="fas fa-plus"></i></span>' +
        '<div class="lt-song-main">' +
        '<div class="lt-song-name">' + esc(s.name) + '</div>' +
        '<div class="lt-song-artist">' + esc(s.artist) + '</div>' +
        '</div>' +
        '<span class="lt-song-dur">' + fmtDur(s.duration) + '</span>' +
        '</div>';
    }
    box.innerHTML = html;
  }

  /** 搜索结果点「+」：加入当前队列并立即播放（进入播放界面） */
  window.ltAddFromSearch = function (idx) {
    var s = LT.searchList && LT.searchList[idx];
    if (!s) return;
    LT.queue.push(s);
    ltPlay(LT.queue.length - 1);
    renderQueue();
    ltShowView('player');
    // 切回我的歌单页签以显示队列
    ltSwitchTab('pl');
  };

  // 深链：URL 带 #lt 时自动打开「一起听歌」面板（刷新后保持弹窗 / 便于直达）
  var _m = location.hash.match(/#lt(?:=([a-z]+))?/);
  if (_m) {
    setTimeout(function () {
      openListenTogetherPanel();
      if (_m[1] === 'player') ltShowView('player');
    }, 450);
  }
})();
