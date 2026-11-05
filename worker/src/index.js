// Operation Harvest Wind relay (SCAFFOLD: not yet wired to the sim).
// One Durable Object = one exercise room. The Facilitator's browser runs the sim
// (host-authoritative). This relay only forwards messages:
//   up:   orders and chat from seats        -> facilitator
//   down: filtered snapshots and chat        -> seats
// Roles are posts, not people: facilitator | ic | divcom | sector:<id> | stl:<team> | waiting
export class Room {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const url = new URL(req.url);
    if (url.searchParams.get('pass') !== this.env.EXERCISE_PASS) return new Response('bad passcode', { status: 403 });
    const pair = new WebSocketPair();
    const name = (url.searchParams.get('name') || 'anon').slice(0, 24);
    const wantsHost = url.searchParams.get('host') === '1';
    if (wantsHost && this.host()) return new Response('facilitator already connected', { status: 409 });
    this.state.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ name, post: wantsHost ? 'facilitator' : 'waiting' });
    this.broadcastRoster();
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  host() { return this.state.getWebSockets().find(w => w.deserializeAttachment()?.post === 'facilitator'); }
  broadcastRoster() {
    const roster = this.state.getWebSockets().map(w => w.deserializeAttachment());
    const msg = JSON.stringify({ t: 'roster', roster });
    this.state.getWebSockets().forEach(w => { try { w.send(msg); } catch {} });
  }
  async webSocketMessage(ws, raw) {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const me = ws.deserializeAttachment();
    if (me.post === 'facilitator') {
      if (m.t === 'assign') { // {t:'assign', name, post}
        for (const w of this.state.getWebSockets()) {
          const a = w.deserializeAttachment();
          if (a.name === m.name && a.post !== 'facilitator') { w.serializeAttachment({ ...a, post: m.post }); }
        }
        this.broadcastRoster();
      } else if (m.t === 'snap') { // {t:'snap', to: post, data}
        for (const w of this.state.getWebSockets()) if (w.deserializeAttachment().post === m.to) w.send(raw);
      } else if (m.t === 'chat') {
        for (const w of this.state.getWebSockets()) if (m.to === '*' || w.deserializeAttachment().post === m.to) w.send(raw);
      }
    } else {
      const h = this.host();
      if (h && (m.t === 'order' || m.t === 'chat')) h.send(JSON.stringify({ ...m, from: me }));
    }
  }
  async webSocketClose() { this.broadcastRoster(); }
}
export default {
  async fetch(req, env) {
    const id = env.ROOM.idFromName('exercise'); // one instance at a time
    return env.ROOM.get(id).fetch(req);
  },
};
