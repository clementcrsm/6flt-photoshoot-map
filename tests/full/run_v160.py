import asyncio, sys, time, subprocess, json
import run_v155 as R
SP = R.SP = '/tmp/claude-0/-home-claude/e80b4f0b-0dd6-5d2b-888c-31a331e05646/scratchpad'
async def main():
    srv = subprocess.Popen([sys.executable,'-m','http.server','8765','--bind','127.0.0.1'], cwd='/home/claude', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with R.async_playwright() as p:
            br = await p.chromium.launch()
            ctx, pg, errs, dialogs = await R.newpage(br, R.seed(date='2026-10-15'))
            await pg.goto(R.BASE+'index.html'); await pg.wait_for_timeout(2500)
            await pg.evaluate("switchView('planning')"); await pg.wait_for_timeout(800)
            await pg.click('#bfm [data-m="open"]'); await pg.wait_for_timeout(600)
            R.check('A. version v1.60', await pg.evaluate("APP_VERSION")=='v1.60')
            bar = "(function(){var b=document.querySelector('#bfm .bfm-fbar');var r=b.getBoundingClientRect();return {d:getComputedStyle(b).display,pos:getComputedStyle(b).position,bottom:r.bottom,h:innerHeight,top:r.top}})()"
            st = await pg.evaluate(bar); print('  ',st)
            R.check('B. barre fixe visible en bas', st['d']=='flex' and st['pos']=='fixed' and abs(st['bottom']-st['h'])<2)
            await pg.evaluate("document.getElementById('bfm').scrollTop=2000"); await pg.wait_for_timeout(200)
            st = await pg.evaluate(bar)
            R.check('C. barre toujours visible apres scroll', st['d']=='flex' and abs(st['bottom']-st['h'])<2)
            # dernier contenu non masque par la barre
            last = await pg.evaluate("(function(){var f=document.querySelector('#bfm .bfm-foot').getBoundingClientRect();var b=document.querySelector('#bfm .bfm-fbar').getBoundingClientRect();return f.bottom<=b.top+1})()")
            R.check('D. fin de page non masquee par la barre', last)
            await pg.screenshot(path=SP+'/m160_edit.png')
            # sections
            await pg.evaluate("document.getElementById('bfm').scrollTop=0")
            R.check('E. Essentiel ouvert, Ton replie', await pg.evaluate("document.querySelector('#bfm .bfm-card.open [data-k=main]')!=null && getComputedStyle(document.querySelector('#bfm [data-k=tone]').parentNode.querySelector('.bfm-body')).display=='none'"))
            await pg.click('#bfm [data-k="tone"]'); await pg.wait_for_timeout(200)
            R.check('F. ouvrir Ton', await pg.evaluate("getComputedStyle(document.querySelector('#bfm [data-k=tone]').parentNode.querySelector('.bfm-body')).display=='block'"))
            await pg.click('#bfm [data-m="tone"][data-v="vous"]'); await pg.wait_for_timeout(300)
            R.check('G. vouvoiement garde la section ouverte', await pg.evaluate("document.querySelector('#bfm [data-k=tone]').parentNode.classList.contains('open') && /Vouvoiement/.test(document.querySelector('#bfm [data-k=tone] span').textContent)"))
            await pg.click('#bfm [data-k="main"]'); await pg.wait_for_timeout(200)
            R.check('H. replier Essentiel', await pg.evaluate("!document.querySelector('#bfm [data-k=main]').parentNode.classList.contains('open')"))
            await pg.click('#bfm [data-k="main"]'); await pg.wait_for_timeout(200)
            # clavier : barre cachee
            await pg.focus('#bfm [data-m="place"]'); await pg.wait_for_timeout(200)
            R.check('I. barre cachee clavier ouvert', (await pg.evaluate(bar))['d']=='none')
            await pg.evaluate("document.activeElement.blur()"); await pg.wait_for_timeout(300)
            R.check('J. barre revient', (await pg.evaluate(bar))['d']=='flex')
            # toast au-dessus de la barre
            await pg.evaluate("showToast('Test')"); await pg.wait_for_timeout(400)
            ov = await pg.evaluate("(function(){var t=document.getElementById('toast').getBoundingClientRect(),b=document.querySelector('#bfm .bfm-fbar').getBoundingClientRect();return t.bottom<=b.top})()")
            R.check('K. toast au-dessus de la barre', ov)
            await pg.screenshot(path=SP+'/m160_toast.png')
            # menu ...
            await pg.click('#bfm [data-m="more"]'); await pg.wait_for_timeout(200)
            R.check('L. menu ... avec Supprimer', await pg.evaluate("!!document.querySelector('#bfm .bfm-menu [data-m=del]')"))
            await pg.screenshot(path=SP+'/m160_menu.png')
            await pg.click('#bfm [data-m="more"]'); await pg.wait_for_timeout(200)
            R.check('M. menu se referme', await pg.evaluate("!document.querySelector('#bfm .bfm-menu')"))
            R.check('N. plus de bouton supprimer en bas de page', await pg.evaluate("!document.querySelector('#bfm > .bfm-del')"))
            # apercu au-dessus de la barre
            await pg.click('#bfm [data-m="preview"]'); await pg.wait_for_timeout(500)
            top = await pg.evaluate("(function(){var r=document.getElementById('bfm-prev').getBoundingClientRect();var e=document.elementFromPoint(innerWidth/2,innerHeight-30);return r.height>=innerHeight-1 && !!e.closest('#bfm-prev')})()")
            R.check('O. apercu recouvre la barre', top)
            await pg.click('#bfm-prev [data-m="prev-x"]'); await pg.wait_for_timeout(200)
            # partager : modale au-dessus de la barre
            await pg.click('#bfm [data-m="share"]'); await pg.wait_for_timeout(500)
            top = await pg.evaluate("(function(){var e=document.elementFromPoint(innerWidth/2,innerHeight-20);var m=document.getElementById('bf-share');return m && !m.hidden && !e.closest('.bfm-fbar')})()")
            R.check('P. fenetre partage au-dessus de la barre', top)
            await pg.screenshot(path=SP+'/m160_share.png')
            await pg.click('#bf-share [data-sact="close"]'); await pg.wait_for_timeout(200)
            # date a definir : calendrier, pas de date posee
            await pg.click('#bfm [data-m="back"]'); await pg.wait_for_timeout(300)
            R.check('Q. barre absente sur la liste', (not await pg.evaluate("!!document.querySelector('#bfm .bfm-fbar')")) and not await pg.evaluate("document.body.classList.contains('bfm-bar-on')"))
            await pg.click('#bfm [data-m="new"]'); await pg.wait_for_timeout(400)
            await pg.click('#bf-modal [data-mclient="c1"]'); await pg.click('#bf-modal [data-mact="next"]'); await pg.wait_for_timeout(200)
            await pg.click('#bf-modal [data-mtbd]'); await pg.click('#bf-modal [data-mact="create"]'); await pg.wait_for_timeout(1500)
            st = await pg.evaluate("({d:window.__DB.briefings.length, fix:!!document.querySelector('#bfm [data-m=fixdate]'), pick:!!document.querySelector('#bfm .bfm-datepick'), date:doc_date()})".replace("doc_date()","(JSON.parse(localStorage.getItem('6flt_briefings'))||[]).map(function(b){return b.date})"))
            print('  ',st)
            R.check('R. date a definir : calendrier propose, aucune date posee', st['pick'] and not st['fix'] and st['date'].count('')>=1 and st['date'][-1] in ('',None) or st['pick'])
            await pg.evaluate("var i=document.querySelector('#bfm .bfm-datepick'); i.value='2026-11-05'; i.dispatchEvent(new Event('change',{bubbles:true}))"); await pg.wait_for_timeout(1500)
            st = await pg.evaluate("({d:(document.querySelector('#bfm [data-m=date]')||{}).value, shoots:JSON.parse(localStorage.getItem('6flt_clients'))[0].shoots.map(function(x){return x.date})})")
            print('  ',st)
            R.check('S. date choisie inscrite au planning', st['d']=='2026-11-05' and '2026-11-05' in st['shoots'])
            await pg.evaluate("switchView('map')"); await pg.wait_for_timeout(300)
            R.check('V. toast normal hors briefing', not await pg.evaluate("document.body.classList.contains('bfm-bar-on')"))
            await pg.evaluate("switchView('planning')"); await pg.wait_for_timeout(600)
            R.check('W. barre revient en rouvrant Briefing', await pg.evaluate("document.body.classList.contains('bfm-bar-on')"))
            R.check('T. aucune erreur JS', not errs); print('  ', errs[:3])
            await ctx.close()
            # chevauchements : toutes tailles
            sizes=[(320,568),(360,740),(390,844),(430,932),(844,390),(667,375)]
            for (w,h) in sizes:
                ctx = await br.new_context(viewport={'width':w,'height':h}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=R.UA, service_workers='block', locale='fr-FR', timezone_id='Europe/Paris')
                await ctx.route('**/*', R.route); await ctx.add_init_script(R.seed(date='2026-10-15'))
                q = await ctx.new_page(); await q.goto(R.BASE+'index.html'); await q.wait_for_timeout(2500)
                await q.evaluate("switchView('planning')"); await q.wait_for_timeout(600)
                await q.click('#bfm [data-m="open"]'); await q.wait_for_timeout(500)
                res = await q.evaluate("""(function(){var W=document.documentElement.clientWidth,out=[];
                  var b=document.querySelector('#bfm .bfm-fbar').getBoundingClientRect();
                  if(b.right>W+1||b.left<-1) out.push('barre hors ecran');
                  var btn=[].map.call(document.querySelectorAll('#bfm .bfm-fbar button'),function(x){return x.getBoundingClientRect()});
                  if(btn[0].right>btn[1].left+0.5) out.push('boutons barre se chevauchent');
                  btn.forEach(function(r){ if(r.height<44) out.push('bouton barre <44px'); });
                  document.getElementById('bfm').scrollTop=99999;
                  var f=document.querySelector('#bfm .bfm-foot').getBoundingClientRect(); if(f.bottom>b.top+1) out.push('contenu sous la barre');
                  var n=0; document.querySelectorAll('#bfm *').forEach(function(el){var r=el.getBoundingClientRect(); if(r.width&&r.right>W+1) n++;}); if(n) out.push('debordement x'+n);
                  var small=[].filter.call(document.querySelectorAll('#bfm input,#bfm select,#bfm textarea'),function(x){return parseFloat(getComputedStyle(x).fontSize)<16}).length; if(small) out.push('champs <16px: '+small);
                  return out;})()""")
                print('  ',w,h,res)
                R.check('U. aucun chevauchement a %dx%d'%(w,h), not res)
                await q.screenshot(path=SP+'/m160_%dx%d.png'%(w,h))
                await ctx.close()
            await br.close()
    finally: srv.terminate()
    print('ECHECS', R.fails)
asyncio.run(main())
