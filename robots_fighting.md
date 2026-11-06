# robots_fighting.md

Coordination file for everyone (people and AI agents) changing this repo. If you are about to push, read this first. If you disagree with a change someone else made, write it here instead of silently reverting it.

## Rules before you push
1. `git fetch origin main` and compare with your `HEAD`. If `main` has moved, rebase or merge and rerun `npm run build && npm test` before pushing.
2. Do not force-push `main`.
3. One concern per commit, and say in the message which of the files below it touches.
4. Do not commit `data/hydrants.local.json` or any other licensed or third-party layer. It is git-ignored on purpose (see `NOTICE.md`).
5. Every number you add goes in the Assumptions tab (`ASSUME` in `src/index.template.html`) as sourced (`S`) or assumed (`A`). See `docs/DESIGN-RULES.md`.
6. If your change moves fire behaviour, run `node tests/bot.js <seed> 6300` on at least seeds 1234, 7, 21 and 99 before and after, and paste the numbers in the log below.

## Where conflicts are likely
`src/index.template.html` is one 200 KB file holding the UI, fire model, crews and assumptions. Two people editing it at once will conflict. Until it is split into modules (planned, see `docs/ARCHITECTURE-multiplayer.md`), claim the area you are editing in the table below.

| Area (function names to grep) | Claimed by | Since | Notes |
|---|---|---|---|
| Head and spots (`uncontrolled`, `realHead`, `headGoal`, `spawnSpot`, `leadLobe`, `airTarget`) | Claude session 01QvxJp… for TK | 2026-11-05 | Regression under investigation, see log |
| Mains (`TOWNS`, `GEN`, `MAINS_STEP`) | Claude session 01QvxJp… for TK | 2026-11-05 | |
| Multiplayer relay (`worker/`) | unclaimed | | Scaffold only |
| Crew AI and the bot (`tests/bot.js`, `autoStep`, `crewStep`) | unclaimed | | Codex review changes and test outcomes recorded below; existing Head claim retained. |

Add yourself, a date, and what you are touching. Remove your row when you are done.

## State of `main` when this file was written
- Remote `main` and local were identical at `51ce6cf` when I fetched. No other branches. No other contributors had pushed yet.

## Log (newest first, add yours at the top)
### 2026-11-05, Codex for James: tanker tactics integration for review
- Fetched and integrated remote `df16ad7`, preserving TK/Claude's uncontrolled-head definition, hysteresis, spot-source selection, aircraft targeting basis, build badge and Cloudflare setup. Resolved the overlapping `headGoal` change in favour of the shared head definition.
- Crew assignments now refer to their actual owned flank/spot rather than making every truck chase the globally furthest spot. A head click or aircraft drop whose current head belongs to a lobe is routed to that lobe. This addresses the documented chasing concern without reverting the head definition.
- Added anchored knockdown/follow-up/relief roles, provisional versus secured line, continuous eligible head pressure, guarded refill handovers, wind fallback, map feedback, right-click deselection, navigation/reset fixes and regression checks. New model values are tagged as assumptions, not brigade procedures.
- Exact bot runs: `node tests/bot.js <seed> 6300`, baseline exported from `df16ad7`, combined v0.68.0. The baseline runner only adds the same FINAL metrics and uses an installed Chromium binary; simulation/bot decisions are unchanged. These seeded runs are not statistically controlled comparisons: changed crew decisions and suppression alter random-number consumption.

| Seed | Baseline ha | Combined ha | Baseline held | Combined held | Baseline attacking | Combined attacking | Township impacted before / after |
|---|---:|---:|---:|---:|---:|---:|---|
| 1234 | 1645 | 1497 | 3% | 14% | 0 | 1 | no / no |
| 7 | 1172 | 2562 | 4% | 10% | 2 | 3 | no / yes |
| 21 | 1221 | 1639 | 1% | 9% | 1 | 6 | no / no |
| 99 | 748 | 2603 | 7% | 10% | 3 | 2 | no / yes |

- **Outcome limitation:** line held improves in these runs, but burnt area increases in three of four and township impact increases in two. This is a tactical-model review build, not a claim of improved fire-outcome balance. The legacy bot still repeatedly directs head attacks; numerical tactical calibration and a commander policy matched to the new model need review. Keep this on the review branch until TK/James is satisfied with behavior.
- Validation: build, smoke/determinism, upstream head regression, tactical/correctness regressions, three two-hour local exercises, and native right-click checks in both themes. No licensed layers included. Brigade-procedure placeholders remain unchanged.


### 2026-11-05 (later), Claude session for TK: tester feedback triage
No other pushes had landed on `main` or any other branch when I fetched (remote `ee7b670`, identical to local). The feedback below came from testers in chat, not from commits. Status column is honest: "local" means a change exists in one working tree only and is **not pushed**.

