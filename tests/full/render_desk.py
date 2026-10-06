# rendu du document genere dans 6flt Clients, taille iPhone, page entiere
import asyncio, json, sys, subprocess, time
from playwright.async_api import async_playwright
sys.path.insert(0, '.')
from run_v155 import route, UA, SP
row = json.load(open('gen_row.json'))
mode = sys.argv[1] if len(sys.argv) > 1 else 'public'
BRIEF = {'data': row['data_public'] if mode=='public' else row['data_exact'], 'html': row['html_public'] if mode=='public' else row['html_exact'],
         'title': row['title'], 'revealed': mode!='public', 'reveal_at': row['reveal_at'], 'confirmed_at': None, 'gallery_url': None, 'signed_name': None, 'signature': None, 'review_rating': None, 'review_submitted_at': None}
if mode == 'tbd':
    BRIEF['data'] = dict(row['data_public'], tbd=True, start=None, end=None, date=None); BRIEF['revealed'] = False; BRIEF['html'] = row['html_public']; BRIEF['reveal_at'] = '2999-01-01T00:00:00Z'
TOK = 'TESTv155dateXq8Lm2'
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--bind', '127.0.0.1'], cwd='/home/claude', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch()
            ctx = await br.new_context(viewport={'width':1366,'height':768}, device_scale_factor=1, service_workers='block', locale='fr-FR', timezone_id='Europe/Paris')
            async def r2(r):
                u = r.request.url
                if 'supabase.co/storage' in u: return await r.fulfill(status=200, content_type='image/svg+xml', body='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#556"/><circle cx="600" cy="400" r="200" fill="#889"/></svg>')
                if 'api.mapbox.com/styles' in u: return await r.fulfill(status=200, content_type='image/svg+xml', body='<svg xmlns="http://www.w3.org/2000/svg" width="960" height="440"><rect width="960" height="440" fill="#223"/></svg>')
                return await route(r)
            await ctx.route('**/*', r2)
            await ctx.add_init_script('window.__RPC = {get_shared_brief:function(){ return %s; }, peek_shared_brief:function(){ return %s; }, get_date_proposal:function(){ return null; }};' % (json.dumps(BRIEF), json.dumps(BRIEF)))
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('http://localhost:8765/6flt-photoshoot-map/c/?b='+TOK); await pg.wait_for_timeout(1800)
            ov = await pg.evaluate("(function(){ var W = document.documentElement.clientWidth, bad = []; document.querySelectorAll('#cv-root *').forEach(function(el){ var r = el.getBoundingClientRect(); if(r.width && r.right > W + 1) bad.push(el.className || el.tagName); }); return {W:W, bad:bad.slice(0, 12), n:bad.length}; })()")
            print('debordements', ov)
            st = await pg.evaluate("({facts:getComputedStyle(document.querySelector('.bf-facts')).display, cav:document.querySelector('.bf-cav').getBoundingClientRect().width, simg:document.querySelector('.bf-simg').getBoundingClientRect().width, check:getComputedStyle(document.querySelector('.bf-check li')).display})")
            ok = ov['n']==0 and st['facts']=='grid' and st['check']=='flex'
            print(('OK   ' if ok else 'FAIL ')+'mise en page du briefing appliquee', st)
            if not ok: sys.exit(1)
            await pg.evaluate("document.getElementById('cv-root').scrollTop = 0")
            H = await pg.evaluate("document.getElementById('cv-root').scrollHeight")
            for i, y in enumerate(range(0, min(H, 768*6), 700)):
                await pg.evaluate("document.getElementById('cv-root').scrollTop = %d" % y); await pg.wait_for_timeout(120)
                await pg.screenshot(path=SP+'/desk_%s_%d.png' % (mode, i))
            print('hauteur', H, 'erreurs', errs)
            print(await pg.evaluate("({doc:document.querySelector('.bf-doc').className, w:document.querySelector('.bf-doc').getBoundingClientRect().width, rows:[].map.call(document.querySelectorAll('.bf-row'), function(r){ return r.children.length+':'+getComputedStyle(r).gridTemplateColumns; })})"))
            await br.close()
    finally: srv.terminate()
asyncio.run(main())
