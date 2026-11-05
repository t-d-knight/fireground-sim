# Deploying the solo sim to Cloudflare

Target: `solo-hw.marongcfa.org.au`. The sim is one static file, so this is a Worker that only serves `dist/`.

## Prerequisites
- `marongcfa.org.au` is a zone in your Cloudflare account (a custom domain route needs it).
- Node 18+ and Python 3 available where you build.

## Option A: build from GitHub in Cloudflare (recommended)
Workers & Pages, Create, Import a repository, pick `t-d-knight/fireground-sim`, branch `main`.
- Build command: `python3 tools/build.py`
- Deploy command: `npx wrangler deploy`
- Root directory: leave empty (the repo root holds `wrangler.jsonc`).

Every push to `main` then redeploys. The build stamps the version, commit and time into the orange badge at the top left of the map, so testers can say which build they ran.

## Option B: deploy by hand
```
git pull origin main
python3 tools/build.py
npx wrangler login        # first time only
npx wrangler deploy
```

## Notes
- Hydrants: real positions are not in the repo (`NOTICE.md`), so the deployed build uses the assumed mains.
- `dist/_headers` sets `Cache-Control: no-cache` so testers always get the latest build while we are iterating.
- Version badge: `v<package.json version> <commit> <UTC time>`. Bump `package.json` `version` for a milestone. The artifact versions (v60 to v66) were a separate numbering and are not used here.
- The group (multiplayer) site will be a second Worker with a Durable Object (`worker/`), on its own subdomain.
