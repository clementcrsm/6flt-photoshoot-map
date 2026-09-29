const fs=require('fs');const {JSDOM}=require('jsdom');
let fails=0;const check=(l,c)=>{console.log((c?'OK   ':'FAIL ')+l);if(!c)fails++;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function grab(src, head){ const i=src.indexOf(head); if(i<0) throw new Error('introuvable '+head); let j=src.indexOf('{',i),d=0,k=j,q=null; for(;k<src.length;k++){const ch=src[k],p=src[k-1]; if(q){ if(ch===q&&p!=='\\') q=null; continue;} if(ch==='/'&&src[k+1]==='/'&&p!=='\\'){ k=src.indexOf('\n',k); continue; } if(ch==="'"||ch==='"'){q=ch;continue;} if(ch==='{')d++; else if(ch==='}'){d--; if(d===0) break;}} return src.slice(i,k+1)+(head.indexOf('=')>-1?';':''); }
(async()=>{
  /* A. 6flt Clients : avis avec accord de publication */
  const cHtml=fs.readFileSync('/home/claude/6flt-photoshoot-map/c/index.html','utf8').replace(/<script src=[^>]*><\/script>/g,'').replace(/<link href=[^>]*>/g,'');
  const brief={revealed:true,reveal_at:null,confirmed_at:'2026-09-20T10:00:00Z',html:'<div class="bf-row" data-layout="1"><div class="bf-slot"><div class="bf-blk" data-type="text">x</div></div></div>',data:{title:'T',start:'2026-09-27T12:00:00Z',end:'2026-09-27T14:00:00Z',tone:'tu'},title:'Séance',gallery_url:'https://g.ex/j',review_rating:null,review_submitted_at:null};
  const rpc=[];
  const w=new JSDOM(cHtml,{url:'https://x.github.io/6flt-photoshoot-map/c/?b=TOKREV001',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
    w.matchMedia=()=>({matches:false});w.Notification=function(){};w.Notification.permission='default';
    w.supabase={createClient:()=>({rpc:(n,a)=>{rpc.push([n,a]);return Promise.resolve({data:n.indexOf('shared_brief')>-1?JSON.parse(JSON.stringify(brief)):true,error:null});}})};
  }}).window;
  await wait(150);
  const pub=w.document.getElementById('cv-review-pub');
  check('app client : case de publication presente et decochee par defaut', !!pub && pub.checked===false && /soit publié/.test(w.document.querySelector('.cv-pub').textContent));
  w.document.querySelectorAll('.cv-star')[4].click();
  w.document.getElementById('cv-review-text').value='Top';
  pub.checked=true;
  w.document.getElementById('cv-review-go').click(); await wait(50);
  const sent=rpc.find(r=>r[0]==='submit_shared_review');
  check('app client : avis envoye avec la note, le texte et l\'accord', sent && sent[1].p_rating===5 && sent[1].p_text==='Top' && sent[1].p_public===true);
  check('app client : remerciement affiche', /Merci pour ton avis/.test(w.document.getElementById('cv-root').innerHTML));

  /* B. Spoties : avis dans la fiche client */
  const main=[...fs.readFileSync('/home/claude/6flt-photoshoot-map/index.html','utf8').matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1])[1];
  const d2=new JSDOM('<!doctype html><body><div id="client-links" style="display:none"><div id="client-links-list"></div></div><b id="pf-rev-n"></b><span id="pf-rev-sub"></span><b id="pf-share-n"></b><span id="pf-share-sub"></span></body>',{runScripts:'outside-only'});
  const w2=d2.window;
  w2.sb={from:()=>({select:(cols)=>{ const res={data:[{token:'TOKA',views:3,confirmed_at:'x',gallery_url:'https://g',review_rating:4,review_text:'Super <b>séance</b>',review_public:true},{token:'TOKB',views:1,review_rating:5,review_text:null,review_public:false},{token:'TOKC',views:0,revoked:false}],error:null}; const p=Promise.resolve(res); p.in=()=>Promise.resolve(res); return p; }})};
  w2.eval(`
    var sb=window.sb, currentUserId='u1', currentClientId='c1', SHARE_CACHE=null;
    function showToast(){} function escapeHtml(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function pfEl(id){ return document.getElementById(id); } function pfBriefings(){ return []; }
    window.bfShareInfo=function(){ return [{token:'TOKA',title:'Briefing A',when:'27 sept.',url:'u',msg:'m'},{token:'TOKB',title:'Briefing B',when:'Date à fixer',url:'u2',msg:'m2'}]; };
    var CLIENT_APP = {};
    var RELANCE_LABEL = {relance:'Relancer pour la confirmation', tbd:'Relancer pour la date', rappel:'Envoyer un rappel', avis:'Demander un avis', reveal:'Prévenir : adresses disponibles', suivi:'Écrire au client'};
    function relanceKind(it, r){ if(r && r.gallery_url) return r.review_rating ? 'suivi' : 'avis'; if(r && r.confirmed_at) return 'rappel'; return it && it.date ? 'relance' : 'tbd'; }
    ${grab(main,'function clinkCopy(')}
    ${grab(main,'function renderClientLinks(')+'\nvar DATE_PROPS = {};\n'+grab(main,'function propTime(')+'\n'+grab(main,'function propLabel(')+'\n'+grab(main,'function answerProp(')+'\n'+grab(main,'function relanceDate(')}
    ${grab(main,'function pfLoadShareStats(')}
  `);
  w2.eval('renderClientLinks()'); await wait(30);
  const items=w2.document.querySelectorAll('.clink-item');
  check('fiche : avis avec etoiles et texte', /★★★★☆/.test(items[0].textContent) && /« Super <b>séance<\/b> »/.test(items[0].textContent) && items[0].querySelectorAll('b').length===0);
  check('fiche : accord de publication affiche', /Publication autorisée/.test(items[0].textContent) && /Avis privé/.test(items[1].textContent));
  check('fiche : note seule quand pas de texte', /★★★★★/.test(items[1].textContent) && /Note 5\/5/.test(items[1].textContent));
  w2.eval('pfLoadShareStats()'); await wait(30);
  check('statistiques : moyenne 4,5/5 et 2 avis dont 1 publiable', w2.document.getElementById('pf-rev-n').textContent==='4,5/5' && w2.document.getElementById('pf-rev-sub').textContent==='2 avis clients · 1 publiable');
  console.log(fails?fails+' ECHEC(S)':'TOUS LES TESTS PASSENT');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
