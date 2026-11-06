// Targeted gameplay checks. Run after `npm run build`.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

// Expose internal setup helpers only in the test page, without changing the sim API.
const html = fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'index.html'), 'utf8');
assert.ok(html.includes('window.__sim={'), 'simulation test API is missing');
const testHtml = html.replace('window.__sim={',
  'window.__test={MAP,buildNav,crewStep,windChange,mkUnit,MAINS,edgePt};window.__sim={');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  async function check(name, run, verify) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      // Advance the engine explicitly so animation cannot affect the test state.
      await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
      await page.setContent(testHtml, { waitUntil: 'domcontentloaded' });
      verify(await page.evaluate(run));
      assert.deepEqual(errors, [], 'browser errors');
      console.log('OK', name);
    } catch (e) {
      console.error('FAIL', name, e);
      process.exitCode = 1;
    } finally {
      await page.close();
    }
  }
  try {
    await check('navigation follows roads and blocks water at their actual coordinates', () => {
      const { MAP, buildNav } = window.__test;
      const { NV } = window.__sim;
      for (const k of ['wood', 'res', 'water', 'creeks']) MAP[k] = [];
      MAP.roads = [['a', 'test road', [[1000, -11000], [1000, -9000]]]];
      MAP.water = [['test dam', [[2000, -11000], [3000, -11000], [3000, -9000], [2000, -9000]]]];
      buildNav();
      const speed = (x, y) => NV.spd[Math.floor((y - NV.y0) / NV.c) * NV.w + Math.floor((x - NV.x0) / NV.c)] * 3.6;
      return [speed(1000, -9990), speed(1000, 3990), speed(2500, -9990), speed(2500, 3990)];
    }, speeds => {
      [100, 12, 0, 12].forEach((expected, i) => assert.ok(Math.abs(speeds[i] - expected) < .001,
        `terrain sample ${i}: expected ${expected} km/h, got ${speeds[i]}`));
    });

    await check('spot-head attack counts current crews rather than elapsed seconds', () => {
      const w = window.__sim, r = window.__test;
      w.S.mayday = 0; w.S.heat = 0;
      const lobe = { ox: 12000, oy: 0, dx: 1, dy: 0, s: 500, lb: 5, kind: 's', held: false, work: 0 };
      w.F.lobes.push(lobe);
      const crew = r.mkUnit({ type: 'TK', name: 'test crew', x: 12500, y: 0, state: 'attack', tac: 'direct', water: 100000 });
      w.units.push(crew);
      for (let t = 1; t < 60; t++) { w.S.t = t; r.crewStep(); }
      const count = lobe.hc;
      w.S.t = 60; r.crewStep();
      const firstMinute = { progress: lobe.prog || 0, checked: !!lobe.chk };
      w.units.push(r.mkUnit({ type: 'TK', name: 'second crew', x: 12500, y: 0, state: 'attack', tac: 'direct' }));
      w.S.t = 61; r.crewStep(); const twoCrews = lobe.hc;
      crew.state = 'idle'; w.units[1].state = 'idle';
      w.S.t = 62; r.crewStep();
      return { count, firstMinute, twoCrews, noCrews: lobe.hc };
    }, result => {
      assert.equal(result.count, 1);
      assert.ok(result.firstMinute.progress <= 4, 'one crew cannot create a full head check in a minute');
      assert.equal(result.firstMinute.checked, false, 'one minute of one crew cannot check the head');
      assert.equal(result.twoCrews, 2);
      assert.equal(result.noCrews, 0, 'departed crews must stop contributing');
    });

    await check('wind change retains only locally attended NE-flank sections', () => {
      const w = window.__sim, r = window.__test;
      const run = (side, withCrew) => {
        w.reset(); w.F.s = 4000; w.F.hwL.fill(400); w.F.hwR.fill(400);
        w.F.hL[30] = 1; w.F.hL[80] = 1;
        const q = r.edgePt(30, side);
        if (withCrew) w.units.push(r.mkUnit({ type: 'TK', name: 'test crew', x: q[0], y: q[1], state: 'attack', eng: 1 }));
        r.windChange();
        return [w.F.hL[30], w.F.hL[80]];
      };
      return { local: run(1, true), oppositeFlank: run(-1, true), unattended: run(1, false) };
    }, result => {
      assert.deepEqual(result.local, [1, 0]);
      assert.deepEqual(result.oppositeFlank, [0, 0]);
      assert.deepEqual(result.unattended, [0, 0]);
    });

    await check('scenario reset clears every town water main', () => {
      const w = window.__sim, { MAINS } = window.__test;
      for (const m of Object.values(MAINS)) Object.assign(m,
        { draws: 10, boost: 2, collapseUntil: 5000, load: 4, cap: 6, warnT: 123 });
      w.reset();
      return MAINS;
    }, mains => {
      for (const [town, main] of Object.entries(mains)) assert.deepEqual(main,
        { draws: 0, boost: 0, collapseUntil: 0, load: 0, cap: 2, warnT: -9999 }, town);
    });

  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
