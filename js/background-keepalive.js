/* RL7 Background Keepalive v21
 * Best-effort iOS media keepalive. Designed to create a real MediaSession so
 * iOS can expose it on Lock Screen / Control Center / Dynamic Island when allowed.
 */
(function (global) {
  'use strict';
  global.createBackgroundKeepAlive = function (options) {
    const opts = options || {};
    let enabled = false, audio = null, source = '', retry = null, heartbeat = null;
    let delay = 2500, playingSince = 0, generation = 0;
    const recoveries = new Set();

    function report(error) {
      if (opts.onStatus) opts.onStatus({
        enabled,
        playing: !!audio && !audio.paused && !audio.ended,
        error: error ? String(error.message || error) : null
      });
    }

    function makeAudio() {
      const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
      const rate = 44100, seconds = 2, samples = rate * seconds;
      const buffer = new ArrayBuffer(44 + samples * 2);
      const view = new DataView(buffer);
      function word(offset, value) {
        for (let i = 0; i < value.length; i++) view.setUint8(offset+i, value.charCodeAt(i));
      }
      word(0,'RIFF'); view.setUint32(4,36+samples*2,true); word(8,'WAVE');
      word(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true);
      view.setUint16(22,1,true); view.setUint32(24,rate,true); view.setUint32(28,rate*2,true);
      view.setUint16(32,2,true); view.setUint16(34,16,true); word(36,'data');
      view.setUint32(40,samples*2,true);

      /* Not digital silence. Tiny sine wave so iOS sees an active audio stream. */
      const amp = ios ? 0.0015 : 0.01;
      for (let i=0;i<samples;i++) {
        const fade = Math.min(1, i/1200, (samples-i)/1200);
        view.setInt16(44+i*2, Math.round(Math.sin(2*Math.PI*220*i/rate)*amp*fade*32767), true);
      }

      source = URL.createObjectURL(new Blob([buffer], {type:'audio/wav'}));
      audio = document.createElement('audio');
      audio.id = 'rl7-background-keepalive-audio';
      audio.loop = true;
      audio.volume = 0.08;
      audio.preload = 'auto';
      audio.setAttribute('playsinline','');
      audio.setAttribute('webkit-playsinline','');
      audio.src = source;
      /* Keep element attached; iOS is more reliable with a DOM-backed media element. */
      audio.style.position='fixed'; audio.style.width='1px'; audio.style.height='1px';
      audio.style.opacity='0'; audio.style.pointerEvents='none';
      document.body.appendChild(audio);

      audio.addEventListener('playing', () => {
        playingSince = Date.now();
        clearTimeout(retry); retry = null; delay = 2500;
        markMedia(); report();
      });
      audio.addEventListener('pause', () => {
        playingSince = 0;
        if (enabled) schedule();
        report();
      });
      audio.addEventListener('error', () => {
        schedule(); report(new Error('Keepalive audio error'));
      });
    }

    let ownedMetadata = null;
    function markMedia() {
      if (!enabled || opts.manageMediaSession === false || !navigator.mediaSession) return;
      try {
        if (global.MediaMetadata) {
          ownedMetadata = new MediaMetadata({
            title: opts.title || 'Background keepalive',
            artist: opts.artist || '拾心界',
            album: ''
          });
          navigator.mediaSession.metadata = ownedMetadata;
        }
        navigator.mediaSession.playbackState = 'playing';
        /* Action handlers improve iOS recognition of this as an active session. */
        try { navigator.mediaSession.setActionHandler('play', () => play()); } catch (_) {}
        try { navigator.mediaSession.setActionHandler('pause', () => { if(audio) audio.pause(); }); } catch (_) {}
      } catch (_) {}
    }

    function schedule() {
      if (!enabled || retry) return;
      retry = setTimeout(() => { retry=null; play(); }, delay);
      delay = Math.min(delay * 1.7, 30000);
    }

    async function play() {
      if (!enabled) return false;
      if (!audio) makeAudio();
      const token=generation, element=audio;
      try {
        element.muted = false;
        await element.play();
        if (!enabled || token !== generation) return false;
        markMedia(); report(); return true;
      } catch (error) {
        if (enabled && token === generation) { report(error); schedule(); }
        return false;
      }
    }

    function heal() {
      if (!enabled) return;
      clearTimeout(retry); retry=null; delay=2500;
      recoveries.forEach(clearTimeout); recoveries.clear();
      [0,350,900,1800].forEach(ms => {
        const timer=setTimeout(() => { recoveries.delete(timer); play(); },ms);
        recoveries.add(timer);
      });
    }

    async function enable() {
      if (!enabled) {
        enabled=true; generation++; delay=2500;
        if (!audio) makeAudio();
        document.addEventListener('visibilitychange',heal);
        global.addEventListener('pageshow',heal);
        global.addEventListener('focus',heal);
        global.addEventListener('online',heal);
        global.addEventListener('orientationchange',heal);
        heartbeat=setInterval(() => {
          if (!enabled || !audio) return;
          if (audio.paused) schedule();
          else {
            if (playingSince && Date.now()-playingSince > 45000) delay=2500;
            markMedia();
          }
        },4000);
      }
      return play();
    }

    function disable() {
      enabled=false; generation++;
      clearTimeout(retry); retry=null;
      clearInterval(heartbeat); heartbeat=null;
      recoveries.forEach(clearTimeout); recoveries.clear();
      document.removeEventListener('visibilitychange',heal);
      global.removeEventListener('pageshow',heal);
      global.removeEventListener('focus',heal);
      global.removeEventListener('online',heal);
      global.removeEventListener('orientationchange',heal);
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        try { audio.load(); } catch (_) {}
        try { audio.remove(); } catch (_) {}
        audio=null;
      }
      if (source) URL.revokeObjectURL(source);
      source='';
      try {
        if (navigator.mediaSession) {
          navigator.mediaSession.playbackState='none';
          navigator.mediaSession.metadata=null;
        }
      } catch (_) {}
      ownedMetadata=null; report();
    }

    return {
      enable, disable, resume:play,
      get enabled(){return enabled;},
      get playing(){return !!audio && !audio.paused && !audio.ended;}
    };
  };
})(window);
