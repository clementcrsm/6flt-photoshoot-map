const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('/home/claude/6flt-photoshoot-map/c/index.html','utf8').replace(/<script src=[^>]*><\/script>/g,'').replace(/<link href=[^>]*>/g,'');
let fails=0;const check=(l,c)=>{console.log((c?'OK   ':'FAIL ')+l);if(!c)fails++;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const brief={revealed:true,reveal_at:null,confirmed_at:null,html:'<div class="bf-row" data-layout="1"><div class="bf-slot"><div class="bf-blk" data-type="text">x</div></div></div>',data:{title:'T',start:'2026-10-15T12:00:00Z',end:'2026-10-15T14:00:00Z',tone:'tu'},title:'Séance test'};
function boot(o){
  const rpc=[];
  const w=new JSDOM(html,{url:'https://x.github.io/6flt-photoshoot-map/c/'+(o.search||''),runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
    Object.defineProperty(w.navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1'});
    Object.defineProperty(w.navigator,'standalone',{value:true});
    w.matchMedia=()=>({matches:false});
    w.Notification=function(){}; w.Notification.permission=o.perm||'default';
    w.Notification.requestPermission=()=>{ w.__asked=(w.__asked||0)+1; w.Notification.permission=o.answer||'granted'; return Promise.resolve(w.Notification.permission); };
    w.PushManager=function(){};
    const sub={endpoint:'https://push.apple.com/abc',toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'P',auth:'A'}};}};
    const reg={pushManager:{getSubscription:()=>Promise.resolve(o.hasSub?sub:null),subscribe:()=>{ w.__subscribed=(w.__subscribed||0)+1; return o.subFail?Promise.reject(new Error('AbortError: push service error')):Promise.resolve(sub);}}};
    Object.defineProperty(w.navigator,'serviceWorker',{value:{register:()=>Promise.resolve(reg),ready:o.swHang?new Promise(()=>{}):Promise.resolve(reg),addEventListener(){}}});
    (o.storage||[]).forEach(([k,v])=>w.localStorage.setItem(k,v));
    w.supabase={createClient:()=>({rpc:(n,a)=>{rpc.push([n,a.p_token]);return Promise.resolve({data:n.indexOf('shared_brief')>-1?brief:true,error:null});}})};
  }}).window;
  return {w,rpc};
}
const stored=[['6fltc_tokens','[{"token":"TEST6fltClients29"}]'],['6fltc_imported','["TEST6fltClients29"]']];
(async()=>{
  // cas de Clement : autorisation deja accordee, aucun abonnement
  let {w,rpc}=boot({perm:'granted',hasSub:false,storage:stored}); await wait(150);
  let lst=w.document.getElementById('view-list').innerHTML;
  check('autorisation accordee sans abonnement : bandeau Termine l\'activation', /Termine l'activation/.test(lst) && /js-enable-notif/.test(lst));
  w.document.querySelector('.js-enable-notif').click(); await wait(100);
  check('toucher : abonnement cree', w.__subscribed===1);
  check('toucher : seance enregistree au serveur', rpc.some(r=>r[0]==='client_register_push'&&r[1]==='TEST6fltClients29'));
  check('toucher : notif de test envoyee', rpc.some(r=>r[0]==='client_test_notify'));
  check('bandeau Notifications activees', /Notifications activées/.test(w.document.getElementById('view-list').innerHTML));
  // ouverture avec abonnement existant : resynchro silencieuse
  ({w,rpc}=boot({perm:'granted',hasSub:true,storage:stored})); await wait(150);
  check('ouverture avec abonnement : renvoye au serveur sans rien afficher', rpc.some(r=>r[0]==='client_register_push') && !/Termine l'activation/.test(w.document.getElementById('view-list').innerHTML));
  // premier passage normal
  ({w,rpc}=boot({perm:'default',storage:stored})); await wait(150);
  w.document.querySelector('.js-enable-notif').click(); await wait(100);
  check('premiere activation : autorisation demandee au toucher', w.__asked===1);
  check('premiere activation : enregistree + test', rpc.some(r=>r[0]==='client_register_push') && rpc.some(r=>r[0]==='client_test_notify'));
  // echec de l'abonnement : raison affichee + reessayer
  ({w,rpc}=boot({perm:'default',subFail:true,storage:stored})); await wait(150);
  w.document.querySelector('.js-enable-notif').click(); await wait(100);
  lst=w.document.getElementById('view-list').innerHTML;
  check('echec : raison affichee', /push service error/.test(lst));
  check('echec : bouton Reessayer', /Réessayer/.test(lst));
  // refus
  ({w,rpc}=boot({perm:'default',answer:'denied',storage:stored})); await wait(150);
  w.document.querySelector('.js-enable-notif').click(); await wait(100);
  check('refus : message Notifications desactivees', /Notifications désactivées/.test(w.document.getElementById('view-list').innerHTML));
  // service worker bloque : message apres delai (delai raccourci impossible, on verifie juste l'etat en cours)
  ({w,rpc}=boot({perm:'default',swHang:true,storage:stored})); await wait(150);
  w.document.querySelector('.js-enable-notif').click(); await wait(100);
  check('service worker lent : Activation en cours affiche', /Activation en cours/.test(w.document.getElementById('view-list').innerHTML));
  console.log(fails?fails+' ECHEC(S)':'TOUS LES TESTS PASSENT');process.exit(fails?1:0);
})();
