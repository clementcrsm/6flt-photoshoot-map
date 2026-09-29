# le briefing n'existe que dans le cloud (cree sur un autre appareil) : la fiche doit quand meme montrer le lien et la proposition
import asyncio, json, sys, subprocess, time
from playwright.async_api import async_playwright
sys.path.insert(0, '.')
import run_v155
from run_v155 import seed, newpage, BASE, SP, check
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--bind', '127.0.0.1'], cwd='/home/claude', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch()
            init = seed().replace('"6flt_briefings"', '"6flt_briefings_x"').replace('"6flt_clients"', '"6flt_clients_x"')
            ctx, pg, errs, dialogs = await newpage(br, init)
            await pg.goto(BASE+'index.html?go=client:c1'); await pg.wait_for_timeout(3500)
            st = await pg.evaluate("({open:document.getElementById('client-panel').classList.contains('open'), links:getComputedStyle(document.getElementById('client-links')).display, prop:document.querySelectorAll('.clink-prop').length})")
            print(st)
            check('fiche ouverte depuis la notif (client seulement dans le cloud)', st['open'])
            check('lien client visible (briefing seulement dans le cloud)', st['links']!='none')
            check('proposition visible', st['prop']==1)
            await pg.screenshot(path=SP+'/cloudonly.png')
            print('erreurs', errs)
            await br.close()
    finally: srv.terminate()
    sys.exit(1 if run_v155.fails else 0)
asyncio.run(main())
