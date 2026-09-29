// Faux mapbox-gl : tout appel renvoie un objet factice
(function(){
  function any(){
    var f = function(){};
    return new Proxy(f, {
      get:function(t, k){ if(k==='then') return undefined; if(k===Symbol.toPrimitive) return function(){ return 0; }; if(k in t) return t[k]; return any(); },
      set:function(t, k, v){ t[k] = v; return true; },
      apply:function(){ return any(); },
      construct:function(){ return any(); }
    });
  }
  window.mapboxgl = any();
  window.mapboxgl.supported = function(){ return true; };
})();
