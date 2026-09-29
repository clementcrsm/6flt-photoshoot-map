# Test pleine page v1.55 : vraie page Spoties + vraie app 6flt Clients, Supabase simule en memoire
import asyncio, json, subprocess, sys, time, os
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SP = '/tmp/claude-0/-home-claude-6flt-photoshoot-map/9499255e-8bc4-5735-8fe7-bc229bfbec37/scratchpad'
FAKE_SB = open(HERE+'/fake_sb.js').read()
FAKE_MB = open(HERE+'/fake_mapbox.js').read()
ROWS = json.load(open(HERE+'/rows.json'))
BASE = 'http://localhost:8765/6flt-photoshoot-map/'
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1'

fails = 0
def check(label, cond):
    global fails
    print(('OK   ' if cond else 'FAIL ') + label)
    if not cond: fails += 1

def seed(date='', app=False, props=None, shoots=None, locked=False, sv=True, hold=False):
    bf = {'id':'bf_1','title':'Briefing Jeremy Durand','titleCustom':False,'tone':'tu','clientId':'c1','date':date,'place':'Vosges',
          'route':['s1','s2'],'timeMode':'sunset','startTime':'14:00','rows':ROWS,'photos':[],'spotNotes':{},'ref':'6FLT-001','status':'draft',
          'createdAt':1,'updatedAt':1000,'share':dict({'token':'TOKA','reveal':'24h','createdAt':1,'locked':locked}, **({'sv':1} if sv else {}), **({'hold':True} if hold else {}))}
    cl = {'id':'c1','name':'Jeremy Durand','phone':'06 12 34 56 78','email':'','insta':'titi_75','cars':[{'model':'BMW M3','color':'#1a4fd6'}],
          'car':'BMW M3','offre':'','statut':'prospect','shoots':shoots or [],'spotIds':['s1','s2'],'gallery':'','notes':'','extras':[],'_synced':True}
    spots = [{'id':'s1','name':'Col de la Schlucht','lat':48.0632,'lng':7.0220,'type':'Route','_synced':True},
             {'id':'s2','name':'Lac Blanc','lat':48.1320,'lng':7.0850,'type':'Lac','_synced':True}]
    db = {
      'clients':[{'id':'c1','data':cl}], 'spots':[{'id':s['id'],'data':s} for s in spots], 'briefings':[{'id':'bf_1','data':bf,'updated_at':'2026-09-29T10:00:00Z'}],
      'shared_briefings':[{'token':'TOKA','user_id':'u1','briefing_id':'bf_1','title':'Briefing Jeremy Durand','views':1,'confirmed_at':('2026-09-29T10:00:00Z' if locked else None),'revoked':False,
                           'data_public':{'tbd':not date,'start':None,'tone':'tu'},'reveal_at':'2999-01-01T00:00:00Z'}],
      'date_proposals': props if props is not None else [{'id':'p1','token':'TOKA','user_id':'u1','proposed_date':'2026-10-15','proposed_time':'14:00','note':"Dispo l'après-midi",'status':'pending','created_at':'2026-09-29T09:00:00Z'}],
      'client_push_subscriptions':[{'token':'TOKA'}] if app else [],
      'events':[], 'profiles':[], 'game_state':[], 'push_subscriptions':[]
    }
    ls = {'6flt_uid':'u1','6flt_clients':json.dumps([cl]),'6flt_spots':json.dumps(spots),'6flt_briefings':json.dumps([bf])}
    return 'window.__DB = %s; if(!sessionStorage.getItem("seeded")){ var L = %s; Object.keys(L).forEach(function(k){ localStorage.setItem(k, L[k]); }); sessionStorage.setItem("seeded","1"); }' % (json.dumps(db), json.dumps(ls))

