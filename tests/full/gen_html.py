# genere le document publie par Spoties (gabarit complet) pour tester son rendu dans 6flt Clients
import asyncio, json, sys, subprocess, time
from playwright.async_api import async_playwright
sys.path.insert(0, '.')
from run_v155 import seed, newpage, BASE
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--bind', '127.0.0.1'], cwd='/home/claude', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch()
            init = seed().replace('"type": "Route"', '"type": "Route", "images": ["https://gpirhmddoeokakikbjkr.supabase.co/storage/v1/object/public/photos/a.jpg"]').replace('"type": "Lac"', '"type": "Lac", "images": ["https://gpirhmddoeokakikbjkr.supabase.co/storage/v1/object/public/photos/b.jpg"]')
            ctx, pg, errs, d = await newpage(br, init)
            await pg.goto(BASE+'index.html'); await pg.wait_for_timeout(2500)
            await pg.evaluate("window.bfSetDate('bf_1', '2026-10-15', '14:00')"); await pg.wait_for_timeout(800)
            row = await pg.evaluate("window.__DB.shared_briefings[0]")
            json.dump(row, open('gen_row.json', 'w'))
            print('html', len(row.get('html_public') or ''), 'erreurs', errs)
            await br.close()
    finally: srv.terminate()
asyncio.run(main())
