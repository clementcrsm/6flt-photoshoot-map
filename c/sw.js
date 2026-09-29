// Service worker 6flt Clients v1.0
// HTML en reseau d'abord, icones et manifest en cache d'abord. Meme schema que le sw.js de Spoties.
const CACHE = '6fltclients-v1-0';
const SHELL = ['./', './index.html', './manifest.json?v=1.0', './icon-180.png?v=1.0', './icon-192.png?v=1.0', './icon-512.png?v=1.0', './icon-512-maskable.png?v=1.0'];

self.addEventListener('install', function(e){
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
  if(url.indexOf('supabase.co')>-1 || url.indexOf('jsdelivr.net')>-1 || url.indexOf('cdnjs.cloudflare.com')>-1 ||
     url.indexOf('googleapis.com')>-1 || url.indexOf('gstatic.com')>-1){
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

self.addEventListener('push', function(e){
  var d = {};
  try{ d = e.data ? e.data.json() : {}; }catch(x){ d = {title:'6flt Clients', body:e.data ? e.data.text() : ''}; }
  var opts = {body:d.body || '', icon:'icon-192.png?v=1.0', badge:'icon-192.png?v=1.0', data:{url:d.url || './'}};
  if(d.tag) opts.tag = d.tag;
  e.waitUntil(self.registration.showNotification(d.title || '6flt Clients', opts));
});

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