async def route(r):
    u = r.request.url
    if 'supabase-js' in u: return await r.fulfill(status=200, content_type='application/javascript', body=FAKE_SB)
    if 'mapbox-gl.js' in u: return await r.fulfill(status=200, content_type='application/javascript', body=FAKE_MB)
    if u.endswith('.css') or 'fonts.googleapis' in u or 'mapbox-gl.css' in u: return await r.fulfill(status=200, content_type='text/css', body='')
    if 'three.min.js' in u or 'mapillary.js' in u or 'html2canvas' in u or 'jspdf' in u: return await r.fulfill(status=200, content_type='application/javascript', body='')
    if u.startswith('http://localhost:8765/'): return await r.continue_()
    return await r.abort()

async def newpage(br, init, mobile=True):
    if mobile:
        ctx = await br.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=UA, service_workers='block', locale='fr-FR', timezone_id='Europe/Paris')
    else:
        ctx = await br.new_context(viewport={'width':1440,'height':900}, service_workers='block', locale='fr-FR', timezone_id='Europe/Paris')
    await ctx.route('**/*', route)
    await ctx.add_init_script(init)
    pg = await ctx.new_page()
    errs, dialogs = [], []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    async def on_dialog(d):
        dialogs.append(d.message); await d.accept()
    pg.on('dialog', lambda d: asyncio.ensure_future(on_dialog(d)))
    return ctx, pg, errs, dialogs

