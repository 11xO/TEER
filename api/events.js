import { WebSocketServer, WebSocket } from 'ws';

export function attachApiEvents(server, auth, { intervalMs = 15000 } = {}) {
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 2048 });
  server.on('upgrade', (request, socket, head) => {
    let path;
    try { path = new URL(request.url, 'http://localhost').pathname; }
    catch { socket.destroy(); return; }
    if (path !== '/api/events') { socket.destroy(); return; }
    const session = auth.getSession(request);
    if (request.headers.origin !== auth.origin || !session) { socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n'); return; }
    const samePhone = [...sockets.clients].filter((client) => client.phone === session.phone);
    if (samePhone.length >= 5) { socket.end('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n'); return; }
    sockets.handleUpgrade(request, socket, head, (client) => {
      client.phone = session.phone;
      client.authRequest = request;
      client.alive = true;
      sockets.emit('connection', client);
    });
  });
  sockets.on('connection', (client) => {
    client.on('error', () => {});
    client.on('pong', () => { client.alive = true; });
    client.on('message', (message) => { if (message.toString() === '{"type":"pong"}') client.alive = true; });
    client.send(JSON.stringify({ type: 'session.updated' }));
  });
  const timer = setInterval(() => {
    for (const client of sockets.clients) {
      if (!client.alive) { client.terminate(); continue; }
      const session = auth.getSession(client.authRequest);
      if (!session) {
        if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'session.revoked' }));
        client.close(1008, 'Session expired'); continue;
      }
      client.alive = false;
      if (client.readyState === WebSocket.OPEN) { client.ping(); client.send(JSON.stringify({ type: 'heartbeat' })); }
    }
  }, intervalMs);
  timer.unref();
  let closed = false;
  const close = () => { if (closed) return; closed = true; clearInterval(timer); for (const client of sockets.clients) client.terminate(); sockets.close(); };
  server.once('close', close);
  return { close };
}
