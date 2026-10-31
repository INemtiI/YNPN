export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return new Response("YNPN rooms: ok");
    const match = /^\/room\/([A-HJ-NP-Z2-9]{12})$/.exec(url.pathname);
    if (!match) return new Response("Not found", { status: 404 });
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return new Response("WebSocket required", { status: 426 });
    if (request.headers.get("Origin") !== "https://inemtii.github.io")
      return new Response("Origin not allowed", { status: 403 });
    return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
  }
};
export class RoomServer {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(request) {
    const clients = this.ctx.getWebSockets();
    const create = new URL(request.url).searchParams.get("create") === "1";
    if (!clients.length && !create) return new Response("Room not found", {status: 404});
    if (clients.length && create) return new Response("Room already exists", {status: 409});
    if (clients.length >= 8) return new Response("Room is full", {status: 429});
    const [client, socket] = Object.values(new WebSocketPair());
    const scene = clients.length ? (await this.ctx.storage.get("scene") || null) : null;
    if (!clients.length) await this.ctx.storage.delete("scene");
    this.ctx.acceptWebSocket(socket);
    socket.send(JSON.stringify({kind:"welcome", count:clients.length, scene}));
    this.broadcast({kind:"peers", count:clients.length + 1});
    return new Response(null, {status:101, webSocket:client});
  }
  broadcast(data, except) {
    const text = JSON.stringify(data);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== except) try { ws.send(text); } catch (_) {}
    }
  }
  async webSocketMessage(ws, message) {
    if (typeof message !== "string" || message.length > 65536) return;
    let msg;
    try { msg = JSON.parse(message); } catch (_) { return; }
    if (msg?.type !== "scene" || msg.v !== 3 || !msg.spec ||
        !Array.isArray(msg.points) || msg.points.length > 500 ||
        !Array.isArray(msg.secIds)) return;
    await this.ctx.storage.put("scene", msg);
    this.broadcast({kind:"scene", scene:msg}, ws);
  }
  async webSocketClose(ws) {
    try { ws.close(); } catch (_) {}
    const count = Math.max(0, this.ctx.getWebSockets().filter(s => s !== ws).length);
    if (!count) await this.ctx.storage.delete("scene");
    this.broadcast({kind:"peers", count}, ws);
  }
  async webSocketError(ws) { try { ws.close(); } catch (_) {} }
}
