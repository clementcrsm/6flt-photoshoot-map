# Test pleine page 6flt Clients v1.7 : calendrier, heures calculees, jusqu'a 3 dates
import asyncio, json, subprocess, sys, time, os, re
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run_v155 import route, UA, SP, check
import run_v155

BASE = 'http://localhost:8765/6flt-photoshoot-map/c/'
TOK = 'TOKAabcdefghjk'
SLOTS = {'v':1, 'T':100, 'K':95, 'pm':'14:00', 'lat':48.1, 'lng':7.0}
def brief(slots=True, tone='tu'):
    d = {'title':'Briefing Jeremy','tbd':True,'start':None,'tone':tone,'handle':'_6flt_'}
    if slots: d['slots'] = SLOTS
    return {'revealed':False,'reveal_at':'2999-01-01T00:00:00Z','confirmed_at':None,'title':'Briefing Jeremy',
      'html':'<div class="bf-row" data-layout="1"><div class="bf-slot"><div class="bf-blk" data-type="text"><p>Contenu du briefing</p></div></div></div>', 'data':d}

def init(prop, local=None, fail=False, b=None, send=True):
    b = b or brief()
    js = 'window.__RPC = {get_shared_brief:function(){ return %s; }, peek_shared_brief:function(){ return %s; }, get_date_proposal:function(){ %s return %s; }, propose_shared_dates2:function(){ return %s; }};' % (
        json.dumps(b), json.dumps(b), 'throw 0;' if fail else '', json.dumps(prop), 'true' if send else 'false')
    if local: js += 'if(!sessionStorage.getItem("s")){ localStorage.setItem("6fltc_proposed_%s", %s); sessionStorage.setItem("s","1"); }' % (TOK, json.dumps(local))
    return js

async def page(br, js):
    ctx = await br.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=UA, service_workers='block', locale='fr-FR', timezone_id='Europe/Paris')
    await ctx.route('**/*', route); await ctx.add_init_script(js)
    pg = await ctx.new_page(); errs = []; alerts = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    async def on_dialog(d):
        alerts.append(d.message); await d.accept()
    pg.on('dialog', lambda d: asyncio.ensure_future(on_dialog(d)))
    await pg.goto(BASE+'?b='+TOK); await pg.wait_for_timeout(1500)
    return ctx, pg, errs, alerts

STATE = "({box:(document.getElementById('cv-prop')||{}).textContent||'', jump:(document.getElementById('cv-prop-jump')||{}).textContent||'', jumpOff:!!(document.getElementById('cv-prop-jump')||{}).disabled, ls:localStorage.getItem('6fltc_proposed_%s')})" % TOK
CHIPS = "[].map.call(document.querySelectorAll('#prop-sheet .ps-chips button'), function(b){ return b.textContent; })"

