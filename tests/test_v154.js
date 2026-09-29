const fs=require('fs');const {JSDOM}=require('jsdom');
let fails=0;const check=(l,c)=>{console.log((c?'OK   ':'FAIL ')+l);if(!c)fails++;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function grab(src, head){ const i=src.indexOf(head); if(i<0) throw new Error('introuvable '+head); let j=src.indexOf('{',i),d=0,k=j,q=null; for(;k<src.length;k++){const ch=src[k],p=src[k-1]; if(q){ if(ch===q&&p!=='\\') q=null; continue;} if(ch==='/'&&src[k+1]==='/'&&p!=='\\'){ k=src.indexOf('\n',k); continue; } if(ch==="'"||ch==='"'){q=ch;continue;} if(ch==='{')d++; else if(ch==='}'){d--; if(d===0) break;}} return src.slice(i,k+1)+(head.indexOf('=')>-1?';':''); }
function grabVar(src, head){ const i=src.indexOf(head); const e=src.indexOf(';\n', i); return src.slice(i, e+1); }
const main=[...fs.readFileSync('/home/claude/6flt-photoshoot-map/index.html','utf8').matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1])[1];
(async()=>{
  /* A. fiche client : statut app, bouton contextuel, carte de relance */
  const d=new JSDOM('<!doctype html><body><div id="client-links" style="display:none"><div id="client-links-list"></div></div></body>',{runScripts:'outside-only',url:'https://clementcrsm.github.io/6flt-photoshoot-map/'});
  const w=d.window; const calls=[];
  Object.defineProperty(w.navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/26.5 Mobile Safari/604.1'});
  Object.defineProperty(w.navigator,'clipboard',{value:{writeText:t=>{ calls.push(['copy',t]); return Promise.resolve(); }}});
  const rows={shared_briefings:[{token:'TOKA',views:2,confirmed_at:null},{token:'TOKB',views:5,confirmed_at:'x',gallery_url:'https://g',review_rating:null}], client_push_subscriptions:[{token:'TOKA'}]};
  w.sb={from:(t)=>({select:()=>{ const res={data:rows[t],error:null}; return {in:()=>Promise.resolve(res), eq:(k,v)=>({limit:()=>Promise.resolve({data:(rows[t]||[]).filter(x=>x[k]===v),error:null})})}; }}), rpc:(n,a)=>{ calls.push([n,a]); return Promise.resolve({data:true,error:null}); }};
  w.eval(`
    var sb=window.sb, currentUserId='u1', currentClientId='c1', SHARE_CACHE=null;
    var clients=[{id:'c1', name:'Jeremy Durand', phone:'06 12 34 56 78', email:'', insta:'@titi_7.5r', contact:'jeremy@mail.fr'}];
    function showToast(m){ window.__t=(window.__t||[]); window.__t.push(m); }
    function escapeHtml(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    window.bfShareInfo=function(){ return [
      {token:'TOKA',title:'Briefing A',when:'mardi 14 octobre',url:'https://x/c/?b=TOKA',msg:'m',date:'2026-10-14',vous:false},
      {token:'TOKB',title:'Briefing B',when:'27 sept.',url:'https://x/c/?b=TOKB',msg:'m',date:'2026-09-27',vous:true}]; };
    ${grabVar(main,'var CLIENT_APP = {}')}
    ${grabVar(main,'var RELANCE_LABEL = {')}
    ${grab(main,'function relanceKind(')}
    ${grab(main,'function relanceDate(')}
    ${grab(main,'function relanceText(')}
    ${grab(main,'function openRelanceCard(')}
    ${grab(main,'function clinkCopy(')}
    ${grab(main,'function renderClientLinks(')+'\nvar DATE_PROPS = {};\n'+grab(main,'function propTime(')+'\n'+grab(main,'function propLabel(')+'\n'+grab(main,'function answerProp(')+'\n'+grab(main,'function relanceDate(')}
  `);
  w.eval('renderClientLinks()'); await wait(40);
  const items=w.document.querySelectorAll('.clink-item');
  check('fiche : App installee / Pas d\'app', /App installée/.test(items[0].innerHTML) && /Pas d'app/.test(items[1].innerHTML));
  check('fiche : bouton selon l\'etape (confirmation / avis)', /Relancer pour la confirmation/.test(items[0].textContent) && /Demander un avis/.test(items[1].textContent));
  items[0].querySelector('[data-lact="relance"]').click(); await wait(20);
  const card=w.document.getElementById('ntf-ready');
  check('relance : carte avec message pret au tutoiement', !!card && /^Bonjour Jeremy, je reviens vers toi pour la séance du mercredi 14 octobre/.test(card.querySelector('.ntf-txt').value) && /c\/\?b=TOKA/.test(card.querySelector('.ntf-txt').value));
  const chans=[...card.querySelectorAll('[data-ch]')].filter(b=>!b.hidden).map(b=>b.getAttribute('data-ch'));
  check('relance : canaux disponibles (app, SMS, e-mail via ancien contact, Instagram, copier)', chans.join()==='app,sms,mail,ig,copy');
  let loc=null; Object.defineProperty(w,'__setLoc',{value:1});
  card.querySelector('[data-ch="app"]').click(); await wait(20);
  const sent=calls.find(c=>c[0]==='owner_notify_client');
  check('notif app : envoyee au bon jeton, sans le lien dans le texte', sent && sent[1].p_token==='TOKA' && !/https?:/.test(sent[1].p_body) && /Tu as pu regarder le briefing/.test(sent[1].p_body));
  check('notif app : carte fermee + toast', !w.document.getElementById('ntf-ready') && (w.__t||[]).indexOf('Notif envoyée dans son app')>-1);
  // relance B (vous, avis) sans app
  w.document.querySelectorAll('.clink-item')[1].querySelector('[data-lact="relance"]').click(); await wait(20);
  const card2=w.document.getElementById('ntf-ready');
  check('avis : message au vouvoiement', /j'espère que les photos vous plaisent/.test(card2.querySelector('.ntf-txt').value));
  check('avis : pas de bouton notif app (client sans app)', card2.querySelector('[data-ch="app"]').hidden===true);
  // lien SMS iOS
  const smsHref=[]; 
  const txtv=card2.querySelector('.ntf-txt').value;
  const kind=w.eval('relanceKind({date:""}, null)');
  check('etat sans date : relance pour la date', kind==='tbd');
  /* B. 6flt Clients : notif qui ouvre la bonne seance */
  const cHtml=fs.readFileSync('/home/claude/6flt-photoshoot-map/c/index.html','utf8').replace(/<script src=[^>]*><\/script>/g,'').replace(/<link href=[^>]*>/g,'');
  const brief={revealed:true,reveal_at:null,confirmed_at:null,html:'<div class="bf-row" data-layout="1"><div class="bf-slot"><div class="bf-blk" data-type="text">x</div></div></div>',data:{title:'T',start:'2026-10-15T12:00:00Z',end:'2026-10-15T14:00:00Z',tone:'tu'},title:'Séance'};
  function boot(search, stored, standalone){
    const rpc=[]; let msgL=null;
    const w=new JSDOM(cHtml,{url:'https://x.github.io/6flt-photoshoot-map/c/'+search,runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
      if(standalone) Object.defineProperty(w.navigator,'standalone',{value:true});
      w.matchMedia=()=>({matches:false});w.Notification=function(){};w.Notification.permission='granted';w.PushManager=function(){};
      const reg={pushManager:{getSubscription:()=>Promise.resolve({endpoint:'e',toJSON(){return {endpoint:'e',keys:{p256dh:'p',auth:'a'}};}})}};
      Object.defineProperty(w.navigator,'serviceWorker',{value:{register:()=>Promise.resolve(reg),ready:Promise.resolve(reg),addEventListener(t,f){ if(t==='message') w.__swmsg=f; }}});
      w.localStorage.setItem('6fltc_tokens', JSON.stringify(stored.map(t=>({token:t}))));
      w.localStorage.setItem('6fltc_imported', JSON.stringify(stored));
      w.supabase={createClient:()=>({rpc:(n,a)=>{rpc.push([n,a.p_token]);return Promise.resolve({data:n.indexOf('shared_brief')>-1?JSON.parse(JSON.stringify(brief)):true,error:null});}})};
    }}).window;
    return {w,rpc};
  }
  let {w:c1,rpc}=boot('?open=TOKBBB222', ['TOKAAA111','TOKBBB222'], true); await wait(150);
  check('app installee lancee par une notif : la bonne seance s\'ouvre', c1.document.getElementById('cv-root').classList.contains('open') && rpc.some(r=>r[0]==='get_shared_brief'&&r[1]==='TOKBBB222'));
  check('adresse nettoyee', c1.location.search==='');
  ({w:c1,rpc}=boot('?open=INCONNU999', ['TOKAAA111'], true)); await wait(150);
  check('notif d\'une seance retiree : liste, pas d\'ouverture', !c1.document.getElementById('cv-root').classList.contains('open') && JSON.parse(c1.localStorage.getItem('6fltc_tokens')).length===1);
  ({w:c1,rpc}=boot('', ['TOKAAA111','TOKBBB222'], true)); await wait(150);
  c1.__swmsg({data:{type:'notif-go', url:'https://x.github.io/6flt-photoshoot-map/c/?open=TOKAAA111'}}); await wait(80);
  check('app deja ouverte : toucher la notif ouvre la seance', c1.document.getElementById('cv-root').classList.contains('open') && rpc.some(r=>r[0]==='get_shared_brief'&&r[1]==='TOKAAA111'));
  console.log(fails?fails+' ECHEC(S)':'TOUS LES TESTS PASSENT');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
