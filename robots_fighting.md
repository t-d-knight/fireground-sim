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
| Head and spots (`uncontrolled`, `realHead`, `spawnSpot`, `leadLobe`) | Claude session 01QvxJp… for TK | 2026-11-05 | Head redefinition, see log |
| Mains (`TOWNS`, `GEN`, `MAINS_STEP`) | Claude session 01QvxJp… for TK | 2026-11-05 | |
| Multiplayer relay (`worker/`) | unclaimed | | Scaffold only |
| Crew AI and the bot (`tests/bot.js`, `autoStep`, `crewStep`) | unclaimed | | |

Add yourself, a date, and what you are touching. Remove your row when you are done.

## State of `main` when this file was written
- Remote `main` and local were identical at `51ce6cf` when I fetched. No other branches. No other contributors had pushed yet.

## Log (newest first, add yours at the top)
### 2026-11-05, Claude session for TK: head and spot rules
- **Changed:** head is now the furthest uncontrolled point forward along the wind direction (`AXIS` before the change, `LEFT` after). Controlling the front moves it back. Spots can only start from uncontrolled sections: unheld edge bins, the main head tip unless checked or contained, and spots or fingers over 300 m long. Weights: head tip 25, edge point 1, falling to nothing 1 km behind the front.
- **Side effect:** `spawnSpot` draws random numbers in a different order, so every seed now produces a different fire than before this commit. Old and new runs are not comparable seed for seed.
- **Verified:** `tests/head.js` passes (head moves back about 840 m when the front 800 m is held and the head is checked). Smoke test passes.
- **Not resolved:** bot area burnt at 6000 s went up on three of four seeds (1234: 917 to 1527 ha; 7: 796 to 1249; 21: 947 to 1200; 99: 988 to 951). Head-chasing crews moved more and attacked less (about 20 to 29 moving, 0 to 7 attacking). It may be the changed random streams, or the head target now jumping between lobes. I have not separated the two. If you can, compare many seeds before and after, not one.
- **Also changed in the previous push:** hydrant data removed from the repo and replaced by assumed mains.
