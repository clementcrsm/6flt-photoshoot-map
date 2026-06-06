// Service worker 6flt Spots
// Met en cache la coquille de l'app (HTML + icones) pour demarrage rapide et ouverture hors ligne.
// Les tuiles Mapbox et les API (meteo, golden hour) restent tributaires du reseau.
const CACHE = '6flt-spots-v3';
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
  var url = e.request.url;
  // Ne jamais mettre en cache les API distantes ni les tuiles : toujours reseau
  if(url.indexOf('api.mapbox.com')>-1 || url.indexOf('mapbox.com')>-1 ||
     url.indexOf('openweathermap.org')>-1 || url.indexOf('sunrise-sunset.org')>-1 ||
     url.indexOf('googleapis.com')>-1 || url.indexOf('gstatic.com')>-1 ||
     url.indexOf('supabase.co')>-1 || url.indexOf('jsdelivr.net')>-1){
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(resp){
        return resp;
      }).catch(function(){ return caches.match('./index.html'); });
    })
  );
});
