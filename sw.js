/* RL7 service worker — version 2026-09-16-badge-v2 */
const RL7_SW_VERSION='2026-09-16-badge-v2';
self.addEventListener('install',function(){});
self.addEventListener('activate',function(event){
  event.waitUntil(self.clients.claim());
});
self.addEventListener('message',function(event){
  if(event.data && event.data.type==='SKIP_WAITING') self.skipWaiting();
});
/* Network behavior is intentionally left untouched: this worker exists for
   reliable lifecycle/update detection without caching user data or app assets. */
