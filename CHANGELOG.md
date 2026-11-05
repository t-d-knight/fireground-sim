# Changelog

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