async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--bind', '127.0.0.1'], cwd='/home/claude', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch()

            # ---------- A. iPhone, client sans app : accepter ----------
            ctx, pg, errs, dialogs = await newpage(br, seed())
            await pg.goto(BASE+'index.html?go=client:c1'); await pg.wait_for_timeout(3200)
            check('A. la notif ouvre la fiche du client', await pg.evaluate("document.getElementById('client-panel').classList.contains('open')"))
            prop = await pg.evaluate("(document.querySelector('.clink-prop')||{}).textContent||''")
            check('A. proposition affichee avec jour, heure et note', 'Jeudi 15 octobre à 14h00' in prop and "Dispo l'après-midi" in prop, ) if True else None
            print('     ', prop)
            check('A. bouton relance masque tant qu une date attend', await pg.evaluate("!document.querySelector('#client-links-list .clink-main')"))
            await pg.evaluate("document.querySelector('.clink-prop').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(200)
            await pg.screenshot(path=SP+'/v155_fiche.png')
            await pg.click('[data-lact="accept"]'); await pg.wait_for_timeout(1200)
            check('A. confirmation demandee avant de fixer', len(dialogs)==1 and 'Fixer la séance au jeudi 15 octobre à 14h00' in dialogs[0])
            st = await pg.evaluate("""(function(){
              var DB = window.__DB, bf = DB.briefings.filter(function(b){ return b.id==='bf_1'; })[0].data, sh = DB.shared_briefings[0];
              var ls = JSON.parse(localStorage.getItem('6flt_briefings')).filter(function(b){ return b.id==='bf_1'; })[0];
              var cl = JSON.parse(localStorage.getItem('6flt_clients'))[0];
              var ans = window.__LOG.filter(function(l){ return l.rpc==='owner_answer_dates'; });
              return {date:bf.date, shootDate:bf.shootDate, tm:bf.timeMode, st:bf.startTime, title:bf.title, lsDate:ls.date,
                pubStart:sh.data_public && sh.data_public.start, pubTbd:sh.data_public && sh.data_public.tbd, pubDate:sh.data_public && sh.data_public.date,
                exStart:sh.data_exact && sh.data_exact.start, reveal:sh.reveal_at, hasHtml:!!sh.html_public && sh.html_public.length>500, zones:(sh.data_public && sh.data_public.zones||[]).length,
                spotsEx:(sh.data_exact && sh.data_exact.spots||[]).length, htmlLeak:/Col de la Schlucht/.test(sh.html_public||''),
                shoots:cl.shoots, ans:ans, rows:[].map.call(document.querySelectorAll('#client-shoots .shoot-day-row'), function(r){ return r.getAttribute('data-date')+' '+r.querySelector('.sd-time').value+' '+r.querySelector('.sd-place').value; }),
                propLeft:document.querySelectorAll('.clink-prop').length, card:!!document.getElementById('ntf-ready'),
                cardTxt:(document.querySelector('#ntf-ready .ntf-txt')||{}).value||'', chans:[].map.call(document.querySelectorAll('#ntf-ready [data-ch]'), function(b){ return b.hidden ? '' : b.getAttribute('data-ch'); }).filter(Boolean).join(),
                when:(document.querySelector('.clink-s')||{}).textContent||''};
            })()""")
            print('     ', json.dumps({k:st[k] for k in ['date','tm','st','title','pubStart','reveal','shoots','rows','when']}, ensure_ascii=False))
            check('A. briefing date fixee (cloud et appareil)', st['date']=='2026-10-15' and st['lsDate']=='2026-10-15' and st['shootDate']=='2026-10-15')
            check('A. heure proposee reprise en heure libre', st['tm']=='free' and st['st']=='14:00')
            check('A. titre du briefing date', '15' in st['title'])
            check('A. lien client republie avec la date (start renseigne, plus tbd)', bool(st['pubStart']) and st['pubTbd'] is False and st['pubDate']=='2026-10-15' and bool(st['exStart']))
            check('A. heure de rendez-vous 14h00 a Paris dans le lien', st['pubStart'].startswith('2026-10-15T12:00'))
            check('A. revelation des adresses programmee 24 h avant', st['reveal'] and st['reveal'].startswith('2026-10-14T12:00'))
            check('A. document public complet, adresses toujours masquees', st['hasHtml'] and st['zones']==2 and st['spotsEx']==2 and not st['htmlLeak'])
            check('A. reponse enregistree cote serveur (acceptee)', len(st['ans'])==1 and st['ans'][0]['a']['p_token']=='TOKA' and st['ans'][0]['a']['p_accept']=='p1')
            check('A. seance ajoutee au planning du client (heure et lieu)', any(s['date']=='2026-10-15' and s['time']=='14:00' and s['place']=='Vosges' for s in st['shoots']))
            check('A. fiche ouverte a jour (ligne de seance)', '2026-10-15 14:00 Vosges' in st['rows'])
            check('A. proposition retiree de la fiche', st['propLeft']==0)
            check('A. client sans app : message pret ouvert', st['card'] and "c'est validé pour le jeudi 15 octobre à 14h00" in st['cardTxt'] and 'c/?b=TOKA' in st['cardTxt'] and 'confirmer' in st['cardTxt'])
            check('A. canaux : SMS, Instagram, copier (pas de notif app)', st['chans']=='sms,ig,copy')
            check('A. lien affiche avec sa nouvelle date', '15 oct' in st['when'].lower() or 'octobre' in st['when'].lower())
            await pg.screenshot(path=SP+'/v155_accepte.png')
            await pg.click('#ntf-ready .ntf-x'); await pg.wait_for_timeout(150)
            # Enregistrer la fiche ne doit pas effacer la seance ajoutee
            await pg.evaluate("saveClient()"); await pg.wait_for_timeout(300)
            sh2 = await pg.evaluate("JSON.parse(localStorage.getItem('6flt_clients'))[0].shoots")
            check('A. Enregistrer la fiche garde la seance', any(s['date']=='2026-10-15' and s['time']=='14:00' for s in sh2))
            check('A. aucune erreur JS', not errs);
            if errs: print('     ', errs[:5])
            await ctx.close()

            # ---------- B. iPhone, client avec l'app : refuser ----------
            ctx, pg, errs, dialogs = await newpage(br, seed(app=True))
            await pg.goto(BASE+'index.html?go=client:c1'); await pg.wait_for_timeout(3200)
            check('B. badge App installee', 'App installée' in await pg.evaluate("document.getElementById('client-links-list').textContent"))
            await pg.evaluate("window.__toasts=[]; var _st = showToast; showToast = function(m){ window.__toasts.push(typeof m!=='string' ? (typeof m)+' '+String(m)+' '+new Error().stack : m); _st(m); }; 0")
            await pg.click('[data-lact="decline"]'); await pg.wait_for_timeout(600)
            st = await pg.evaluate("""({ans:window.__LOG.filter(function(l){ return l.rpc==='owner_answer_dates'; }), bf:window.__DB.briefings[0].data.date, pub:window.__LOG.filter(function(l){ return l.t==='shared_briefings' && l.op==='upsert'; }).length,
               card:!!document.getElementById('ntf-ready'), toasts:window.__toasts, propLeft:document.querySelectorAll('.clink-prop').length, relance:(document.querySelector('.clink-main')||{}).textContent||''})""")
            check('B. confirmation du refus', len(dialogs)==1 and 'Refuser le jeudi 15 octobre à 14h00' in dialogs[0] and 'Jeremy pourra proposer une autre date' in dialogs[0])
            check('B. refus envoye au serveur (notif client cote serveur)', len(st['ans'])==1 and st['ans'][0]['a']['p_accept'] is None and st['ans'][0]['a']['p_token']=='TOKA')
            check('B. briefing inchange, rien republie', st['bf']=='' and st['pub']==0)
            check('B. client avec app : pas de carte, toast', not st['card'] and 'Jeremy est prévenu dans son app' in st['toasts'])
            check('B. bouton de relance revenu (date a fixer)', st['propLeft']==0 and 'date' in st['relance'].lower())
            check('B. aucune erreur JS', not errs)
            if errs: print('     ', errs[:5])
            await ctx.close()

            # ---------- C. ordinateur, briefing ouvert dans l'editeur ----------
            ctx, pg, errs, dialogs = await newpage(br, seed(app=True), mobile=False)
            await pg.goto(BASE+'index.html'); await pg.wait_for_timeout(2500)
            await pg.evaluate("switchView('planning')"); await pg.wait_for_timeout(1200)
            # une modification en cours dans l'editeur (sauvegarde differee)
            opened = await pg.evaluate("!!document.querySelector('#bf-doc .bf-row')")
            check('C. briefing ouvert dans l editeur', opened)
            await pg.evaluate("openExistingClientPanel('c1')"); await pg.wait_for_timeout(900)
            await pg.click('[data-lact="accept"]'); await pg.wait_for_timeout(5000)
            st = await pg.evaluate("""({cloud:window.__DB.briefings[0].data.date, ls:JSON.parse(localStorage.getItem('6flt_briefings'))[0].date,
               pub:window.__DB.shared_briefings[0].data_public.start, editor:document.getElementById('bf-doc').textContent,
               ups:window.__LOG.filter(function(l){ return l.t==='briefings' && l.op==='upsert'; }).map(function(l){ return (Array.isArray(l.p)?l.p[0]:l.p).data.date; }),
               card:!!document.getElementById('ntf-ready')})""")
            print('      upserts briefings:', st['ups'])
            check('C. date gardee apres la sauvegarde differee de l editeur', st['cloud']=='2026-10-15' and st['ls']=='2026-10-15' and all(d=='2026-10-15' for d in st['ups'][-2:]))
            check('C. editeur affiche la nouvelle date', '15 octobre' in st['editor'] or '15/10' in st['editor'])
            check('C. lien republie', bool(st['pub']))
            check('C. client avec app, briefing sans date : notif auto, pas de carte', not st['card'])
            check('C. aucune erreur JS', not errs)
            if errs: print('     ', errs[:5])
            await ctx.close()

            # ---------- D. briefing deja date + document confirme ----------
            ctx, pg, errs, dialogs = await newpage(br, seed(date='2026-10-10', locked=True, shoots=[{'date':'2026-10-10','time':'','place':'Vosges','state':'prevu'}]))
            await pg.goto(BASE+'index.html?go=client:c1'); await pg.wait_for_timeout(3200)
            await pg.evaluate("window.__toasts=[]; var _st = showToast; showToast = function(m){ window.__toasts.push(typeof m!=='string' ? (typeof m)+' '+String(m)+' '+new Error().stack : m); _st(m); }; 0")
            await pg.click('[data-lact="accept"]'); await pg.wait_for_timeout(900)
            st = await pg.evaluate("""({bf:window.__DB.briefings[0].data.date, pub:window.__LOG.filter(function(l){ return l.t==='shared_briefings' && l.op==='upsert'; }).length,
               shoots:JSON.parse(localStorage.getItem('6flt_clients'))[0].shoots, toasts:window.__toasts, card:!!document.getElementById('ntf-ready')})""")
            check('D. seance deplacee dans le planning (etat garde, pas de doublon)', len(st['shoots'])==1 and st['shoots'][0]['date']=='2026-10-15' and st['shoots'][0].get('state')=='prevu')
            print('      toasts D:', st['toasts'], st['card']); check('D. document confirme : pas republie, message clair', st['pub']==0 and any('Document confirmé' in (t or '') for t in st['toasts']))
            check('D. aucune erreur JS', not errs)
            if errs: print('     ', errs[:5])
            await ctx.close()
            # ---------- E. iPhone : proposition "fin de journee" (v1.56) ----------
            ctx, pg, errs, dialogs = await newpage(br, seed(props=[{'id':'p9','token':'TOKA','user_id':'u1','proposed_date':'2026-10-15','proposed_time':'evening','note':None,'status':'pending','created_at':'2026-09-29T09:00:00Z'}]))
            await pg.goto(BASE+'index.html?go=client:c1'); await pg.wait_for_timeout(3200)
            prop = await pg.evaluate("(document.querySelector('.clink-prop')||{}).textContent||''")
            check('E. moment affiche dans la fiche', 'Jeudi 15 octobre, en fin de journée' in prop)
            await pg.click('[data-lact="accept"]'); await pg.wait_for_timeout(1200)
            st = await pg.evaluate("""({tm:window.__DB.briefings[0].data.timeMode, start:window.__DB.shared_briefings[0].data_public.start, shoots:JSON.parse(localStorage.getItem('6flt_clients'))[0].shoots,
               card:(document.querySelector('#ntf-ready .ntf-txt')||{}).value||''})""")
            print('     ', dialogs, st)
            check('E. confirmation annonce le calage sur le coucher du soleil', len(dialogs)==1 and 'jeudi 15 octobre, en fin de journée' in dialogs[0] and 'Rendez-vous calé sur le coucher du soleil' in dialogs[0])
            check('E. briefing cale sur le coucher du soleil, lien republie', st['tm']=='sunset' and bool(st['start']))
            import re as _re
            check('E. heure calculee dans le planning et dans le message', any(_re.match(r'^\d{2}:\d{2}$', x.get('time','')) for x in st['shoots']) and _re.search(r"validé pour le jeudi 15 octobre à \d{2}h\d{2}", st['card']))
            check('E. aucune erreur JS', not errs)
            if errs: print('     ', errs[:5])
            await ctx.close()
            # ---------- F. iPhone : 3 dates proposees d'un coup (v1.57) ----------
            P3 = [{'id':'q1','token':'TOKA','user_id':'u1','proposed_date':'2026-10-17','proposed_time':'morning','note':None,'status':'pending','created_at':'2026-09-29T09:00:00Z','batch':'b1'},
                  {'id':'q2','token':'TOKA','user_id':'u1','proposed_date':'2026-10-15','proposed_time':'evening','note':'Dispo apres 16h','status':'pending','created_at':'2026-09-29T09:00:00Z','batch':'b1'},
                  {'id':'q3','token':'TOKA','user_id':'u1','proposed_date':'2026-10-18','proposed_time':None,'note':'Dispo apres 16h','status':'pending','created_at':'2026-09-29T09:00:00Z','batch':'b1'}]
            ctx, pg, errs, dialogs = await newpage(br, seed(props=P3))
            await pg.goto(BASE+'index.html?go=client:c1'); await pg.wait_for_timeout(3200)
            st = await pg.evaluate("""({cards:document.querySelectorAll('.clink-prop').length, head:(document.querySelector('.clink-prop-h')||{}).textContent,
               rows:[].map.call(document.querySelectorAll('.clink-prop-o .clink-prop-d'), function(x){ return x.textContent; }), oks:document.querySelectorAll('.clink-prop [data-lact="accept"]').length,
               no:(document.querySelector('.clink-prop [data-lact="decline"]')||{}).textContent, note:(document.querySelector('.clink-prop-n')||{}).textContent})""")
            print('     ', st)
            check('F. une seule carte, 3 dates triees, un Accepter par date', st['cards']==1 and st['head']=='3 dates proposées par le client' and st['rows']==['Jeudi 15 octobre, en fin de journée','Samedi 17 octobre, le matin','Dimanche 18 octobre'] and st['oks']==3)
            check('F. refus groupe et mot du client une seule fois', st['no']=='Aucune ne me va' and st['note']=='« Dispo apres 16h »')
            await pg.evaluate("document.querySelector('.clink-prop').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(150)
            await pg.screenshot(path=SP+'/v157_fiche3.png')
            await pg.click('.clink-prop [data-p="q1"]'); await pg.wait_for_timeout(1500)
            st = await pg.evaluate("""({date:window.__DB.briefings[0].data.date, tm:window.__DB.briefings[0].data.timeMode, ans:window.__LOG.filter(function(l){ return l.rpc==='owner_answer_dates'; }),
               left:document.querySelectorAll('.clink-prop').length, slots:window.__DB.shared_briefings[0].data_public.slots, start:window.__DB.shared_briefings[0].data_public.start,
               sv:window.__DB.briefings[0].data.share.sv})""")
            print('     ', st)
            check('F. la date choisie est fixee (samedi matin, cale sur le lever)', st['date']=='2026-10-17' and st['tm']=='sunrise' and len(st['ans'])==1 and st['ans'][0]['a']['p_accept']=='q1')
            check('F. carte retiree apres acceptation', st['left']==0)
            sl = st['slots'] or {}
            check('F. duree publiee pour le client (T, K, position arrondie)', sl.get('v')==1 and sl.get('T',0)>0 and 0 < sl.get('K',0) <= sl.get('T',0) and sl.get('lat')==48.1 and sl.get('lng')==7.0 and st['sv']==1)
            # meme calcul que 6flt Clients : l'heure du matin publiee doit correspondre au creneau "Matin"
            ctab = open('/home/claude/6flt-photoshoot-map/c/index.html').read()
            sunsrc = ctab[ctab.index('function sunMin('):ctab.index('/* creneau d')]
            calc = await pg.evaluate("(function(){ " + sunsrc + " var sl = window.__DB.shared_briefings[0].data_public.slots; return {m:sunMin('2026-10-17', sl.lat, sl.lng, true) - 30, e:sunMin('2026-10-17', sl.lat, sl.lng, false) + 10 - sl.K}; })()")
            d0 = __import__('datetime').datetime.fromisoformat(st['start'].replace('Z','+00:00')).astimezone(__import__('zoneinfo').ZoneInfo('Europe/Paris'))
            pub_min = d0.hour*60 + d0.minute
            print('      matin publie', pub_min, 'calcul client', calc)
            check('F. heure publiee = calcul client a 3 min pres', abs(pub_min - calc['m']) <= 3)
            check('F. aucune erreur JS', not errs)
            if errs: print('     ', errs[:5])
            await ctx.close()

            # ---------- F2. refus groupe ----------
            ctx, pg, errs, dialogs = await newpage(br, seed(props=P3, app=True))
            await pg.goto(BASE+'index.html?go=client:c1'); await pg.wait_for_timeout(3200)
            await pg.evaluate("window.__toasts=[]; var _st = showToast; showToast = function(m){ window.__toasts.push(m); _st(m); }; 0")
            await pg.click('.clink-prop [data-lact="decline"]'); await pg.wait_for_timeout(600)
            st = await pg.evaluate("({ans:window.__LOG.filter(function(l){ return l.rpc==='owner_answer_dates'; }), left:document.querySelectorAll('.clink-prop').length, toasts:window.__toasts})")
            check('F2. confirmation pour les 3 dates, un seul appel serveur', len(dialogs)==1 and 'Refuser ces 3 dates' in dialogs[0] and len(st['ans'])==1 and st['ans'][0]['a']['p_accept'] is None)
            check('F2. carte retiree, client avec app prevenu', st['left']==0 and 'Jeremy est prévenu dans son app' in st['toasts'])
            await ctx.close()
            ctx, pg, errs, dialogs = await newpage(br, seed(props=P3))
            await pg.goto(BASE+'index.html?go=client:c1'); await pg.wait_for_timeout(3200)
            await pg.click('.clink-prop [data-lact="decline"]'); await pg.wait_for_timeout(600)
            card = await pg.evaluate("(document.querySelector('#ntf-ready .ntf-txt')||{}).value||''")
            check('F2. client sans app : message pret pour toutes les dates', "aucune de ces dates ne sera possible" in card and 'c/?b=TOKA' in card)
            await ctx.close()

            # ---------- H. liens "date a fixer" deja envoyes : republies une fois avec les durees ----------
            ctx, pg, errs, dialogs = await newpage(br, seed(sv=False, props=[]))
            await pg.goto(BASE+'index.html'); await pg.wait_for_timeout(6000)
            st = await pg.evaluate("({ups:window.__LOG.filter(function(l){ return l.t==='shared_briefings' && l.op==='upsert'; }).length, slots:window.__DB.shared_briefings[0].data_public.slots, tbd:window.__DB.shared_briefings[0].data_public.tbd, sv:window.__DB.briefings[0].data.share.sv, date:window.__DB.briefings[0].data.date})")
            print('     ', st)
            check('H. lien sans date republie une fois avec les durees, toujours sans date', st['ups']==1 and st['slots'] and st['tbd'] is True and st['sv']==1 and st['date']=='')
            await pg.reload(); await pg.wait_for_timeout(5000)
            st2 = await pg.evaluate("window.__LOG.filter(function(l){ return l.t==='shared_briefings' && l.op==='upsert'; }).length")
            check('H. pas de republication au lancement suivant', st2==0)
            check('H. aucune erreur JS', not errs)
            await ctx.close()
            ctx, pg, errs, dialogs = await newpage(br, seed(sv=False, hold=True, props=[]))
            await pg.goto(BASE+'index.html'); await pg.wait_for_timeout(6000)
            check('H. mises a jour en pause : rien republie', await pg.evaluate("window.__LOG.filter(function(l){ return l.t==='shared_briefings' && l.op==='upsert'; }).length")==0)
            await ctx.close()
            ctx, pg, errs, dialogs = await newpage(br, seed(sv=False, date='2026-10-10', props=[]))
            await pg.goto(BASE+'index.html'); await pg.wait_for_timeout(6000)
            check('H. lien deja date : rien republie', await pg.evaluate("window.__LOG.filter(function(l){ return l.t==='shared_briefings' && l.op==='upsert'; }).length")==0)
            await ctx.close()
            await br.close()
    finally:
        srv.terminate()
    print('\n' + ('TOUS LES TESTS PASSENT' if fails==0 else '%d ECHEC(S)' % fails))
    sys.exit(1 if fails else 0)

if __name__=='__main__':
    asyncio.run(main())
