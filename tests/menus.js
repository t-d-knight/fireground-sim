// Exercise the real menus and map together, including selection and withdrawal scope.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'index.html'));
    await page.waitForFunction(() => !!window.__sim);
    assert.equal(await page.locator('#selectionName').innerText(), 'No resources selected');
    assert.equal(await page.locator('#orders').isVisible(), false);
    assert.equal(await page.locator('#liveLog').isVisible(), true);
    assert.match(await page.locator('#mapLog').innerText(), /Press Start/);
    await page.locator('#bStart').click();
    assert.equal(await page.evaluate(() => window.__sim.S.running), true);
    await page.locator('#bStart').click();
    await page.evaluate(() => {
      const w = window.__sim;
      w.reset(); w.S.heat = 0; w.S.mayday = 0;
      for (let i = 0; i < 900; i++) w.tick();
    });

    // Requests use the live dispatch queue; they must remain connected after roster rebuilds.
    await page.locator('[data-t="cmd"]').click();
    assert.equal(await page.locator('#liveLog').isVisible(), true);
    await page.locator('#bMT').click();
    const requested = await page.evaluate(() => ({ level: window.__sim.S.mtLevel, pending: window.__sim.S.pend.length }));
    assert.equal(requested.level, 10);
    assert.ok(requested.pending > 0);
    assert.match(await page.locator('#arrivalList').innerText(), /paged|turnout/i);
    await page.locator('#bAIR').click();
    assert.equal(await page.evaluate(() => window.__sim.S.air.req), true);
    assert.match(await page.locator('#arrivalList').innerText(), /Firebird 305/);
    await page.locator('#bAMB').click();
    assert.match(await page.locator('#arrivalList').innerText(), /Ambulance/);
    await page.locator('#bUHT').click();
    assert.equal(await page.evaluate(() => window.__sim.S.uht), true);
    const newestMessage = await page.evaluate(() => {
      const last = window.__sim.S.log.filter(x => x.cls !== 'fac').at(-1);
      const el = document.createElement('div'); el.innerHTML = last.msg;
      return el.textContent;
    });
    assert.ok((await page.locator('#mapLog > div').first().innerText()).includes(newestMessage));
    await page.getByText('Strike team organisation', { exact: true }).click();
    await page.locator('#bST').click();
    await page.locator('[data-t="units"]').click();
    await page.locator('[data-selteam="A"]').click();
    assert.equal(await page.locator('#selectionName').innerText(), 'Strike team A');
    assert.equal(await page.evaluate(() => window.__sim.S.sel.size), 5);

    const mapClick = async (x, y) => {
      const p = await page.evaluate(([x, y]) => {
        const v = window.__sim.view(), r = document.getElementById('cv').getBoundingClientRect();
        return { x: r.width / 2 + (x - v.cx) * v.k, y: r.height / 2 - (y - v.cy) * v.k };
      }, [x, y]);
      await page.locator('#cv').click({ position: p });
      await page.waitForFunction(() => window.__sim.pendingOrders === 0);
    };
    const orderModes = () => page.evaluate(() => window.__sim.units.filter(u => window.__sim.S.sel.has(u.id)).map(u => u.lastOrder && u.lastOrder.mode));
    for (const mode of ['direct', 'parallel', 'indirect']) {
      await page.locator(`[data-m="${mode}"]`).click();
      await mapClick(1000, -1000);
      assert.ok((await orderModes()).every(m => m === mode), `${mode} map order not delivered`);
    }
    await page.locator('[data-m="go"]').click();
    assert.equal(await page.locator('#defRow').isVisible(), false);
    await mapClick(-400, 300);
    assert.ok(await page.evaluate(() => window.__sim.units.filter(u => window.__sim.S.sel.has(u.id)).every(u => u.tgt && u.tgt.kind === 'go')));
    await page.locator('[data-m="defend"]').click();
    await mapClick(1000, -1000);
    await mapClick(2000, -1000);
    await page.locator('#bDefGo').click();
    await page.waitForFunction(() => window.__sim.pendingOrders === 0);
    assert.ok((await orderModes()).every(m => m === 'defend'));

    // Changing panes must preserve both the live selection and issued orders.
    const snapshot = () => page.evaluate(() => window.__sim.units.map(u => [u.id, { task: u.lastOrder && u.lastOrder.mode, destination: u.tgt && [u.tgt.kind, u.tgt.px, u.tgt.py] }]));
    const beforePane = await snapshot();
    await page.locator('[data-t="fac"]').click();
    assert.equal(await page.locator('#fReset').isVisible(), true);
    assert.equal(await page.locator('#liveLog').isVisible(), true);
    await page.locator('#fRf').click();
    assert.equal(await page.locator('#liveLogAlert').isVisible(), true);
    assert.match(await page.locator('#mapLog > div').first().innerText(), /RED FLAG WARNING/);
    await page.locator('#fRc').click();
    assert.equal(await page.locator('#liveLogAlert').isVisible(), false);
    await page.locator('[data-t="ass"]').click();
    assert.equal(await page.locator('#liveLog').isVisible(), true);
    await page.getByText('Methods of attack', { exact: true }).click();
    assert.match(await page.locator('#p-ass').innerText(), /Parallel attack/);
    await page.locator('[data-t="units"]').click();
    assert.deepEqual(await snapshot(), beforePane);

    // Withdrawing one selected appliance must not turn into an incident-wide order.
    await page.locator('[data-coll="A"]').click();
    await page.locator('.unit[data-id] .unit-name').first().click();
    const selectedId = await page.evaluate(() => [...window.__sim.S.sel][0]);
    const beforeWithdrawal = await snapshot();
    await page.locator('#bBail').click();
    await page.waitForFunction(() => window.__sim.pendingOrders === 0);
    const afterWithdrawal = await snapshot();
    assert.deepEqual(afterWithdrawal.filter(x => x[0] !== selectedId), beforeWithdrawal.filter(x => x[0] !== selectedId));
    assert.equal(afterWithdrawal.find(x => x[0] === selectedId)[1].destination[0], 'go');
    await page.locator('#cv').click({ button: 'right', position: { x: 120, y: 120 } });
    assert.equal(await page.evaluate(() => window.__sim.S.sel.size), 0);
    assert.equal(await page.locator('#bBail').isDisabled(), true);
    assert.deepEqual(await snapshot(), afterWithdrawal);
    await page.locator('[data-t="cmd"]').click();
    await page.getByText('Incident-wide withdrawal', { exact: true }).click();
    await page.locator('#bBailAll').click();
    await page.waitForFunction(() => window.__sim.pendingOrders === 0);
    assert.ok((await snapshot()).every(x => x[1].destination && x[1].destination[0] === 'go'));

    // Water orders in Requests retain their selection and return to the map task panel.
    await page.locator('[data-t="units"]').click();
    await page.locator('[data-selteam="A"]').click();
    await page.locator('[data-t="cmd"]').click();
    await page.locator('#reqD > summary').click();
    await page.locator('[data-m="fill"]').click();
    assert.equal(await page.locator('#p-units').isVisible(), true);
    assert.equal(await page.evaluate(() => window.__sim.S.mode), 'fill');
    assert.equal(await page.evaluate(() => window.__sim.S.sel.size), 5);

    await page.locator('#openFullLog').click();
    assert.equal(await page.locator('#p-log').isVisible(), true);
    assert.equal(await page.locator('#liveLog').isVisible(), true);
    await page.locator('[data-log-filter="warnings"]').click();
    assert.ok(await page.locator('#log [data-log-type="warnings"]:visible').count());
    assert.equal(await page.locator('#log [data-log-type="orders"]:visible').count(), 0);
    await page.locator('[data-log-filter="all"]').click();
    await page.locator('[data-t="units"]').click();

    for (const [width, height] of [[2560, 1440], [1440, 900], [1024, 600], [900, 500], [736, 768], [390, 844], [320, 640]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(80);
      const fit = await page.evaluate(() => {
        const map = document.getElementById('mapwrap').getBoundingClientRect();
        const side = document.querySelector('.side').getBoundingClientRect();
        const log = document.getElementById('liveLog').getBoundingClientRect();
        return { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, map: [map.width, map.height], mapBottom: map.bottom, logTop: log.top, logBottom: log.bottom, sideBottom: side.bottom };
      });
      assert.ok(fit.width <= width + 1, `horizontal overflow at ${width}: ${JSON.stringify(fit)}`);
      assert.ok(fit.height <= height + 1, `vertical overflow at ${width}: ${JSON.stringify(fit)}`);
      assert.ok(fit.sideBottom <= height + 1, `panel outside window at ${width}`);
      assert.ok(fit.map[0] > 0 && fit.map[1] > 0, `map collapsed at ${width}`);
      assert.ok(fit.logTop >= fit.mapBottom - 1 && fit.logBottom <= height + 1, `live log overlaps map or leaves window at ${width}`);
    }
    // A real canvas click preserves the selected head and explains an unavailable attack.
    await page.setViewportSize({ width: 1440, height: 900 });
    const headClick = await page.evaluate(() => {
      const w=window.__sim, id=+document.querySelector('.unit[data-id]').dataset.id, u=w.units.find(u=>u.id===id);
      u.state='idle';u.path=null;u.target=null;u.water=u.cap;u.crew=5;
      w.S.sel.clear();w.F.s=2000;w.F.contained=false;w.F.wc=false;w.F.gust=true;w.F.hwL.fill(300);w.F.hwR.fill(300);
      const p=[Math.SQRT1_2*w.F.s,-Math.SQRT1_2*w.F.s],v=w.view();u.x=p[0]+Math.SQRT1_2*400;u.y=p[1]+Math.SQRT1_2*400;u.prevX=u.x;u.prevY=u.y;v.cx=p[0];v.cy=p[1];v.k=.06;
      return p;
    });
    await page.locator('.unit[data-id] .unit-name').first().click();
    for (const mode of ['direct', 'parallel']) {
      await page.locator(`[data-m="${mode}"]`).click();
      await mapClick(...headClick);
      assert.ok(await page.evaluate(() => {
        const w=window.__sim,u=w.units.find(u=>w.S.sel.has(u.id));
        return u.target.type==='head'&&u.target.playerHead&&u.headHold&&!u.path;
      }));
      assert.match(await page.locator('#selectionStatus').innerText(), /Head selected · gust hold/);
      assert.match(await page.locator('#mapOrderHint').innerText(), /click the fire edge|click near the fire edge/);
      assert.match(await page.locator('#mapLog').innerText(), /head approach paused/);
    }
    // Switching trucks on the canvas works while an attack tool remains selected.
    const clickable = await page.evaluate(() => {
      const w=window.__sim,T=w.units.filter(u=>u.type!=='SUP').slice(0,2);
      T.forEach((u,i)=>{u.state='idle';u.path=null;u.target=null;u.x=u.prevX=2000+i*3000;u.y=u.prevY=1000});
      const v=w.view();v.cx=3500;v.cy=1000;v.k=.08;return T.map(u=>u.id);
    });
    await page.locator('[data-m="direct"]').click();
    await page.keyboard.press('Escape');
    await mapClick(2000,1000);
    assert.deepEqual(await page.evaluate(() => [...window.__sim.S.sel]), [clickable[0]]);
    await mapClick(5000,1000);
    assert.deepEqual(await page.evaluate(() => [...window.__sim.S.sel]), [clickable[1]]);
    await page.locator('#cv').click({ button:'right', position:{x:100,y:100} });
    await mapClick(2000,1000);
    assert.deepEqual(await page.evaluate(() => [...window.__sim.S.sel]), [clickable[0]]);
    const secondPosition = await page.evaluate(() => {
      const v=window.__sim.view(),r=document.getElementById('cv').getBoundingClientRect();return{x:r.width/2+(5000-v.cx)*v.k,y:r.height/2-(1000-v.cy)*v.k};
    });
    await page.locator('#cv').click({ position:secondPosition, modifiers:['Shift'] });
    assert.deepEqual(await page.evaluate(() => [...window.__sim.S.sel].sort((a,b)=>a-b)), [...clickable].sort((a,b)=>a-b));
    await page.locator('#cv').click({ position:secondPosition, modifiers:['Meta'] });
    assert.deepEqual(await page.evaluate(() => [...window.__sim.S.sel]), [clickable[0]]);
    assert.deepEqual(errors, []);
    console.log('OK live menus: dispatch, selection, all attack methods, defence deployment, withdrawal scope, water orders, live log, warnings, filters, responsive layout and explicit head selection');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
