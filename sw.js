// Service worker 6flt Spots
// Coquille en cache pour demarrage rapide et hors ligne.
// HTML : reseau d'abord (toujours la derniere version en ligne, cache en secours hors ligne).
// Icones/manifest : cache d'abord (rapides, changent rarement).
// Tuiles Mapbox et API : toujours reseau, jamais en cache.
const CACHE = '6flt-spots-v5';
const SHELL = [
  './',
  './index.html',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  var url = req.url;
  // APIs distantes et tuiles : toujours reseau, pas de cache
  if(url.indexOf('api.mapbox.com')>-1 || url.indexOf('mapbox.com')>-1 ||
     url.indexOf('openweathermap.org')>-1 || url.indexOf('sunrise-sunset.org')>-1 ||
     url.indexOf('googleapis.com')>-1 || url.indexOf('gstatic.com')>-1 ||
     url.indexOf('supabase.co')>-1 || url.indexOf('jsdelivr.net')>-1){
    return;
  }
  // HTML / navigation : reseau d'abord, cache en secours
  var isHTML = req.mode==='navigate' ||
               (req.headers.get('accept')||'').indexOf('text/html')>-1 ||
               url.indexOf('index.html')>-1 || url.endsWith('/');
  if(isHTML){
    e.respondWith(
      fetch(req).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return resp;
      }).catch(function(){
        return caches.match(req).then(function(c){ return c || caches.match('./index.html'); });
      })
    );
    return;
  }
  // Reste (icones, manifest) : cache d'abord
  e.respondWith(
    caches.match(req).then(function(cached){
      return cached || fetch(req);
    })
  );
});
