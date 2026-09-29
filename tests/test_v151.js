// Tests v1.51 : lien unique + installation 6flt Clients
const fs = require('fs');
const { JSDOM } = require('jsdom');
const ROOT = '/home/claude/6flt-photoshoot-map/';
let fails = 0;
const check = (l, c) => { console.log((c ? 'OK   ' : 'FAIL ') + l); if(!c) fails++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- A. Spoties : redirection des liens ?b= ---------- */
const rootHtml = fs.readFileSync(ROOT + 'index.html', 'utf8');
const rootScripts = [...rootHtml.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
check('Spoties : redirection placee avant tout le reste du <head>', rootHtml.indexOf('location.replace') < rootHtml.indexOf('<link rel="manifest"'));
function redirectFor(pathname, search){
  let target = null;
  const location = { pathname, search, replace: u => { target = u; } };
  new Function('location', rootScripts[0])(location);
  return target;
}
check('ancien lien /?b=TOK -> /c/?b=TOK', redirectFor('/6flt-photoshoot-map/', '?b=AbC123xyz') === '/6flt-photoshoot-map/c/?b=AbC123xyz');
check('ancien lien /index.html?b=TOK -> /c/?b=TOK', redirectFor('/6flt-photoshoot-map/index.html', '?b=AbC123xyz') === '/6flt-photoshoot-map/c/?b=AbC123xyz');
check('ancien lien avec autres parametres', redirectFor('/6flt-photoshoot-map/', '?x=1&b=AbC123xyz&y=2') === '/6flt-photoshoot-map/c/?b=AbC123xyz');
check('Spoties normal (sans ?b=) : pas de redirection', redirectFor('/6flt-photoshoot-map/', '') === null && redirectFor('/6flt-photoshoot-map/', '?go=bf:123') === null);
check('Spoties : le lien partage pointe vers c/', /function shareUrl\(\)\{ return SHARE_BASE \+ 'c\/\?b=' \+ doc\.share\.token; \}/.test(rootHtml));
check('Spoties : ancienne vue client retiree', rootHtml.indexOf('VUE CLIENT : lien partagé') < 0 && rootHtml.indexOf("sb.rpc('get_shared_brief'") < 0);

/* ---------- B. sw.js racine ignore c/ ---------- */
{
  const sw = fs.readFileSync(ROOT + 'sw.js', 'utf8');
  const listeners = {};
  const self = { registration: { scope: 'https://x.github.io/6flt-photoshoot-map/', showNotification(){} }, clients: { claim(){}, matchAll(){ return Promise.resolve([]); } },
    addEventListener: (n, f) => { listeners[n] = f; }, skipWaiting(){} };
  new Function('self', 'caches', 'URL', 'fetch', sw)(self, {}, URL, () => Promise.resolve());
  let responded = false;
  const ev = u => ({ request: { method: 'GET', url: u, mode: 'navigate', headers: { get: () => 'text/html' } }, respondWith: () => { responded = true; } });
  listeners.fetch(ev('https://x.github.io/6flt-photoshoot-map/c/?b=AbC123'));
  check('sw racine : ne touche pas aux pages de c/', responded === false);
  responded = false;
  let threw = false;
  try{ listeners.fetch(ev('https://x.github.io/6flt-photoshoot-map/')); }catch(e){ threw = true; }
  check('sw racine : gere toujours Spoties', responded === true || threw);
  check('sw racine : cache v1-51', /const CACHE = 'spoties-v1-51'/.test(sw));
}

/* ---------- C. 6flt Clients ---------- */
const cHtml = fs.readFileSync(ROOT + 'c/index.html', 'utf8').replace(/<script src=[^>]*><\/script>/g, '').replace(/<link href=[^>]*>/g, '');
const UA = {
  safari26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  safari18: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  chromeios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0 Mobile/15E148 Safari/604.1',
  insta: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
};
const brief = t => ({ revealed: true, reveal_at: null, confirmed_at: null, html: '<div class="bf-row" data-layout="1"><div class="bf-slot"><div class="bf-blk" data-type="text">x</div></div></div>',
  data: { title: 'Séance ' + t, start: '2026-10-12T12:00:00Z', end: '2026-10-12T14:00:00Z', tone: 'tu' }, title: 'Séance ' + t, gallery_url: null });
async function boot(opts){
  const rpc = [];
  const dom = new JSDOM(cHtml, { url: 'https://x.github.io/6flt-photoshoot-map/c/' + (opts.search || ''), runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w){
      Object.defineProperty(w.navigator, 'userAgent', { value: opts.ua, configurable: true });
      Object.defineProperty(w.navigator, 'platform', { value: opts.ua === UA.desktop ? 'MacIntel' : 'iPhone', configurable: true });
      Object.defineProperty(w.navigator, 'maxTouchPoints', { value: opts.ua === UA.desktop ? 0 : 5, configurable: true });
      if(opts.standalone) Object.defineProperty(w.navigator, 'standalone', { value: true, configurable: true });
      w.matchMedia = () => ({ matches: false });
      w.Notification = function(){}; w.Notification.permission = 'default';
      w.__perm = 0; w.Notification.requestPermission = () => { w.__perm++; return Promise.resolve('default'); };
      w.PushManager = function(){};
      const reg = { pushManager: { getSubscription: () => Promise.resolve(null), subscribe: () => Promise.reject(new Error('non')) } };
      Object.defineProperty(w.navigator, 'serviceWorker', { value: { register: () => Promise.resolve(reg), ready: Promise.resolve(reg), addEventListener(){} }, configurable: true });
      (opts.storage || []).forEach(([k, v]) => w.localStorage.setItem(k, v));
      w.supabase = { createClient: () => ({ rpc: (n, a) => { rpc.push([n, a.p_token]); return Promise.resolve({ data: n.indexOf('shared_brief') > -1 ? brief(a.p_token) : true, error: null }); } }) };
    } });
  await wait(80);
  return { w: dom.window, rpc };
}
(async function(){
  // C1. Safari iOS 26, lien unique
  let { w, rpc } = await boot({ ua: UA.safari26, search: '?b=AbC123xyz' });
  let man = w.document.querySelector('link[rel="manifest"]').getAttribute('href');
  check('Safari : seance ajoutee a la liste', JSON.parse(w.localStorage.getItem('6fltc_tokens')).map(x => x.token).join() === 'AbC123xyz');
  check('Safari : ?b= garde dans l\'adresse (repli iOS)', w.location.search === '?b=AbC123xyz');
  check('Safari : manifest dynamique avec la seance', man.indexOf('data:application/manifest+json,') === 0 && JSON.parse(decodeURIComponent(man.split(',').slice(1).join(','))).start_url === 'https://x.github.io/6flt-photoshoot-map/c/?b=AbC123xyz');
  { const m = JSON.parse(decodeURIComponent(man.split(',').slice(1).join(','))); check('Safari : manifest dynamique, icones en adresse complete', m.icons.every(i => i.src.indexOf('https://x.github.io/6flt-photoshoot-map/c/') === 0) && m.scope === 'https://x.github.io/6flt-photoshoot-map/c/'); }
  check('Safari : la seance s\'ouvre directement', w.document.getElementById('cv-root').classList.contains('open'));
  let cv = w.document.getElementById('cv-install').innerHTML;
  const sheetOf = (w) => { const b = w.document.querySelector('#cv-install .js-inst-open'); if(b) b.click(); const sh = w.document.getElementById('inst-sheet'); return { sh, txt: sh.innerHTML, disp: w.getComputedStyle(sh).display, arrow: (sh.querySelector('.inst-arrow')||{}).className || '' }; };
  check('carte : bouton Installer l\'app bien visible', /Installer l'app/.test(cv) && /inst-card/.test(cv));
  check('guide ferme au depart', w.getComputedStyle(w.document.getElementById('inst-sheet')).display === 'none');
  let g = sheetOf(w);
  check('Safari 26 : guide ouvert au toucher, ••• en bas a droite, fleche en bas a droite', g.disp === 'flex' && /en bas à droite/.test(g.txt) && /Sur l'écran d'accueil/.test(g.txt) && /Partager/.test(g.txt) && /\bbr\b/.test(g.arrow));
  w.document.querySelector('.js-inst-close').click();
  check('guide : J\'ai compris le ferme', w.getComputedStyle(w.document.getElementById('inst-sheet')).display === 'none');
  sheetOf(w); w.document.getElementById('inst-sheet').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  check('guide : toucher le fond le ferme', w.getComputedStyle(w.document.getElementById('inst-sheet')).display === 'none');
  check('ouverture comptee une seule fois (get_shared_brief)', rpc.filter(r => r[0] === 'get_shared_brief').length === 1);
  check('cartes lues sans compter (peek_shared_brief)', rpc.some(r => r[0] === 'peek_shared_brief'));
  // ajout d'une 2e seance via +
  w.document.getElementById('add-input').value = 'https://x/c/?b=Zyx987abc';
  w.document.getElementById('add-go').click();
  await wait(40);
  man = w.document.querySelector('link[rel="manifest"]').getAttribute('href');
  const st = JSON.parse(decodeURIComponent(man.split(',').slice(1).join(','))).start_url;
  check('ajout via + : adresse et manifest portent les 2 seances', /Zyx987abc/.test(w.location.search) && /AbC123xyz/.test(w.location.search) && /Zyx987abc/.test(st) && /AbC123xyz/.test(st));
  // retrait
  w.closeDetail(); await wait(10);
  const rm = [...w.document.querySelectorAll('[data-rm]')].find(b => b.getAttribute('data-rm') === 'Zyx987abc');
  rm.click(); await wait(10);
  check('retrait : l\'adresse suit', w.location.search === '?b=AbC123xyz');

  // C2. Safari iOS 18
  ({ w } = await boot({ ua: UA.safari18, search: '?b=AbC123xyz' }));
  g = sheetOf(w);
  check('Safari 18 : Partager en bas, fleche en bas au centre', /en bas de l'écran/.test(g.txt) && /\bbc\b/.test(g.arrow));
  // C3. Chrome iOS
  ({ w } = await boot({ ua: UA.chromeios, search: '?b=AbC123xyz' }));
  g = sheetOf(w);
  check('Chrome iOS : Partager en haut a droite, fleche en haut', /en haut à droite/.test(g.txt) && /\btr\b/.test(g.arrow));
  // C4. Instagram
  ({ w } = await boot({ ua: UA.insta, search: '?b=AbC123xyz' }));
  check('Instagram : carte Ouvre ce lien dans Safari', /Ouvre ce lien dans Safari/.test(w.document.getElementById('cv-install').innerHTML));
  g = sheetOf(w);
  check('Instagram : guide Ouvrir dans Safari, fleche en haut', /Ouvrir dans Safari/.test(g.txt) && /\btr\b/.test(g.arrow));
  // C5. Android sans puis avec beforeinstallprompt
  ({ w } = await boot({ ua: UA.android, search: '?b=AbC123xyz' }));
  check('Android : manifest statique (pas de data:)', w.document.querySelector('link[rel="manifest"]').getAttribute('href') === 'manifest.json?v=1.0');
  g = sheetOf(w);
  check('Android sans invite : guide menu ⋮', /⋮/.test(g.txt) && /Installer l'application/.test(g.txt));
  w.document.querySelector('.js-inst-close').click();
  let prompted = 0;
  const bip = new w.Event('beforeinstallprompt'); bip.prompt = () => { prompted++; }; bip.userChoice = Promise.resolve({ outcome: 'accepted' });
  w.dispatchEvent(bip); await wait(10);
  const ib = w.document.querySelector('#cv-install .js-install');
  check('Android : bouton Installer', !!ib);
  ib.click(); await wait(10);
  check('Android : bouton Installer declenche l\'installation', prompted === 1);
  // C6. Ordinateur
  ({ w } = await boot({ ua: UA.desktop, search: '?b=AbC123xyz' }));
  check('ordinateur : pas de guide', w.document.getElementById('cv-install').innerHTML === '');

  // C7. App installee : import unique
  ({ w, rpc } = await boot({ ua: UA.safari26, search: '?b=AbC123xyz', standalone: true }));
  check('app installee : seance importee depuis le lien d\'installation', JSON.parse(w.localStorage.getItem('6fltc_tokens')).length === 1);
  check('app installee : seance ouverte au premier lancement', w.document.getElementById('cv-root').classList.contains('open'));
  check('app installee : adresse nettoyee', w.location.search === '');
  cv = w.document.getElementById('cv-install').innerHTML;
  check('app installee : bandeau Activer les notifications', /js-enable-notif/.test(cv));
  w.document.querySelector('#cv-install .js-enable-notif').click(); await wait(10);
  check('app installee : demande d\'autorisation declenchee au toucher', w.__perm === 1);
  // relancement apres suppression : ne revient pas
  ({ w } = await boot({ ua: UA.safari26, search: '?b=AbC123xyz', standalone: true, storage: [['6fltc_imported', '["AbC123xyz"]'], ['6fltc_tokens', '[]']] }));
  check('app installee : seance retiree ne revient pas au lancement', JSON.parse(w.localStorage.getItem('6fltc_tokens')).length === 0 && !w.document.getElementById('cv-root').classList.contains('open'));
  // plusieurs seances dans le lien d'installation
  ({ w } = await boot({ ua: UA.safari26, search: '?b=AbC123xyz,Zyx987abc', standalone: true }));
  check('app installee : plusieurs seances importees, liste affichee', JSON.parse(w.localStorage.getItem('6fltc_tokens')).length === 2 && !w.document.getElementById('cv-root').classList.contains('open'));
  // jeton invalide ignore
  ({ w } = await boot({ ua: UA.safari26, search: '?b=%3Cscript%3E' }));
  check('jeton invalide ignore', JSON.parse(w.localStorage.getItem('6fltc_tokens') || '[]').length === 0);

  console.log('\n' + (fails ? fails + ' ECHEC(S)' : 'TOUS LES TESTS PASSENT'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ERREUR', e); process.exit(1); });
