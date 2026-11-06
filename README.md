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
npx playwright install chromium # once, after npm install
npm test
node tests/bot.js 1234 7200
```
`window.__sim` exposes the engine for tests (`tick`, `reset`, `issue`, `S`, `F`, `units`).

## Playing the exercise
Resources contains the live roster, strike-team selection, search and attention filters. Select an appliance on the map or in the roster, choose a command, then click its destination or fire section. Choosing a command gives the next click priority over truck icons; afterwards, clicking another truck switches selection. Locate centres the map on the selection. Shift-click or Cmd/Ctrl-click adds or removes a resource; Shift-drag selects an area; double-click selects a strike team. Escape cancels targeting, and right-click clears selection while preserving delivered orders.

Requests contains escalation, aircraft, water, support and staging controls. Support ground attack is the default aircraft priority: after the wind change, drops follow assigned NE ground sectors. Crews clear the release area, return to their preserved task and continue along connected completed line. Explicit Fire head and Closest fire to town priorities remain available. Defend line uses map points followed by Deploy. Withdraw selected to staging affects the current selection; incident-wide withdrawal is a separate control in Requests. The live incident log stays visible beneath the map, with full history in Log. Exercise contains facilitator controls, and Help & assumptions describes controls and model limits.

Untasked tankers divide nearby reported spots and anchored flank work; eligible local pairs can also form a bounded head mission. A Direct or Parallel flank order shares an anchor and knockdown, blacking-out and relief roles. A head click retains that fire body and coordinates its two shoulders. Amber line is provisional knockdown; green line is secured follow-up connected to the anchor. Move orders show a named destination ping, and selected attack tasks highlight their assigned edge.

Crews preserve their task through refills, retry failed sources and use fire-aware routes. Read the task status for blocked routes, reserves, weather holds and support requirements. The exposed NE front after the wind change needs a local aircraft-supported window for ground follow-up; an unsupported head order may hold rather than engage. Defend remains asset protection, with no edge-work credit. The exercise still needs commander tasking. Training weather is now the milder default; Severe preserves the original conditions, and Custom allows individual edits in Exercise. A normal-controls Training run with ten tankers and aircraft contained at T+68:30 with Marong clear and no crews out. Severe conditions remain a substantially harder exercise; the recorded runs do not establish reliable containment in every seed.

Tactical numerical settings are tagged as simulation assumptions in the sim; brigade-procedure placeholders remain unchanged. The latest measured performance, long-run outcomes and outstanding tactical limitations are recorded in `robots_fighting.md` and `ROADMAP.md`.

## Multiplayer
Planned: Facilitator, DIVCOM, sector commanders and STLs, with chat down the command tree. See `docs/ARCHITECTURE-multiplayer.md`.

## Rules for changing the sim
`docs/DESIGN-RULES.md`. The main one: every number is sourced or tagged as an assumption in the Assumptions tab.
