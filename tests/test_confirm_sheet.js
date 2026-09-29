const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('/home/claude/6flt-photoshoot-map/c/index.html','utf8').replace(/<script src=[^>]*><\/script>/g,'').replace(/<link href=[^>]*>/g,'');
let fails=0;const check=(l,c)=>{console.log((c?'OK   ':'FAIL ')+l);if(!c)fails++;};
const brief={revealed:true,reveal_at:null,confirmed_at:null,html:'<div class="bf-row" data-layout="1"><div class="bf-slot"><div class="bf-blk" data-type="text">x</div></div></div>',data:{title:'T',start:'2026-10-15T12:00:00Z',end:'2026-10-15T14:00:00Z',tone:'tu',handle:'_6flt_'},title:'Séance test'};
function boot(standalone){ return new JSDOM(html,{url:'https://x.github.io/6flt-photoshoot-map/c/?b=TEST6fltClients29',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  Object.defineProperty(w.navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'});
  if(standalone) Object.defineProperty(w.navigator,'standalone',{value:true});
  w.matchMedia=()=>({matches:false});w.Notification=function(){};w.Notification.permission='default';w.Notification.requestPermission=()=>Promise.resolve('default');
  w.supabase={createClient:()=>({rpc:(n)=>Promise.resolve({data:n.indexOf('shared_brief')>-1?JSON.parse(JSON.stringify(brief)):true,error:null})})};
}}).window; }
(async()=>{
  let w=boot(false); await new Promise(r=>setTimeout(r,150));
  w.document.getElementById('cv-conf').click(); await new Promise(r=>setTimeout(r,900));
  const sh=w.document.getElementById('inst-sheet');
  check('apres confirmation (Safari) : guide ouvert automatiquement', w.getComputedStyle(sh).display==='flex' && /Séance confirmée/.test(sh.innerHTML) && /Dernière étape/.test(sh.innerHTML));
  check('bouton passe en Seance confirmee', /Séance confirmée/.test(w.document.getElementById('cv-conf').textContent));
  w=boot(true); await new Promise(r=>setTimeout(r,150));
  w.document.getElementById('cv-conf').click(); await new Promise(r=>setTimeout(r,900));
  check('app deja installee : pas de guide apres confirmation', w.getComputedStyle(w.document.getElementById('inst-sheet')).display==='none');
  console.log(fails?fails+' ECHEC(S)':'TOUS LES TESTS PASSENT');process.exit(fails?1:0);
})();
