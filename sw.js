/* RL7 service worker — version 2026-09-17-v13flow1 */
const RL7_SW_VERSION='2026-09-17-v13flow1';
self.addEventListener('install',function(){ self.skipWaiting(); });
self.addEventListener('activate',function(event){
  event.waitUntil(self.clients.claim());
});
self.addEventListener('message',function(event){
  if(event.data && event.data.type==='SKIP_WAITING') self.skipWaiting();
});
/* No app assets or user data are cached here. */
