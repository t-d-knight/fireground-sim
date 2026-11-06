# Operation Harvest Wind

A single-screen interactive simulation for a whole-brigade grassfire tabletop exercise (Calder Hwy / Delaney Rd corridor north-west of Marong, Victoria). Built for Marong CFA training. It runs in a browser from one HTML file.

Training simulation only. See `NOTICE.md`.

## Run it
```
npm install
npm run build        # writes dist/index.html
open dist/index.html # or serve dist/ with any static server
```
No server is needed for single-player. Mains are assumed along built-up roads, so no hydrant data is needed. An optional git-ignored `data/hydrants.local.json` can supply real hydrants (see `NOTICE.md`).

## Layout
| Path | What |
|---|---|
| `src/index.template.html` | The whole sim (UI, fire model, crews, assumptions). `/*MAPDATA*/` is replaced at build time. |
| `data/map.json` | Projected map data (roads, water, creeks, wood, residential, power, farm). |
| `tools/build.py` | Builds `dist/index.html`. |
| `tools/buildmap.py` | Regenerates `data/map.json` from an OSM GeoJSON export (`python3 tools/buildmap.py export.geojson`). Needs the original `map_old.json` alongside it. |
| `tests/smoke.js` | Loads the page, runs 30 min, checks determinism for a fixed seed. |
| `tests/bot.js` | Scripted player. `node tests/bot.js <seed> <seconds>` prints a run table and the township state. |
| `worker/` | Cloudflare Worker relay for multiplayer (scaffold, not wired up). |
| `docs/` | Design rules and the multiplayer plan. |

## Test
```
npm test
node tests/bot.js 1234 7200
```
`window.__sim` exposes the engine for tests (`tick`, `reset`, `issue`, `S`, `F`, `units`).

Untasked tankers divide reported-spot work and anchored flank attacks. A Direct or Parallel order near a flank assigns a shared rear anchor and knockdown, blacking-out and relief roles. Amber line is provisionally knocked down; green line is secured by follow-up. Crews work from the burnt side, rotate through refills with a handover where a replacement is available, and fall back from the exposed NE flank near the wind change. Tactical orders given during a refill wait until it completes. Head checks build from sustained eligible crews and can also result from pinching both secured flanks.

Select a crew to see its attack-edge highlight and anchor. Move orders show a brief named destination ping. Right-click the map to clear selection while preserving existing orders. Move, Defend, Indirect, Patrol and Withdraw remain explicit participant orders. Tactical numerical settings are tagged as simulation assumptions in the sim; the brigade-procedure placeholders remain unchanged.

## Multiplayer
Planned: Facilitator, DIVCOM, sector commanders and STLs, with chat down the command tree. See `docs/ARCHITECTURE-multiplayer.md`.

## Rules for changing the sim
`docs/DESIGN-RULES.md`. The main one: every number is sourced or tagged as an assumption in the Assumptions tab.
