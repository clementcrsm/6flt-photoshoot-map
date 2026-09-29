const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('/home/claude/6flt-photoshoot-map/c/index.html','utf8').replace(/<script src=[^>]*><\/script>/g,'').replace(/<link [^>]*>/g,'');
let fails=0;const check=(l,c)=>{console.log((c?'OK   ':'FAIL ')+l);if(!c)fails++;};
const brief=(g)=>({revealed:true,reveal_at:null,confirmed_at:'2026-09-20T10:00:00Z',html:'<div class="bf-row" data-layout="1"><div class="bf-slot"><div class="bf-blk" data-type="text">x</div></div></div>',data:{title:'T',start:'2026-09-27T12:00:00Z',end:'2026-09-27T14:00:00Z',tone:'tu'},title:'Séance Jeremy',gallery_url:g,review_rating:null,review_submitted_at:null});
const dom=new JSDOM(html,{url:'https://x.github.io/6flt-photoshoot-map/c/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.supabase={createClient:()=>({rpc:(n,a)=>Promise.resolve({data:(n==='get_shared_brief'||n==='peek_shared_brief')?brief(a.p_token==='G'?'https://g.ex/j':null):true,error:null})})};
  w.Notification=function(){};w.Notification.permission='default';w.Notification.requestPermission=()=>Promise.resolve('default');
  w.matchMedia=()=>({matches:false});
  w.localStorage.setItem('6fltc_tokens',JSON.stringify([{token:'G'},{token:'N'}]));
}});
const w=dom.window;
setTimeout(()=>{
  const list=w.document.getElementById('view-list').innerHTML;
  check('liste : badge Galerie prête sur la séance avec galerie',/Galerie prête/.test(list));
  check('liste : badge Confirmée sur la séance sans galerie',/Confirmée/.test(list));
  w.openDetail('G');
  setTimeout(()=>{
    const d=w.document.getElementById('cv-root').innerHTML;
    check('detail : bandeau galerie en haut',/Ta galerie est prête/.test(d)&&d.indexOf('Ta galerie est prête')<d.indexOf('bf-doc'));
    check('detail : bloc avis toujours present',/cv-stars/.test(d));
    w.closeDetail(); w.openDetail('N');
    setTimeout(()=>{
      check('detail sans galerie : pas de bandeau',!/Ta galerie est prête/.test(w.document.getElementById('cv-root').innerHTML));
      console.log(fails?fails+' ECHEC(S)':'TOUS LES TESTS PASSENT');process.exit(fails?1:0);
    },50);
  },50);
},200);
