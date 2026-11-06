// Display-state and real-menu checks, independent of crew decision policy.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const html = fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'index.html'), 'utf8').replace('window.__sim={','window.__uiTest={mkUnit,renderUnits,ROSTER};window.__sim={');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**',route=>route.abort());
    await page.route('https://fonts.gstatic.com/**',route=>route.abort());
    await page.evaluate(()=>window.requestAnimationFrame=()=>0);
    await page.setContent(html,{waitUntil:'domcontentloaded'});
    const fixture=await page.evaluate(()=>{
      const w=window.__sim,r=window.__uiTest;
      const a=r.mkUnit({type:'TK',name:'Alpha tanker',x:2000,y:-1000,team:'A',state:'idle',routeBlocked:true,water:1800}),
        b=r.mkUnit({type:'TK',name:'Bravo tanker',x:4000,y:-3000,team:'A',state:'filling',fillT:200,fillSrc:{kind:'dam'}}),
        c=r.mkUnit({type:'TK',name:'Charlie tanker',x:7000,y:-5000,team:'B',state:'idle',waterWait:true,water:600}),
        d=r.mkUnit({type:'SUP',name:'Delta UHT',x:6000,y:-6000,team:'-',state:'wpoint',stock:0});
      w.units.push(a,b,c,d);r.renderUnits();return{a:a.id,b:b.id,c:c.id,d:d.id};
    });
    assert.equal(await page.locator('#bLocateSelected').isDisabled(),true);
    assert.equal(await page.locator('#selectionStatus').isVisible(),false);
    await page.locator('[data-selteam="A"]').click();
    assert.match(await page.locator('#selectionStatus').innerText(),/Route blocked/);
    assert.match(await page.locator('#selectionStatus').innerText(),/Filling/);
    assert.match(await page.locator('[data-tsum="A"]').innerText(),/route blocked/);
    assert.equal(await page.locator('#attentionCount').innerText(),'3');
    assert.equal(await page.locator('#mapOrderHint').innerText(),'Strike team A · Move · click a destination');
    const beforeOrders=await page.evaluate(()=>window.__sim.units.map(u=>[u.id,u.lastOrder||null,u.path]));
    await page.locator('#bLocateSelected').click();
    assert.deepEqual(await page.evaluate(()=>{const v=window.__sim.view();return[v.cx,v.cy]}),[3000,-2000]);
    assert.deepEqual(await page.evaluate(()=>window.__sim.units.map(u=>[u.id,u.lastOrder||null,u.path])),beforeOrders);
    // Searching reveals a matching member of a collapsed team without changing its saved collapse state.
    assert.equal(await page.locator(`.unit[data-id="${fixture.a}"]`).count(),0);
    await page.locator('#resourceSearch').fill('alpha');
    assert.equal(await page.locator(`.unit[data-id="${fixture.a}"]`).isVisible(),true);
    assert.equal(await page.locator(`.unit[data-id="${fixture.b}"]`).isVisible(),false);
    assert.equal(await page.evaluate(()=>window.__sim.S.coll.has('A')),true);
    assert.equal(await page.locator('#resourceFilterCount').innerText(),'1 of 4 resources shown');
    await page.locator('#bResetResourceFilter').click();
    assert.equal(await page.locator(`.unit[data-id="${fixture.a}"]`).count(),0);
    assert.equal(await page.evaluate(()=>window.__sim.S.sel.size),2);
    await page.locator('[data-resource-filter="attention"]').click();
    assert.equal(await page.locator(`.unit[data-id="${fixture.a}"]`).isVisible(),true);
    assert.equal(await page.locator(`.unit[data-id="${fixture.c}"]`).isVisible(),true);
    assert.equal(await page.locator(`.unit[data-id="${fixture.b}"]`).isVisible(),false);
    assert.match(await page.locator(`.unit[data-id="${fixture.c}"]`).innerText(),/Waiting for water/i);
    const focused=page.locator(`.unit[data-id="${fixture.a}"] .unit-name`);
    await focused.focus();await page.keyboard.press('Enter');
    assert.equal(await focused.evaluate(el=>el===document.activeElement),true,'selecting a card should retain keyboard focus');
    assert.equal(await focused.getAttribute('aria-pressed'),'true');

    await page.locator('#resourceSearch').fill('does not exist');
    assert.equal(await page.locator('#emptyResourceFilter').isVisible(),true);
    await page.locator('#bResetResourceFilter').click();
    await page.locator('[data-resource-filter="selected"]').click();
    assert.equal(await page.locator(`.unit[data-id="${fixture.a}"]`).isVisible(),true);
    assert.equal(await page.locator(`.unit[data-id="${fixture.c}"]`).isVisible(),false);
    await page.locator('#bClr').click();
    assert.equal(await page.locator('#bFilterSelected').isDisabled(),true);
    assert.equal(await page.locator('[data-resource-filter="all"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#selectionStatus').isVisible(),false);
    // Keyboard team reassignment keeps the moved resource's control in view and focused.
    await page.locator('[data-resource-filter="attention"]').click();
    const teamSelect=page.locator(`select[data-team="${fixture.a}"]`);await teamSelect.focus();await teamSelect.selectOption('B');
    assert.equal(await page.locator(`select[data-team="${fixture.a}"]`).evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.evaluate(()=>window.__sim.S.coll.has('B')),false);
    await page.locator('#bResetResourceFilter').click();
    // Unavailable supplies can be located but cannot receive a refill or default-source order.
    const damIndex=await page.evaluate(()=>{const w=window.__sim,r=window.__uiTest,d=w.DAMS.find(d=>d.wp);d.known=2;d.usable=false;r.renderUnits();return w.DAMS.indexOf(d)});
    await page.locator('[data-t="cmd"]').click();
    await page.locator('#reqD > summary').click();
    assert.equal(await page.locator(`[data-wsend="d${damIndex}"]`).isDisabled(),true);
    assert.equal(await page.locator(`[data-wdef="d${damIndex}"]`).isDisabled(),true);
    assert.equal(await page.locator(`[data-wshow="d${damIndex}"]`).isEnabled(),true);
    assert.equal(await page.locator(`[data-wsend="u${fixture.d}"]`).isDisabled(),true);
    assert.match(await page.locator('#wDef').innerText(),/quickest available water source/);
    await page.locator('[data-t="units"]').click();
    await page.locator('[data-resource-filter="attention"]').click();
    await page.locator(`.unit[data-id="${fixture.a}"] .unit-name`).click();
    // A tanker cannot set up a water point; a medical crew retains Move to safety only.
    assert.equal(await page.locator('#wOrders [data-m="wp"]').isDisabled(),true);
    await page.evaluate(id=>{const w=window.__sim,r=window.__uiTest,u=w.units.find(u=>u.id===id);u.state='medical';u.waterWait=false;w.S.sel=new Set([id]);r.renderUnits()},fixture.c);
    assert.equal(await page.locator('#orders [data-m="direct"]').isDisabled(),true);
    assert.equal(await page.locator('#orders [data-m="go"]').isEnabled(),true);
    assert.equal(await page.locator('#bBail').isDisabled(),true);
    await page.evaluate(id=>{const w=window.__sim,r=window.__uiTest;w.S.sel=new Set([id]);r.renderUnits()},fixture.a);
    // Selected details remain usable and the viewport stays bounded at short and narrow sizes.
    for(const [width,height]of[[1440,900],[1024,600],[900,500],[736,768],[390,844],[320,640]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(100);
      const geometry=await page.evaluate(()=>{
        const ids=['mapwrap','selectionOrders','uscroll','liveLog'];const out={scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight};
        for(const id of ids){const r=document.getElementById(id).getBoundingClientRect();out[id]={width:r.width,height:r.height,bottom:r.bottom,top:r.top}}return out;
      });
      assert.ok(geometry.scrollW<=width+1,`horizontal overflow ${width}`);assert.ok(geometry.scrollH<=height+1,`vertical overflow ${width}`);
      assert.ok(geometry.mapwrap.height>0&&geometry.uscroll.height>40,`collapsed map/roster ${width}: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.liveLog.top>=geometry.mapwrap.bottom-1,`log overlaps map ${width}`);
      assert.ok(geometry.uscroll.bottom<=height+1,`roster below window ${width}`);
      assert.equal(await page.locator('#selectionStatus').isVisible(),true);
    }
    const touch=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    touch.on('pageerror',e=>errors.push(e.message));
    await touch.evaluate(()=>window.requestAnimationFrame=()=>0);await touch.setContent(html,{waitUntil:'domcontentloaded'});
    await touch.evaluate(()=>{const w=window.__sim,r=window.__uiTest;for(let i=0;i<2;i++)w.units.push(r.mkUnit({type:'TK',name:'Touch test tanker '+i,x:2000+i*400,y:-2000}));r.renderUnits();document.getElementById('bTnk').click()});
    for(const [width,height]of[[390,844],[320,640]]){await touch.setViewportSize({width,height});await touch.waitForTimeout(100);const fit=await touch.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,map:document.getElementById('mapwrap').getBoundingClientRect().height,roster:document.getElementById('uscroll').getBoundingClientRect().height}));assert.ok(fit.width<=width+1&&fit.height<=height+1&&fit.map>0&&fit.roster>40,'touch layout overflow: '+JSON.stringify({width,height,fit}))}
    await touch.close();
    assert.deepEqual(errors,[]);console.log('OK UI polish: selected task feedback, map locate, search/filter/collapse preservation, unavailable supplies and responsive layout');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
