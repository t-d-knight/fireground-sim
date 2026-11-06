# Changelog

## 0.69
- Performance: A* pathfinding with a reusable heap and a route cache (tick time about halved, long stalls cut from 400-670 ms to about 130 ms). Cached CSS lookups used in the draw loop, HUD text updates throttled, render capped at 30 fps and paused when the tab is hidden.
- `tests/perf.js`: tick and draw timing in windows over a long run, with an optional CPU profile (`node tests/perf.js <seed> <seconds> cpu`).
- Simulation results unchanged (same fire trajectory on seed 1234).

## 0.68
- Fix vertically mirrored off-road navigation, inflated spot-head crew counts, nonlocal wind-change line protection, and Eaglehawk mains persisting across resets.
- Add named move-destination pings, selected attack-edge highlights, anchor markers, tactical role labels and right-click deselection.
- Coordinate anchored knockdown, follow-up blacking out and relief. Provisional amber line can recover; followed-up green line is secured. Secured flanks can pinch the head.
- Replace minute head-attack dice with sustained eligible crew pressure. Frontal attack depends on a suitable road/check/drop window; unsuitable orders become anchored flank work.
- Preserve coverage during planned refill handovers, queue tactical orders through refills, respect crew-protection reserve, and fall back from the exposed NE edge near the wind change.
- Keep stable spot roles, retire merged targets, rejoin current work after refilling and patrol completed line. Retain the shared uncontrolled-head definition introduced in 0.67.
- Treat aircraft flank drops as provisional knockdown requiring ground follow-up.
- Interpolate truck animation and cache static terrain to reduce redraw work.
- Expand regression coverage and print exact final metrics from scripted bot runs. Record numerical tactics as simulation assumptions with concept references.

## 0.67
- Version badge (version, commit, UTC build time) in orange at the top left of the map.
- Cloudflare deploy config (`wrangler.jsonc`) and `docs/DEPLOY-cloudflare.md` for the solo site.
- Single head definition for crews and aircraft with 300 m hysteresis (regression under investigation, see `robots_fighting.md`).

## 0.66b
- Head is now the furthest uncontrolled point forward along the wind direction, before and after the wind change. Controlling it moves the head back. Spots can only start from uncontrolled sections.
- Hydrant data replaced by assumed mains along built-up roads (60 m spacing, `TOWNS` config). Real hydrants are optional and git-ignored.

## 0.66
- Township status (clear, threatened, impacted) and a facilitator scorecard with a Copy scorecard button.
- First unit on scene cue; aircraft and Make Tankers call times tracked.
- Make Tankers 30, 50 and Uncle take extra time to arrange (+5, +10, +20 min, assumed).
- Untasked tankers go straight to the head at x0.8 effectiveness.
- Defence line slots snap to hydrants; defenders at reserve join a free hydrant on the line.
- Auto-refill takes the quickest source, hydrants included. Big Fill click sets up at the nearest water source.

## 0.60 to 0.65
- Lead head, pinch and containment logic, off-road movement (roads first), defence-line drawing, merged spots and lateral spread, burnt-ground effect, Big Fill auto assignment.
