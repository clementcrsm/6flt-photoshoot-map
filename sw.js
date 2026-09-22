// Service worker Spoties v1.30
// HTML en reseau d'abord (toujours la derniere version en ligne, cache en secours hors ligne).
// Icones et manifest en cache d'abord. Les API (Mapbox, meteo, Supabase...) restent en reseau direct.
const CACHE = 'spoties-v1-30';
const SHELL = ['./', './index.html', './manifest.json?v=1.30', './icon-180.png?v=1.30', './icon-192.png?v=1.30', './icon-512.png?v=1.30'];

self.addEventListener('install', function(e){
  // chaque fichier est mis en cache separement : un fichier absent ne bloque plus l'installation
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(SHELL.map(function(u){ return c.add(u).catch(function(){}); }));
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  var req = e.request, url = req.url;
  if(req.method!=='GET') return;
  if(url.indexOf('mapbox.com')>-1 || url.indexOf('openweathermap.org')>-1 || url.indexOf('sunrise-sunset.org')>-1 ||
     url.indexOf('googleapis.com')>-1 || url.indexOf('gstatic.com')>-1 || url.indexOf('supabase.co')>-1 ||
     url.indexOf('jsdelivr.net')>-1 || url.indexOf('mapillary.com')>-1){
    return;
  }
  var isHTML = req.mode==='navigate' || (req.headers.get('accept')||'').indexOf('text/html')>-1;
  if(isHTML){
    e.respondWith(fetch(req).then(function(resp){
      if(resp && resp.ok){ var copy = resp.clone(); caches.open(CACHE).then(function(c){ c.put('./index.html', copy); }); }
      return resp;
    }).catch(function(){
      return caches.match(req).then(function(r){ return r || caches.match('./index.html'); });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function(cached){ return cached || fetch(req); }));
});
