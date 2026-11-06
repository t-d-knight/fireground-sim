// Smoke and determinism checks. Run after `npm run build`.
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'dist', 'index.html');
const fail = (m) => { console.error('FAIL', m); process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000);
  const run = (seed) => p.evaluate((seed) => { const w = window.__sim; w.S.seed = seed; w.reset(); w.S.running = true;
    for (let t = 0; t < 1800; t++) w.tick();
    return { s: Math.round(w.F.s), units: w.units.length, firstOn: w.S.firstOn }; }, seed);
  const a = await run(1234), c = await run(1234), d = await run(7);
  if (errs.length) fail('page errors: ' + errs.join(' | '));
  if (!(a.s > 1000)) fail('fire did not spread: ' + JSON.stringify(a));
  if (a.s !== c.s) fail('not deterministic for a fixed seed: ' + a.s + ' vs ' + c.s);
  if (a.s === d.s) fail('different seeds gave identical fires');
  await p.waitForTimeout(600);
  const tn = await p.evaluate(() => document.getElementById('wxTn').textContent);
  if (!/clear|threatened|IMPACTED/.test(tn)) fail('township readout missing: ' + tn);
  console.log(process.exitCode ? 'FAILED' : 'OK', JSON.stringify({ a, d, tn }));
  await b.close();
})();
