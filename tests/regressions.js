// Targeted gameplay checks. Run after `npm run build`.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

// Expose internal setup helpers only in the test page, without changing the sim API.
const html = fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'index.html'), 'utf8');
assert.ok(html.includes('window.__sim={'), 'simulation test API is missing');
const testHtml = html.replace('window.__sim={',
  'window.__test={MAP,buildNav,crewStep,windChange,mkUnit,MAINS,edgePt,COORD,chooseWork,taskAuto,autoStep,lobeGoal,targetGoal,FPS,TACTICS,linePlan,lineTask,linePoint,lineWork,lineState,decayLines,tacticalPressure,headAttackSuitable,rotateForWater,tacticalFallback,stepFire};window.__sim={');

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

    await check('automatic crews divide available work without crowding one fire', () => {
      const w = window.__sim, r = window.__test;
      w.F.s = 6000;
      for (let i = 26; i < 175; i++) w.F.hwL[i] = w.F.hwR[i] = 400;
      const spot = { ox: 2000, oy: -1700, dx: 1, dy: 0, s: 80, lb: 5, kind: 's', reported: true };
      w.F.lobes.push(spot); w.S.t = 100;
      for (let i = 0; i < 12; i++) {
        const u = r.mkUnit({ type: 'TK', name: 'crew ' + i, x: 2000, y: -2000, autoManaged: true, team: i < 5 ? 'A' : '-' });
        w.units.push(u); w.NV.budget = 4; r.taskAuto(u);
      }
      const jobs = w.units.map(u => ({ type: u.target && u.target.type, i: u.target && u.target.i, side: u.target && u.target.side, role: u.target && u.target.lineRole }));
      return jobs;
    }, jobs => {
      assert.equal(jobs.filter(t => t.type === 'lobe').length, 2, 'small spot receives two crews');
      const flanks = jobs.filter(t => t.type === 'flank');
      assert.ok(flanks.length >= 2, 'other crews continue main-fire work');
      assert.ok(flanks.some(t => t.role === 'knockdown'));
      assert.ok(flanks.some(t => t.role === 'blackout'));
      assert.ok(new Set(flanks.map(t => t.side)).size === 2, 'both flanks receive crews');
    });

    await check('spot roles stay stable when another crew leaves', () => {
      const w = window.__sim, r = window.__test;
      const l = { ox: 12000, oy: 0, dx: 1, dy: 0, s: 600, lb: 5, kind: 's' };
      w.F.lobes.push(l);
      for (let i = 0; i < 3; i++) w.units.push(r.mkUnit({ type: 'TK', name: 'crew ' + i, state: 'attack', target: { type: 'lobe', lobe: l } }));
      const before = w.units.map(u => r.lobeGoal(l, u));
      w.units[0].state = 'filling'; w.units[0].target = null;
      return { before: before.slice(1), after: w.units.slice(1).map(u => r.lobeGoal(l, u)) };
    }, result => assert.deepEqual(result.after, result.before));

    await check('merged fires release their crews for a current job', () => {
      const w = window.__sim, r = window.__test;
      w.F.s = 4000; w.F.hwL.fill(300); w.F.hwR.fill(300);
      const removed = { ox: 20000, oy: 0, dx: 1, dy: 0, s: 600, lb: 5, kind: 's', reported: true };
      const u = r.mkUnit({ type: 'TK', name: 'crew', x: 2000, y: -2000, state: 'attack', tac: 'direct', autoManaged: true, target: { type: 'lobe', lobe: removed } });
      w.units.push(u); w.S.t = 100 - u.id; w.NV.budget = 4; r.autoStep();
      return { moving: u.state === 'moving', target: u.target && u.target.type, stale: u.target && u.target.lobe === removed };
    }, result => { assert.equal(result.moving, true); assert.ok(result.target); assert.equal(result.stale, false); });

    await check('automatic tasking respects manual orders and refill journeys', () => {
      const w = window.__sim, r = window.__test;
      w.F.s = 4000; w.F.hwL.fill(300); w.F.hwR.fill(300);
      const u = r.mkUnit({ type: 'TK', name: 'crew', x: 2000, y: -2000, autoManaged: true }); w.units.push(u);
      const results = [];
      for (const mode of ['go', 'defend', 'indirect', 'patrol', 'stop']) {
        w.issue(u, mode, 3500, -2500); const route = u.path, target = u.target;
        for (let t = 100; t < 200; t++) { w.S.t = t; r.autoStep(); }
        results.push(!u.autoManaged && u.path === route && u.target === target);
      }
      u.state = 'idle'; u.autoManaged = true; u.water = u.res + 1;
      const d = w.DAMS.find(d => d.g);
      w.issue(u, 'fill', d.x, d.y, { src: { kind: 'dam', d } }); const fillRoute = u.path;
      for (let t = 200; t < 300; t++) { w.S.t = t; r.autoStep(); }
      results.push(u.path === fillRoute && u.tgt.kind === 'fill');
      // Completing a refill rejoins today's work, not the old destination.
      u.path = null; u.target = null; u.state = 'filling'; u.fillT = 1; u.fillSrc = { kind: 'dam' };
      u.resume = { mode: 'direct', wx: -10000, wy: 10000, type: 'head' }; u.resumeAuto = 1;
      w.S.t = 400; w.tick();
      results.push(u.autoManaged && !!u.target && u.state === 'moving' && u.lastOrder.wx !== -10000);
      return results;
    }, results => results.forEach((ok, i) => assert.equal(ok, true, 'order preservation case ' + i)));

    await check('crews start working within reach without chasing an exact waypoint', () => {
      const w = window.__sim, r = window.__test;
      w.F.s = 4000; w.F.hwL.fill(300); w.F.hwR.fill(300);
      const target = { type: 'flank', side: 1 }, q = r.linePoint(r.linePlan(1), 26);
      const u = r.mkUnit({ type: 'TK', name: 'crew', x: q[0] + 30, y: q[1] + 30, state: 'moving', tac: 'direct', target, path: [[0, 0], q], tgt: { kind: 'attack' } });
      w.units.push(u); const start = [u.x, u.y]; w.S.t = 100 - u.id; r.autoStep();
      const engaged = u.state === 'attack' && u.path === null;
      w.S.t += 10; r.autoStep();
      return { engaged, stillWorking: u.state === 'attack', start, end: [u.x, u.y] };
    }, result => { assert.ok(result.engaged); assert.ok(result.stillWorking); assert.deepEqual(result.end, result.start); });

    await check('a strike-team order shares an anchored knockdown and follow-up plan', () => {
      const w = window.__sim, r = window.__test;
      w.F.s = 6000; w.F.hwL.fill(400); w.F.hwR.fill(400); const q = r.edgePt(75, 1);
      for (let i = 0; i < 5; i++) {
        const u = r.mkUnit({ type: 'TK', team: 'A', name: 'team member ' + i, x: 2000, y: -2000 });
        w.units.push(u); w.issue(u, 'direct', q[0], q[1]);
      }
      return w.units.map(u => ({ type: u.target.type, i: u.target.i, side: u.target.side, role: u.target.lineRole, anchor: u.anchor, auto: !!u.autoManaged }));
    }, jobs => {
      assert.equal(jobs.length, 5);
      for (const job of jobs) { assert.equal(job.type, 'flank'); assert.equal(job.side, 1); assert.equal(job.auto, false); }
      assert.equal(jobs.filter(j => j.role === 'knockdown').length, 2);
      assert.equal(jobs.filter(j => j.role === 'blackout').length, 2);
      assert.equal(jobs.filter(j => j.role === 'relief').length, 1);
      assert.ok(jobs.every(j => JSON.stringify(j.anchor) === JSON.stringify(jobs[0].anchor)), 'one shared anchor');
    });

    await check('crews patrol after containment instead of wasting water on a stopped head', () => {
      const w = window.__sim, r = window.__test;
      w.F.s = 4000; w.F.hwL.fill(300); w.F.hwR.fill(300); w.F.contained = 900;
      const u = r.mkUnit({ type: 'TK', name: 'crew', x: 2000, y: -2000, state: 'head', tac: 'direct', autoManaged: true, taskAt: 0, target: { type: 'head' } });
      w.units.push(u); w.S.t = 1000 - u.id; r.autoStep();
      return { state: u.state, target: u.target, path: u.path };
    }, result => assert.deepEqual(result, { state: 'patrol', target: null, path: null }));


    await check('knockdown needs connected follow-up before the line is secured', () => {
      const w = window.__sim, r = window.__test;
      w.F.s = 2000; w.F.hwL.fill(300); w.F.hwR.fill(300); w.S.mayday = 0; w.S.heat = 0;
      for (const role of ['knockdown', 'blackout']) w.units.push(r.mkUnit({ type: 'TK', name: role, state: 'attack', tac: 'direct', target: { type: 'flank', side: 1, lineRole: role } }));
      let provisional = false;
      for (let t = 1; t <= 180; t++) {
        w.S.t = t;
        for (const u of w.units) { const task = r.lineTask(u, u.target); u.x = task.goal[0]; u.y = task.goal[1]; }
        r.crewStep(); const p = r.linePlan(1);
        if (p.data.knock[p.anchor] >= 1 && !p.held[p.anchor]) provisional = true;
      }
      const p = r.linePlan(1),held = Array.from(w.F.hL),last = held.lastIndexOf(1);
      return { provisional, advanced: last > p.anchor, connected: held.slice(p.anchor, last + 1).every(Boolean), bounded: p.front - p.secure <= r.TACTICS.maxGap + 1 };
    }, result => Object.entries(result).forEach(([name, ok]) => assert.ok(ok, name)));

    await check('unfinished knockdown recovers while secured line remains held', () => {
      const w = window.__sim, r = window.__test;
      w.F.s = 2000; const p = r.linePlan(1); p.data.knock[26] = 1; p.data.mop[26] = .5; p.data.wet[26] = 1;
      p.data.knock[27] = 1; p.data.wet[27] = 1; p.held[27] = 1;
      for (let t = 2; t < 400; t++) { w.S.t = t; r.decayLines(); }
      return { recovered: p.data.knock[26], unfinished: p.held[26], secure: p.held[27] };
    }, result => { assert.equal(result.recovered, 0); assert.equal(result.unfinished, 0); assert.equal(result.secure, 1); });

    await check('head pressure is continuous and requires an eligible attack', () => {
      const w = window.__sim, r = window.__test;
      w.F.s = 3000; w.F.gust = false; w.F.brk = { x: 2000, y: -2000 };
      for (let t = 1; t <= 60; t++) { w.S.t = t; r.tacticalPressure(3); }
      const partial = w.F.prog;
      for (let t = 61; t <= 310; t++) { w.S.t = t; r.tacticalPressure(3); }
      const checked = w.F.checkedUntil > w.S.t;
      w.F.prog = 4; w.F.brk = null; w.F.checkedUntil = 0; w.F.gust = true;
      for (let t = 311; t <= 500; t++) { w.S.t = t; r.tacticalPressure(10); }
      return { partial, checked, unsuitableProgress: w.F.prog, pressure: w.F.headWork };
    }, result => { assert.ok(result.partial > 0 && result.partial < 8); assert.ok(result.checked); assert.equal(result.unsuitableProgress, 0); assert.equal(result.pressure, 0); });

    await check('a planned refill waits for a replacement and only releases one crew', () => {
      const w = window.__sim, r = window.__test;
      w.F.s = 3000; w.F.hwL.fill(300); w.F.hwR.fill(300);
      const p = r.linePlan(1),q = r.linePoint(p,p.anchor);
      const low = r.mkUnit({ type: 'TK', name: 'low', team: 'A', x: q[0], y: q[1], state: 'attack', tac: 'direct', water: 1200, target: { type: 'flank', side: 1, lineRole: 'knockdown' }, lastOrder: { mode: 'direct', wx: q[0], wy: q[1], type: 'flank' } });
      const fresh = r.mkUnit({ type: 'TK', name: 'fresh', team: 'A', x: q[0] - 100, y: q[1] - 100, state: 'attack', tac: 'direct', target: { type: 'flank', side: 1, lineRole: 'relief' } });
      w.units.push(low, fresh); w.NV.budget = 4;
      const waiting = !r.rotateForWater(low) && low.state === 'attack';
      const g = r.targetGoal(fresh); fresh.x = g[0]; fresh.y = g[1]; fresh.path = null; fresh.state = 'attack';
      const released = r.rotateForWater(low) && low.state === 'moving' && low.tgt.kind === 'fill';
      const other = r.mkUnit({ type: 'TK', name: 'other', team: 'A', x: q[0], y: q[1], state: 'attack', tac: 'direct', water: 1200, target: { type: 'flank', side: 1, lineRole: 'blackout' } }); w.units.push(other);
      const staggered = !r.rotateForWater(other) && other.state === 'attack';
      return { waiting, released, staggered, reservePreserved: low.water >= low.res };
    }, result => Object.entries(result).forEach(([name, ok]) => assert.ok(ok, name)));

    await check('wind fallback acts locally even while communications are down', () => {
      const w = window.__sim, r = window.__test;
      w.F.s = 4000; w.F.hwL.fill(400); w.F.hwR.fill(400);
      const q = r.edgePt(75,1),u = r.mkUnit({ type: 'TK', name: 'crew', x: q[0], y: q[1], state: 'attack', tac: 'direct', target: { type: 'flank', side: 1, i: 75 } });
      w.units.push(u); w.S.t = w.S.wcAt - 100; w.S.comms = false; r.autoStep();
      const end = u.path && u.path[u.path.length - 1];
      return { held: u.safetyHold, working: u.state === 'attack', safeDestination: !end || w.burntAt(end[0],end[1]) };
    }, result => { assert.ok(result.held); assert.equal(result.working, false); assert.ok(result.safeDestination); });

    await check('new tactical orders wait for a refill without interrupting it', () => {
      const w = window.__sim, r = window.__test;
      w.F.s = 3000; w.F.hwL.fill(300); w.F.hwR.fill(300);
      const u = r.mkUnit({ type: 'TK', name: 'refilling crew', state: 'filling', water: 1200, fillT: 90, fillSrc: { kind: 'dam' } }); w.units.push(u);
      w.issue(u, 'direct', 2000, -2000);
      return { state: u.state, fillT: u.fillT, water: u.water, pending: u.resume && u.resume.mode };
    }, result => assert.deepEqual(result, { state: 'filling', fillT: 90, water: 1200, pending: 'direct' }));
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
