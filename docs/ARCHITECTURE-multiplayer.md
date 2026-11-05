# Multiplayer architecture (planned, in progress)

Status: the single-player sim is complete enough to play. The relay in `worker/` is a scaffold and is not wired to the sim yet.

## Shape
- **Host-authoritative.** The Facilitator's browser runs the unchanged sim. Everyone else is a thin client.
- **Relay.** A Cloudflare Worker with one Durable Object (one exercise at a time, one shared passcode) forwards messages: orders and chat up to the Facilitator, per-seat filtered snapshots and chat down.
- **Why not a server-side sim.** The fire and crew code is about 1,100 lines of browser code. Running it in the Facilitator's browser avoids rewriting it. The cost is that the Facilitator tab must stay in front and awake (a throttled tab pauses the fire). A warning banner is planned.
- **The artifact cannot do this.** Published claude.ai artifacts block WebSocket connections, so the multiplayer build ships from here, deployed with `wrangler deploy`.

## Posts, not people
A post is IC, DIVCOM, Sector Commander (per sector) or STL (per strike team). A workstation fills a post. Moving a post to another workstation is a handover, with an auto-generated briefing (current orders, open requests, recent log and chat). The outgoing person usually drops one level, for example IC to STL.

- Facilitator can fill any post. IC can appoint DIVCOM and sector commanders. Each commander appoints the level below.
- When Make Tankers creates a strike team it opens an STL post. If nobody is waiting, the team is run by its superior as a block using the sim's auto-behaviour (the bot logic in `tests/bot.js` is the starting point for this).
- Big Fill and water-point tasking: IC, DIVCOM and sector commanders only.

## Sectors
Default split, drawn by the DIVCOM on the map: NE/head, south and west/rear, town (defence). A creek north-bank sector stays dormant until the fire reaches that side, because trucks cannot cross the creek except at bridges. A sector takes time to stand up: until its commander is appointed and on scene (placeholder 10 min, an assumption), its STLs report straight to the DIVCOM.

## Build order
1. Relay and a read-only STL view (test locally with `wrangler dev`, then deploy).
2. STL orders back to the Facilitator's sim.
3. Chat and sector orders.
4. DIVCOM sectorising and the establish delay.
5. Fog of war per seat.

## Hosting
Preferred: Cloudflare Worker (always on, no tunnel, HTTPS link for remote STLs). Alternative: run the same Worker locally with `wrangler dev` and publish through a Cloudflare Tunnel.