async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--bind', '127.0.0.1'], cwd='/home/claude', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch()
            # F1 : refus d'un lot, calendrier, heures calculees, 3 options
            ctx, pg, errs, alerts = await page(br, init({'date':'2026-10-15','time':'evening','status':'declined','declined':['2026-10-15','2026-10-16'],
                'batch':[{'date':'2026-10-15','time':'evening','status':'declined'},{'date':'2026-10-16','time':'morning','status':'declined'}]}))
            s = await pg.evaluate(STATE)
            check('F1. refus de plusieurs dates affiche', 'Ces dates ne seront pas possibles : jeudi 15 octobre, vendredi 16 octobre. Choisis-en d\'autres' in s['box'])
            await pg.click('#cv-prop-jump'); await pg.wait_for_timeout(250)
            chips0 = await pg.evaluate(CHIPS)
            check('F1. sans jour choisi : moments sans heure', chips0==['Peu importe','Matin','Après-midi','Fin de journée'])
            check('F1. deux jours refuses barres', await pg.evaluate("['2026-10-15','2026-10-16'].every(function(d){ var b = document.querySelector('#prop-sheet [data-d=\"'+d+'\"]'); return b && b.disabled && b.classList.contains('no'); })"))
            await pg.click('#prop-sheet [data-d="2026-10-20"]')
            chips = await pg.evaluate(CHIPS)
            print('     ', chips)
            m = re.match(r'Matin(\d+)h(\d\d) à (\d+)h(\d\d)', chips[1]); ev = re.match(r'Fin de journée(\d+)h(\d\d) à (\d+)h(\d\d)', chips[3]); am = chips[2]
            check('F1. heures calculees pour le jour choisi', bool(m) and bool(ev) and am=='Après-midi14h00 à 15h40')
            if m and ev:
                mst = int(m.group(1))*60+int(m.group(2)); est = int(ev.group(1))*60+int(ev.group(2)); een = int(ev.group(3))*60+int(ev.group(4))
                check('F1. matin cale sur le lever (vers 7h), fin de journee sur le coucher (fin vers 18h30-19h)', 7*60 <= mst <= 8*60+15 and 17*60 <= een <= 19*60+15 and een-est == 100)
            check('F1. phrase sur la lumiere visible', await pg.evaluate("!document.querySelector('#prop-sheet .ps-hint').hidden"))
            await pg.click('#prop-sheet .ps-chips [data-t="evening"]')
            check('F1. bouton ajouter une option visible', await pg.evaluate("!document.querySelector('#prop-sheet .ps-add').hidden"))
            check('F1. v1.8 libelle Proposer une 2e date', await pg.evaluate("document.querySelector('#prop-sheet .ps-add').textContent")=='+ Proposer une 2e date')
            await pg.click('#prop-sheet .ps-add')
            await pg.click('#prop-sheet [data-d="2026-10-24"]'); await pg.click('#prop-sheet .ps-chips [data-t="morning"]'); await pg.click('#prop-sheet .ps-add')
            await pg.click('#prop-sheet [data-d="2026-10-25"]')
            st = await pg.evaluate("({opts:[].map.call(document.querySelectorAll('#prop-sheet .ps-opt span'), function(x){ return x.textContent; }), addHidden:document.querySelector('#prop-sheet .ps-add').hidden, go:document.querySelector('#prop-sheet .ps-go').textContent, mark:document.querySelector('#prop-sheet [data-d=\"2026-10-20\"]').classList.contains('opt')})")
            print('     ', st)
            check('F1. options listees avec heure', len(st['opts'])==2 and st['opts'][0].startswith('1. Mardi 20 octobre, en fin de journée (vers ') and st['opts'][1].startswith('2. Samedi 24 octobre, le matin (vers '))
            check('F1. 3 options maximum (ajout masque)', st['addHidden'])
            check('F1. jour deja choisi marque dans le calendrier', st['mark'])
            check('F1. envoi des 3 options', st['go']=='Envoyer mes 3 dates')
            await pg.screenshot(path=SP+'/c157_options.png')
            # retirer puis remettre une option
            await pg.click('#prop-sheet [data-rm="1"]')
            check('F1. option retiree', await pg.evaluate("document.querySelectorAll('#prop-sheet .ps-opt').length")==1 and await pg.evaluate("document.querySelector('#prop-sheet .ps-go').textContent")=='Envoyer mes 2 dates')
            await pg.click('#prop-sheet [data-d="2026-10-24"]'); await pg.click('#prop-sheet .ps-chips [data-t="morning"]'); await pg.click('#prop-sheet .ps-add')
            await pg.click('#prop-sheet [data-d="2026-10-25"]')
            await pg.fill('#prop-sheet .ps-note', 'Le 25 je finis a 16h')
            await pg.click('#prop-sheet .ps-go'); await pg.wait_for_timeout(300)
            sent = await pg.evaluate("window.__LOG.filter(function(l){ return l.rpc==='propose_shared_dates2'; })")
            check('F1. un seul envoi avec les 3 options et le mot', len(sent)==1 and sent[0]['a']['p_options']==[{'date':'2026-10-20','time':'evening'},{'date':'2026-10-25','time':None},{'date':'2026-10-24','time':'morning'}] or (len(sent)==1 and len(sent[0]['a']['p_options'])==3 and sent[0]['a']['p_note']=='Le 25 je finis a 16h'))
            print('     ', sent[0]['a'] if sent else None)
            s = await pg.evaluate(STATE)
            check('F1. attente : les 3 dates listees', 'Tu as proposé 3 dates' in s['box'] and 'Mardi 20 octobre, en fin de journée (vers' in s['box'] and 'Dimanche 25 octobre' in s['box'])
            check('F1. v1.8 bouton du bas : modifier la proposition', s['jump']=='Modifier ma proposition' and not s['jumpOff'])
            check('F1. memorise sur l appareil', s['ls'] is not None and s['ls'].count('|')==2)
            await pg.screenshot(path=SP+'/c157_attente.png')
            check('F1. aucune erreur JS', not errs)
            if errs: print('     ', errs[:4])
            await ctx.close()
            # F2 : une seule date en attente (serveur) : heure du rendez-vous affichee
            ctx, pg, errs, alerts = await page(br, init({'date':'2026-10-20','time':'afternoon','status':'pending','batch':[{'date':'2026-10-20','time':'afternoon','status':'pending'}]}))
            s = await pg.evaluate(STATE)
            check('F2. une date en attente avec horaires', 'Tu as proposé le mardi 20 octobre, l\'après-midi' in s['box'] and 'Rendez-vous vers 14h00, fin vers 15h40' in s['box'] and s['jump']=='Modifier ma proposition')
            await ctx.close()
            # F5 (v1.8) : proposition en attente modifiable, remplace l'ancienne
            ctx, pg, errs, alerts = await page(br, init({'date':'2026-10-20','time':'afternoon','status':'pending','batch':[{'date':'2026-10-20','time':'afternoon','status':'pending'}]}))
            await pg.click('#cv-prop-jump'); await pg.wait_for_timeout(200)
            st = await pg.evaluate("({t:document.querySelector('#prop-sheet .ps-head b').textContent, opts:[].map.call(document.querySelectorAll('#prop-sheet .ps-opt span'), function(x){ return x.textContent; }), go:document.querySelector('#prop-sheet .ps-go').textContent})")
            print('     ', st)
            check('F5. feuille Modifier, date deja proposee reprise', st['t']=='Modifier ma proposition' and len(st['opts'])==1 and 'Mardi 20 octobre' in st['opts'][0])
            await pg.click('#prop-sheet [data-rm="0"]'); await pg.click('#prop-sheet [data-d="2026-10-22"]'); await pg.click('#prop-sheet .ps-chips [data-t="evening"]')
            check('F5. bouton envoyer', 'Proposer plutôt le jeudi 22 octobre' in await pg.evaluate("document.querySelector('#prop-sheet .ps-go').textContent"))
            await pg.screenshot(path=SP+'/c158_modifier.png')
            await pg.click('#prop-sheet .ps-go'); await pg.wait_for_timeout(300)
            sent = await pg.evaluate("window.__LOG.filter(function(l){ return l.rpc==='propose_shared_dates2'; })")
            check('F5. envoi en remplacement', len(sent)==1 and sent[0]['a'].get('p_replace') is True and sent[0]['a']['p_options']==[{'date':'2026-10-22','time':'evening'}])
            s = await pg.evaluate(STATE)
            check('F5. nouvelle proposition affichee', 'jeudi 22 octobre' in s['box'] and not errs)
            await ctx.close()
            # F6 (v1.8) : creneau refuse seulement, les autres moments du jour restent possibles
            ctx, pg, errs, alerts = await page(br, init({'date':'2026-10-20','time':'morning','status':'declined','declined':[],'blocked':[{'date':'2026-10-20','time':'morning'}],
                'batch':[{'date':'2026-10-20','time':'morning','status':'declined','block':'moment'}]}))
            s = await pg.evaluate(STATE)
            check('F6. message : seul le matin est refuse', 'Mardi 20 octobre, le matin ne sera pas possible. Un autre moment de la journée' in s['box'])
            check('F6. bouton proposer une autre date', s['jump']=='Proposer une autre date' and not s['jumpOff'])
            await pg.click('#cv-prop-jump'); await pg.wait_for_timeout(200)
            st = await pg.evaluate("({part:document.querySelector('#prop-sheet [data-d=\"2026-10-20\"]').classList.contains('part'), off:document.querySelector('#prop-sheet [data-d=\"2026-10-20\"]').disabled})")
            check('F6. jour marque d un point, toujours cliquable', st['part'] and not st['off'])
            await pg.click('#prop-sheet [data-d="2026-10-20"]')
            st = await pg.evaluate("({m:document.querySelector('#prop-sheet .ps-chips [data-t=\"morning\"]').disabled, e:document.querySelector('#prop-sheet .ps-chips [data-t=\"evening\"]').disabled, mt:document.querySelector('#prop-sheet .ps-chips [data-t=\"morning\"]').textContent})")
            check('F6. matin grise, fin de journee possible', st['m'] and not st['e'] and 'Pas possible' in st['mt'])
            await pg.screenshot(path=SP+'/c158_creneau.png')
            check('F6. aucune erreur JS', not errs)
            await ctx.close()
            # F3 : ancien lien sans duree publiee : moments sans heure, envoi possible
            ctx, pg, errs, alerts = await page(br, init(None, b=brief(slots=False)))
            await pg.click('#cv-prop-jump'); await pg.wait_for_timeout(200); await pg.click('#prop-sheet [data-d="2026-10-20"]')
            chips = await pg.evaluate(CHIPS)
            check('F3. lien ancien : pas d heure, pas de phrase', chips==['Peu importe','Matin','Après-midi','Fin de journée'] and await pg.evaluate("document.querySelector('#prop-sheet .ps-hint').hidden"))
            await pg.click('#prop-sheet .ps-go'); await pg.wait_for_timeout(300)
            s = await pg.evaluate(STATE)
            check('F3. une date envoyee', 'Tu as proposé le mardi 20 octobre' in s['box'] and not errs)
            await ctx.close()
            # F4 : envoi refuse par le serveur -> alerte, feuille gardee
            ctx, pg, errs, alerts = await page(br, init(None, send=False))
            await pg.click('#cv-prop-jump'); await pg.wait_for_timeout(200); await pg.click('#prop-sheet [data-d="2026-10-20"]'); await pg.click('#prop-sheet .ps-go'); await pg.wait_for_timeout(400)
            check('F4. refus serveur : alerte et feuille gardee', len(alerts)==1 and 'choisis-en un autre' in alerts[0] and await pg.evaluate("!!document.getElementById('prop-sheet')"))
            await ctx.close()
            # F5 : anciens formats sur l'appareil, serveur injoignable
            ctx, pg, errs, alerts = await page(br, init(None, local='2026-10-15 10:00', fail=True))
            s = await pg.evaluate(STATE)
            check('F5. ancien format lu (heure)', 'Tu as proposé le jeudi 15 octobre à 10h00' in s['box'] and not errs)
            await ctx.close()
            # F6 : vouvoiement
            ctx, pg, errs, alerts = await page(br, init({'date':'2026-10-15','time':None,'status':'declined','declined':['2026-10-15']}, b=brief(tone='vous')))
            s = await pg.evaluate(STATE)
            await pg.click('#cv-prop-jump'); await pg.wait_for_timeout(200)
            check('F6. vouvoiement', 'Choisissez un autre jour' in s['box'] and 'plus vous en proposez' in await pg.evaluate("document.querySelector('#prop-sheet .ps-sub').textContent"))
            await ctx.close()
            await br.close()
    finally:
        srv.terminate()
    print('\n' + ('TOUS LES TESTS PASSENT' if run_v155.fails==0 else '%d ECHEC(S)' % run_v155.fails))
    sys.exit(1 if run_v155.fails else 0)

asyncio.run(main())
