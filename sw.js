/* RL7 service worker — version 2026-09-17-v14fit1 */
const RL7_SW_VERSION='2026-09-17-v14fit1';
self.addEventListener('install',function(){self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim());});
self.addEventListener('message',function(e){if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();});
