// Service worker Spoties v1.51
// HTML en reseau d'abord (toujours la derniere version en ligne, cache en secours hors ligne).
// Icones et manifest en cache d'abord. Les API (Mapbox, meteo, Supabase...) restent en reseau direct.
// v1.44 : reception des notifications push et ouverture du bon ecran au toucher.
// v1.51 : le dossier c/ (app 6flt Clients) a son propre service worker, on ne s'en occupe pas ici.
const CACHE = 'spoties-v1-51';
const SHELL = ['./', './index.html', './manifest.json?v=1.51', './icon-180.png?v=1.51', './icon-192.png?v=1.51', './icon-512.png?v=1.51'];

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
  if(url.indexOf(new URL('c/', self.registration.scope).href)===0) return;
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

// notification recue : iOS exige qu'elle soit toujours affichee
self.addEventListener('push', function(e){
  var d = {};
  try{ d = e.data ? e.data.json() : {}; }catch(x){ d = {title:'Spoties', body:e.data ? e.data.text() : ''}; }
  var opts = {body:d.body || '', icon:'icon-192.png?v=1.51', badge:'icon-192.png?v=1.51', data:{url:d.url || './'}};
  if(d.tag) opts.tag = d.tag;
  e.waitUntil(self.registration.showNotification(d.title || 'Spoties', opts));
});

// toucher la notification : reprend l'app ouverte ou l'ouvre sur le bon ecran
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list){
    for(var i=0;i<list.length;i++){
      var c = list[i];
      if(c.url.indexOf(self.registration.scope)===0 && 'focus' in c){
        c.postMessage({type:'notif-go', url:target});
        return c.focus();
      }
    }
    return self.clients.openWindow(target);
  }));
});
