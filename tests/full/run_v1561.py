import asyncio, sys, time, subprocess
sys.argv=['x']
import run_v155 as R
R.SP='/tmp/claude-0/-home-claude/ed6429f5-ef8b-5687-ab3f-2e22f0b7d269/scratchpad'
async def main():
    srv = subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1'], cwd='/home/claude', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        async with R.async_playwright() as p:
            br = await p.chromium.launch()
            ctx, pg, errs, dialogs = await R.newpage(br, R.seed(date='2026-10-15'))
            await pg.goto(R.BASE+'index.html?go=client:c1'); await pg.wait_for_timeout(3500)
            n0 = await pg.evaluate("__LOG.filter(function(l){return l.rpc==='owner_ping'}).length")
            R.check('ping au demarrage', n0==1)
            await pg.evaluate("document.querySelector('#client-links-list [data-lact=\"copy\"]') ? 0 : 0")
            btns = await pg.evaluate("Array.from(document.querySelectorAll('#client-links-list [data-lact]')).map(function(b){return b.getAttribute('data-lact')})")
            print('   boutons', btns)
            tgt = 'copy' if 'copy' in btns else btns[-1]
            await pg.click('#client-links-list [data-lact="%s"]' % tgt); await pg.wait_for_timeout(400)
            n1 = await pg.evaluate("__LOG.filter(function(l){return l.rpc==='owner_ping'}).length")
            R.check('ping au copier/partager ('+tgt+')', n1==2)
            await pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await pg.wait_for_timeout(200)
            n2 = await pg.evaluate("__LOG.filter(function(l){return l.rpc==='owner_ping'}).length")
            R.check('pas de ping en rafale au retour dans l app', n2==2)
            R.check('version affichee', (await pg.evaluate('APP_VERSION')).startswith('v1.'))
            R.check('aucune erreur JS', not errs); print('  ', errs[:3])
            await br.close()
    finally:
        srv.terminate()
    print('ECHECS', R.fails)
asyncio.run(main())
