import asyncio, sys, time, subprocess, json
import run_v155 as R
BASE='http://localhost:8765/6flt-photoshoot-map/c/'
INIT = """window.__DB={}; window.__RPC={
 peek_shared_brief:function(a){return {title:'Séance '+a.p_token, data:{tbd:true,tone:'tu'}, html:'<p>doc</p>'};},
 get_shared_brief:function(a){return {title:'Séance '+a.p_token, data:{tbd:true,tone:'tu'}, html:'<p>doc '+a.p_token+'</p>', revealed:false};},
 get_date_proposal:function(){return {};}
};
if(!sessionStorage.getItem('s')){ localStorage.setItem('6fltc_tokens', JSON.stringify([{token:'AAAAAAAAAA'},{token:'BBBBBBBBBB'},{token:'CCCCCCCCCC'}])); sessionStorage.setItem('s','1'); }"""
async def main():
    srv = subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1'], cwd='/home/claude', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        async with R.async_playwright() as p:
            br = await p.chromium.launch()
            ctx, pg, errs, d = await R.newpage(br, INIT)
            await pg.goto(BASE+'?b=DDDDDDDDDD'); await pg.wait_for_timeout(1500)
            u = await pg.evaluate('location.search'); print('  url', u)
            R.check('adresse = seulement le lien ouvert', u=='?b=DDDDDDDDDD')
            R.check('la seance est ouverte', 'DDDDDDDDDD' in await pg.evaluate("document.getElementById('cv-root').textContent"))
            await pg.reload(); await pg.wait_for_timeout(1500)
            u = await pg.evaluate('location.search'); print('  url apres rechargement', u)
            R.check('apres rechargement, toujours une seule seance dans l adresse', u=='?b=DDDDDDDDDD')
            await pg.goto(BASE); await pg.wait_for_timeout(1500)
            u = await pg.evaluate('location.search')
            R.check('page sans lien : adresse vide', u=='')
            n = await pg.evaluate("document.querySelectorAll('#view-list .card').length")
            R.check('la liste de l appareil reste complete (4)', n==4)
            man = await pg.evaluate("document.querySelector('link[rel=manifest]').href")
            R.check('manifest local garde toutes les seances (app installee)', 'AAAAAAAAAA' in __import__('urllib.parse').parse.unquote(man) and 'DDDDDDDDDD' in __import__('urllib.parse').parse.unquote(man))
            R.check('aucune erreur JS', not errs); print('  ', errs[:3])
            await br.close()
    finally: srv.terminate()
    print('ECHECS', R.fails)
asyncio.run(main())
