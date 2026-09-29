// Faux supabase-js pour les tests pleine page : base en memoire (window.__DB), journal (window.__LOG), RPC configurables (window.__RPC)
(function(){
  var DB = window.__DB = window.__DB || {};
  var LOG = window.__LOG = window.__LOG || [];
  var RPC = window.__RPC = window.__RPC || {};
  function clone(o){ return o==null ? o : JSON.parse(JSON.stringify(o)); }
  function Q(t){ this.t = t; this.op = 'select'; this.f = []; this.p = null; this.one = false; }
  Q.prototype.select = function(){ return this; };
  Q.prototype.eq = function(k, v){ this.f.push(function(r){ return r[k]===v; }); return this; };
  Q.prototype.neq = function(k, v){ this.f.push(function(r){ return r[k]!==v; }); return this; };
  Q.prototype.in = function(k, a){ this.f.push(function(r){ return (a||[]).indexOf(r[k])>-1; }); return this; };
  ['gt','gte','lt','lte','order','limit','range','is','not','or','match','filter','contains','like','ilike'].forEach(function(n){ Q.prototype[n] = function(){ return this; }; });
  Q.prototype.maybeSingle = function(){ this.one = true; return this; };
  Q.prototype.single = function(){ this.one = true; return this; };
  Q.prototype.upsert = function(o){ this.op = 'upsert'; this.p = o; return this; };
  Q.prototype.insert = function(o){ this.op = 'insert'; this.p = o; return this; };
  Q.prototype.update = function(o){ this.op = 'update'; this.p = o; return this; };
  Q.prototype.delete = function(){ this.op = 'delete'; return this; };
  Q.prototype.exec = function(){
    var self = this, rows = DB[this.t] = DB[this.t] || [];
    var match = function(r){ return self.f.every(function(f){ return f(r); }); };
    LOG.push({t:this.t, op:this.op, p:clone(this.p)});
    if(this.op==='select'){ var out = rows.filter(match); return {data:this.one ? clone(out[0]||null) : clone(out), error:null}; }
    if(this.op==='upsert' || this.op==='insert'){
      var key = this.t==='shared_briefings' ? 'token' : 'id';
      (Array.isArray(this.p) ? this.p : [this.p]).forEach(function(o){
        var i = -1; rows.forEach(function(r, k){ if(r[key]===o[key]) i = k; });
        if(i>-1) rows[i] = Object.assign({}, rows[i], clone(o)); else rows.push(clone(o));
      });
      return {data:null, error:null};
    }
    if(this.op==='update'){ var p = this.p; rows.filter(match).forEach(function(r){ Object.assign(r, clone(p)); }); return {data:null, error:null}; }
    if(this.op==='delete'){ DB[this.t] = rows.filter(function(r){ return !match(r); }); return {data:null, error:null}; }
  };
  Q.prototype.then = function(a, b){ var s = this; return new Promise(function(r){ setTimeout(function(){ r(s.exec()); }, 5); }).then(a, b); };
  var user = {id:'u1', email:'t@t.fr'};
  var client = {
    from:function(t){ return new Q(t); },
    rpc:function(n, a){ LOG.push({rpc:n, a:clone(a)}); var f = RPC[n], d, er = null; try{ d = f ? f(a) : true; }catch(x){ er = {message:'rpc en erreur'}; d = null; } return new Promise(function(r){ setTimeout(function(){ r({data:clone(d), error:er}); }, 5); }); },
    auth:{
      getSession:function(){ return Promise.resolve({data:{session:{user:user}}, error:null}); },
      getUser:function(){ return Promise.resolve({data:{user:user}, error:null}); },
      onAuthStateChange:function(){ return {data:{subscription:{unsubscribe:function(){}}}}; },
      signOut:function(){ return Promise.resolve({}); }
    },
    storage:{from:function(){ return {upload:function(){ return Promise.resolve({error:null}); }, getPublicUrl:function(n){ return {data:{publicUrl:'https://x/'+n}}; }}; }},
    functions:{invoke:function(){ return Promise.resolve({data:null, error:null}); }},
    channel:function(){ var c = {on:function(){ return c; }, subscribe:function(){ return c; }}; return c; },
    removeChannel:function(){}
  };
  window.supabase = {createClient:function(){ return client; }};
})();
