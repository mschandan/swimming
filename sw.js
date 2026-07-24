/* Lane 1 — offline app shell cache.
   Caches the app itself (HTML/CSS/JS/icons), NOT the Google Sheet data —
   member data always needs a live fetch. This just means the gate device
   can open the app even if wifi drops for a moment; scanning still needs
   a loaded member list (cached in localStorage separately by the app).

   NETWORK-FIRST for index.html/config.js: those two change whenever I
   ship a fix, and a stale cached copy would silently freeze the app on
   an old version. Icons/manifest rarely change, so they're cache-first
   for speed. Bump CACHE below if a hard reset is ever needed. */
const CACHE = 'lane1-shell-v2';
const FRESH = ['/', '/index.html', '/config.js'];   // network-first
const STATIC = ['./manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-64.png']; // cache-first

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>
    Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  if(url.origin !== location.origin) return;  // never touch the sheet fetch or anything cross-origin

  const isFresh = FRESH.some(p => url.pathname===p || url.pathname.endsWith(p.replace('./','/')));

  if(isFresh){
    e.respondWith(
      fetch(e.request).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request, copy));
        return res;
      }).catch(()=> caches.match(e.request).then(hit=> hit || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit=> hit || fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request, copy));
      return res;
    }))
  );
});