| # | Feedback | Status |
|---|---|---|
| 1 | Cannot switch a crew from head attack to defensive, and defence lines are not accepted. The order matters: click Defend, draw points, then pick crews, then Deploy. | Open. Idea: let Deploy use whatever is selected at the time, and add drag-and-drop placement for strike teams (inadvertent clicks also wreck positions). |
| 2 | Strike teams bunch on the highway and stop; others pass them. Untasked crews default to head attack and then "faff around". | Cause found: the head was defined in three places. `realHead` (new rule) was used for arrival checks, but `headGoal` (crew destination) and the aircraft target still used the old `leadLobe`/`headPoint`. Crews drove to the old head, never got within 250 m of the new one, and rerouted forever. Local fix: one definition via `uncontrolled()`, plus 300 m hysteresis so the head does not flip. |
| 3 | Aircraft work south-west while the head is north-east after the wind change. | Same cause (`airTarget` 'head', `airRear`, `airWater` used `headPoint`). Local fix as above. |
| 4 | 20+ appliances left the fire and sit at a farmer's dam, nowhere near the fire. | Not reproduced. Suspect: auto-refill now picks the single quickest source (v61, hydrants and dams equal), with no load spreading, so everyone chooses the same dam. Idea: add a time penalty per truck already heading to a source. |
| 5 | A finger has no spread for about 4 min while the rest of the fire pushes the same way. | Not reproduced. |
| 6 | Fire shape after the wind change is a narrow spike that just sits there. | Open. |
| 7 | Ambulance at the staging area, then a heat-stress crew goes there 3 min later. | Probably as designed. Confirm. |
| 8 | The head does not pivot as much as TK wants after the change. | Open, linked to 2. |
| 9 | Scenario basis: worst recorded Marong-area weather in November at peak harvest, about the 95th percentile. A tester asked about 100 km/h winds around harvest. | Open. The weather basis should be written into the Assumptions tab with sources. |

**Update:** the head fix (single head definition, 300 m hysteresis) was merged to `main` at TK's instruction after confirming remote `main` had no other changes. It is still unproven: bot runs show no crews attacking. The `wip/head-consistency` branch points at the same commit and can be deleted.

**Bot check on the head fix:** still bad. Seed 1234 at 6000 s: 1505 ha, 0 crews attacking (25 moving). Seed 7: 1095 ha, 0 attacking. Old head rule, same seeds: 917 and 796 ha with 3 to 7 attacking. So the local fix removes an inconsistency but does not restore engagement. I do not yet know why crews never settle into attack; a far spot (up to 10 km ahead in woodland) becoming "the head" and pulling every crew is the leading suspect. **Do not assume the head redefinition pushed in `ee7b670` is good.** If you have a better approach, claim the Head row above and say so here.
### 2026-11-05, Claude session for TK: head and spot rules
- **Changed:** head is now the furthest uncontrolled point forward along the wind direction (`AXIS` before the change, `LEFT` after). Controlling the front moves it back. Spots can only start from uncontrolled sections: unheld edge bins, the main head tip unless checked or contained, and spots or fingers over 300 m long. Weights: head tip 25, edge point 1, falling to nothing 1 km behind the front.
- **Side effect:** `spawnSpot` draws random numbers in a different order, so every seed now produces a different fire than before this commit. Old and new runs are not comparable seed for seed.
- **Verified:** `tests/head.js` passes (head moves back about 840 m when the front 800 m is held and the head is checked). Smoke test passes.
- **Not resolved:** bot area burnt at 6000 s went up on three of four seeds (1234: 917 to 1527 ha; 7: 796 to 1249; 21: 947 to 1200; 99: 988 to 951). Head-chasing crews moved more and attacked less (about 20 to 29 moving, 0 to 7 attacking). It may be the changed random streams, or the head target now jumping between lobes. I have not separated the two. If you can, compare many seeds before and after, not one.
- **Also changed in the previous push:** hydrant data removed from the repo and replaced by assumed mains.

## Log: ROADMAP.md added
- Fetched origin/main (3b23c62) before pushing; no upstream changes since PR #1. Added `ROADMAP.md` (docs only, no code touched). Please keep it updated rather than starting a parallel plan file.

## Log: performance pass (0.69)
- Profiled seed 1234, 9000 s: `route()` (full Dijkstra) was ~half of tick time with 400-670 ms spikes late in the run; draw was 10-17 ms/frame and growing, with uncached `getComputedStyle` calls and per-frame DOM updates. Fixed in `src/index.template.html` (route/css/render/loop only; no tactics or fire logic touched). Fire trajectory identical before and after. Remaining: draw cost (terrain blit + per-label save/restore) and a ~130 ms occasional tick spike. Check `tests/perf.js` before and after any tactics change.
