# Roadmap

Single place for "what are we building and what's next". Detail lives in the linked docs; this file stays short. Update it when plans change.

## What this is
A browser-based tabletop simulator for CFA grassfire incident management training. A facilitator runs a scenario; crews practise sizing up, tasking, escalating (Make Tankers, aircraft, Big Fill), sectorising and protecting the township.

- **Scenario 1: Operation Harvest Wind.** Whole-brigade grassfire, Calder Hwy / Delaney Rd corridor NW of Marong. The Severe profile retains the original worst-case day (about 95th percentile November weather, peak harvest); the default Training profile provides milder assumed weather. Win condition: **not in the township**; if the fire makes a run, replenish and reassign for a second attack.
- **Long term:** run the same engine anywhere in Victoria given the right data.

Design rules: `docs/DESIGN-RULES.md`. Every number is sourced or listed as an assumption in the in-sim Assumptions tab.

## Where we are (v0.70)
- Single-file sim (canvas 2D) built from `src/index.template.html` + `data/map.json` by `tools/build.py`.
- Fire engine with a single shared head definition, spots only from uncontrolled sections, wind change.
- Crew orders (direct, parallel, indirect, defend, patrol, fill, boost, rehab), Make Tankers delays, Big Fill, aircraft, assumed mains water in built-up areas.
- Facilitator scorecard and township status.
- Scripted bots and regression tests (`tests/`). Cloudflare solo deploy config.
- Tanker-tactics model merged from a second contributor (PR #1). Bot results are mixed, see `robots_fighting.md`.

## Solo stabilisation release (2026-11-07)
- Play-loop profiling and long player workflows now cover both early response and post-change play. Goal-directed road searches reject fire-isolated approaches; terrain searches reject unreachable windows before expensive priority-queue work. Playback and group command delivery yield between frames, with cached map/fire painting.
- Crew missions retain selected fire ownership, use bounded pressure/follow-up/reserve roles, preserve partial work and committed routes, and retry accessible alternatives. Refill journeys recover from moved/depleted supplies with finite-stock bookings; order inheritance and radio delivery preserve mission intent.
- Resources/Requests/Log menus provide a persistent incident feed, selected-task and usable-water status, filters/search and Locate. Explicit order targeting takes priority over truck icons for its next click; ordinary truck selection remains available afterwards.
- Post-change aircraft/ground follow-up now acts on the actual local NE front and is covered by integrated tests. Shared global head definitions, assumed mains and licensed-layer exclusions remain intact.
- Integrated validation passes; James has authorised publication to main. Wider tactical sign-off and participant testing remain on the roadmap. Exact cases, performance evidence and seeded outcomes are recorded in `robots_fighting.md`; no claim of guaranteed containment.

## Next: stabilise the solo sim
1. Broaden the demonstrated containment strategies across seeds and commanders. Normal-controls runs now contain with ten tankers/aircraft in Training weather and thirty/aircraft in original Severe weather. Joint air/ground tasking, release clearance and connected-sector continuation are implemented; the original-Severe scripted runs remain difficult and do not establish reliable automatic containment. Review wider tactical balance with TK/James before deployment.
2. Tester feedback backlog (`robots_fighting.md`, items 1-9): defend flow and Deploy selection, drag-and-drop for strike teams, load spreading at shared dams (20+ appliances stuck at one dam), finger with no spread for about 4 min, post wind-change spike and head pivot, weather basis in the Assumptions tab.
3. Confirm CI passes on GitHub; pick a licence.
4. Deploy solo site to `solo-hw.marongcfa.org.au` and test end to end with real users.

## Next: group play (multiplayer)
Design in `docs/ARCHITECTURE-multiplayer.md`. Facilitator browser is authoritative; a Cloudflare Worker + Durable Object relays state (`worker/`, scaffold only, not wired in).
1. Wire the relay to the sim: rooms, roster, snapshots, orders, chat.
2. Posts, not people: IC, DIVCOM, Sector Commander, STL, waiting room. Handover with briefing; an outgoing IC can step down to STL.
3. DIVCOM sectorisation (rough default: NE/head, S and W/rear, town defence), establish delay (10 min assumed), dormant creek-north sector.
4. Strike teams going live as Make Tankers are called, with initial intel. Big Fill tasking limited to IC, DIVCOM and sector commanders.
5. Sector-aware fallback STL bot so empty seats still work.
6. Per-seat fog of war (last).
7. Second Worker for the group site. Target 6-10 players.

## Next: beyond Marong
1. Split the repo into engine, region and scenario (map, water, stations, weather, ignition and timeline as data).
2. Data layers, each with source and licence recorded: fuel/vegetation, terrain/slope, roads, water and dams, stations and brigades.
3. Hydrants stay local-only and git-ignored (licensing). Mains are assumed from road and built-up logic and can extend to other towns.
4. Region and scenario authoring tools; OSM ODbL attribution per `NOTICE.md`.

## Open items needing TK
- CFA mayday response procedure and red-flag wording (`[TK to insert]`).
- Which posts and handover rules to adopt for real exercises.
- Licence choice.
- Sign-off on tanker-tactics model once reviewed.

## Process
Before pushing: fetch, check other contributors' changes, resolve conflicts, and log in `robots_fighting.md`.
