import asyncio, sys, time, subprocess
import run_v155 as R
R.SP='/tmp/claude-0/-home-claude/ed6429f5-ef8b-5687-ab3f-2e22f0b7d269/scratchpad'
async def main():
    srv = subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1'], cwd='/home/claude', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with R.async_playwright() as p:
            br = await p.chromium.launch()
            for w,h in [(1280,720),(1366,768),(1536,864),(1920,1080)]:
                ctx = await br.new_context(viewport={'width':w,'height':h}, service_workers='block', locale='fr-FR', timezone_id='Europe/Paris')
                await ctx.route('**/*', R.route); await ctx.add_init_script(R.seed())
                pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto(R.BASE+'index.html'); await pg.wait_for_timeout(2500)
                await pg.evaluate("switchView('planning'); window.bfOpenDoc && window.bfOpenDoc('bf_1')"); await pg.wait_for_timeout(1200)
                st = await pg.evaluate("(function(){ var c=document.querySelector('.bf-center').getBoundingClientRect(), s=document.getElementById('bf-send').getBoundingClientRect(), t=document.querySelector('.bf-toolbar').getBoundingClientRect(); return {center:Math.round(c.width), sendR:Math.round(s.right), centerR:Math.round(c.right), sendW:Math.round(s.width), tbH:Math.round(t.height)}; })()")
                print(w, st)
                R.check('%d : Partager visible en entier dans la zone centrale' % w, st['sendR'] <= st['centerR'] and st['sendW'] > 60)
                R.check('%d : pas d erreur' % w, not errs)
                await pg.screenshot(path=R.SP+'/tb_%d.png' % w, clip={'x':0,'y':0,'width':w,'height':200})
                await ctx.close()
            await br.close()
    finally: srv.terminate()
    print('ECHECS', R.fails)
asyncio.run(main())
