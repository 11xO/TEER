import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import test from 'node:test';

async function startServer(t, { portOnly = false } = {}) {
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise((done) => probe.close(done));
  const env = { ...process.env, PORT: String(port), NODE_ENV: 'test', APP_ORIGIN: 'http://localhost:5173', API_STORE_PATH: ':memory:' };
  if (portOnly) delete env.API_PORT; else env.API_PORT = String(port);
  const child = spawn(process.execPath, ['api/server.js'], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; } });
  let output = '';
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`API did not listen on ${port}: ${output}`)), 3000);
    child.stdout.on('data', (chunk) => { output += chunk; if (output.includes(`API listening on port ${port}.`)) { clearTimeout(timer); resolve(); } });
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`API exited before readiness: ${code}`)); });
  });
  return { port, child, base: `http://127.0.0.1:${port}` };
}
test('API listens on a hosting provider PORT without requiring API_PORT', async (t) => {
  const server = await startServer(t, { portOnly: true });
  const response = await fetch(`${server.base}/api/session`);
  assert.equal(response.status, 401);
});
test('malformed WebSocket upgrade targets do not crash the API process', async (t) => {
  const server = await startServer(t);
  await new Promise((resolve) => {
    const socket = connect(server.port, '127.0.0.1', () => socket.write('GET //% HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n'));
    socket.resume(); socket.on('error', () => {}); socket.once('close', resolve);
    socket.setTimeout(1000, () => socket.destroy());
  });
  const response = await fetch(`${server.base}/api/session`);
  assert.equal(response.status, 401);
  assert.equal(server.child.exitCode, null);
});
