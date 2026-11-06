// The head is the furthest uncontrolled point forward along the wind, and moves back as it is controlled.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'dist', 'index.html')); await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const w = window.__sim; w.S.seed = 7; w.reset(); w.S.running = true; for (let t = 0; t < 1800; t++) w.tick();
    const F = w.F, A = [.7071, -.7071], fw = h => Math.round(h[0] * A[0] + h[1] * A[1]);
    const live = F.lobes.filter(l => !l.held).length, before = fw(w.realHead());
    const top = Math.floor(F.s / 40) + 25; F.checkedUntil = w.S.t + 900; for (let i = top - 20; i <= top; i++) { F.hL[i] = 1; F.hR[i] = 1 } w.tick();
    return { Fs: Math.round(F.s), live, before, after: fw(w.realHead()) } });
  let ok = true; const fail = m => { console.error('FAIL', m); ok = false; process.exitCode = 1 };
  if (errs.length) fail(errs.join('|'));
  if (r.live === 0 && Math.abs(r.before - r.Fs) > 50) fail('with no live spots the head should be the fire front: ' + JSON.stringify(r));
  if (!(r.after < r.before - 300)) fail('head did not move back when the front was controlled: ' + JSON.stringify(r));
  if (ok) console.log('OK', JSON.stringify(r)); await b.close();
})();
