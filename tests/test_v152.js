const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('/home/claude/6flt-photoshoot-map/index.html','utf8');
const main=[...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1])[1];
let fails=0;const check=(l,c)=>{console.log((c?'OK   ':'FAIL ')+l);if(!c)fails++;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function grab(src, head){ const i=src.indexOf(head); if(i<0) throw new Error('introuvable '+head); let j=src.indexOf('{',i),d=0,k=j,q=null; for(;k<src.length;k++){const ch=src[k],p=src[k-1]; if(q){ if(ch===q&&p!=='\\') q=null; continue;} if(ch==='/'&&src[k+1]==='/'&&p!=='\\'){ k=src.indexOf('\n',k); continue; } if(ch==="'"||ch==='"'){q=ch;continue;} if(ch==='{')d++; else if(ch==='}'){d--; if(d===0) break;}} return src.slice(i,k+1)+(head.indexOf('=')>-1?';':''); }
const infoSrc=grab(main,'window.bfShareInfo = function');
const fdateSrc=grab(main,'function fdate(');
const firstSrc=grab(main,'function firstName(');
const linksSrc=grab(main,'function clinkCopy(')+'\n'+grab(main,'function renderClientLinks(')+'\nvar DATE_PROPS = {};\n'+grab(main,'function propTime(')+'\n'+grab(main,'function propLabel(')+'\n'+grab(main,'function answerProp(')+'\n'+grab(main,'function relanceDate(');
check('HTML : section Lien client sous le contact', html.indexOf('id="client-links"') > html.indexOf('id="client-contact"') && html.indexOf('id="client-links"') < html.indexOf('Shootings planifies'));
(async()=>{
  const dom=new JSDOM('<!doctype html><body><div id="client-links" style="display:none"><div id="client-links-list"></div></div></body>',{runScripts:'outside-only',url:'https://clementcrsm.github.io/6flt-photoshoot-map/'});
  const w=dom.window; const shared=[], copied=[], toasts=[], queries=[];
  w.navigator.share=(o)=>{ shared.push(o); return Promise.resolve(); };
  Object.defineProperty(w.navigator,'clipboard',{value:{writeText:(t)=>{ copied.push(t); return Promise.resolve(); }}});
  w.sb={from:(t)=>({select:()=>({in:(k,v)=>{ if(t!=='shared_briefings') return Promise.resolve({data:[],error:null}); queries.push(v); return Promise.resolve({data:[{token:'TOKA',views:3,confirmed_at:'2026-09-20T10:00:00Z',gallery_url:'https://g/x'},{token:'TOKB',views:0}],error:null}); }})})};
  w.eval(`
    var sb=window.sb, currentUserId='u1', currentClientId='c1', SHARE_CACHE=null, S={cloud:true};
    var SHARE_BASE='https://clementcrsm.github.io/6flt-photoshoot-map/';
    function loadCloud(){}
    function showToast(m){ window.__toasts=(window.__toasts||[]); window.__toasts.push(m); }
    function escapeHtml(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function getClient(id){ return id==='c1' ? {id:'c1', name:'Jeremy Durand'} : null; }
    ${fdateSrc}
    ${firstSrc}
    var briefings=[
      {id:'a', clientId:'c1', title:'Briefing Jeremy, 27 sept.', date:'2026-09-27', tone:'tu', share:{token:'TOKA'}},
      {id:'b', clientId:'c1', title:'Briefing Jeremy, printemps', date:'', tone:'vous', share:{token:'TOKB'}},
      {id:'c', clientId:'c1', title:'Ancien', date:'2026-05-01', share:{token:'TOKC', revoked:true}},
      {id:'d', clientId:'c2', title:'Autre client', date:'2026-10-01', share:{token:'TOKD'}},
      {id:'e', clientId:'c1', title:'Sans lien', date:'2026-11-01'}
    ];
    ${infoSrc}
    var CLIENT_APP = {};
    var RELANCE_LABEL = {relance:'Relancer pour la confirmation', tbd:'Relancer pour la date', rappel:'Envoyer un rappel', avis:'Demander un avis', reveal:'Prévenir : adresses disponibles', suivi:'Écrire au client'};
    function relanceKind(it, r){ if(r && r.gallery_url) return r.review_rating ? 'suivi' : 'avis'; if(r && r.confirmed_at) return 'rappel'; return it && it.date ? 'relance' : 'tbd'; }
    ${linksSrc}
  `);
  const info=w.eval('window.bfShareInfo("c1")');
  check('bfShareInfo : seulement les liens actifs du client', info.length===2 && info.map(x=>x.token).join()==='TOKA,TOKB');
  check('bfShareInfo : lien vers c/?b=', info[0].url==='https://clementcrsm.github.io/6flt-photoshoot-map/c/?b=TOKA');
  check('bfShareInfo : message tutoiement avec prenom et date', /^Bonjour Jeremy,/.test(info[0].msg) && /Voici ton briefing pour la séance du/.test(info[0].msg) && info[0].msg.indexOf(info[0].url)>-1);
  check('bfShareInfo : message vouvoiement sans date', /Dites-moi quel jour vous convient/.test(info[1].msg) && /À bientôt/.test(info[1].msg) && info[1].when==='Date à fixer');
  w.eval('renderClientLinks()');
  const wrap=w.document.getElementById('client-links');
  check('fiche : section visible', wrap.style.display==='');
  check('fiche : 2 liens avec boutons', w.document.querySelectorAll('.clink-item').length===2 && w.document.querySelectorAll('[data-lact="share"]').length===2);
  await wait(20);
  const txt=w.document.getElementById('client-links-list').textContent;
  check('fiche : statut a jour (ouvertures, confirme, galerie)', /ouvert 3 fois, confirmé, galerie envoyée/.test(txt) && /pas encore ouvert/.test(txt));
  check('fiche : une seule requete de statut (pas de boucle)', queries.length===1);
  w.document.querySelector('[data-lact="share"][data-i="0"]').click(); await wait(10);
  check('Partager : feuille de partage avec lien et message', shared.length===1 && shared[0].url.indexOf('c/?b=TOKA')>-1 && /Bonjour Jeremy/.test(shared[0].text) && shared[0].text.indexOf('c/?b=')<0);
  w.document.querySelector('[data-lact="copy"][data-i="1"]').click(); await wait(10);
  check('Copier : lien copie + toast', copied[0]==='https://clementcrsm.github.io/6flt-photoshoot-map/c/?b=TOKB' && (w.__toasts||[]).indexOf('Lien copié')>-1);
  w.eval('currentClientId="c2"; renderClientLinks()');
  check('autre client : son propre lien', w.document.querySelectorAll('.clink-item').length===1);
  w.eval('currentClientId="c3"; renderClientLinks()');
  check('client sans lien : section masquee', wrap.style.display==='none');
  console.log(fails?fails+' ECHEC(S)':'TOUS LES TESTS PASSENT');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
