import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { resolveApiUrl } from './http.js';
import { clearPrivateSession, SESSION_QUERY_KEY } from './queryClient.js';
const eventSchema = z.object({ type: z.enum(['session.updated', 'session.revoked', 'heartbeat', 'ping', 'pong']), data: z.unknown().optional() });
export function connectApiEvents(onMessage, { signal, onError } = {}) {
  let socket, timer; let attempts = 0; let stopped = false;
  function stop() {
    if (stopped) return;
    stopped = true; clearTimeout(timer); signal?.removeEventListener('abort', stop);
    if (socket) { socket.onclose = null; socket.onmessage = null; socket.close(); }
  }
  function reconnect() { if (!stopped) { clearTimeout(timer); timer = setTimeout(connect, Math.min(30000, 500 * 2 ** Math.min(attempts++, 6))); } }
  function connect() {
    if (stopped) return;
    try { const url = resolveApiUrl('/events'); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'; socket = new WebSocket(url); }
    catch (error) { onError?.(error); reconnect(); return; }
    socket.onopen = () => { attempts = 0; };
    socket.onerror = () => onError?.(new Error('تعذر الاتصال بالتحديثات المباشرة.'));
    socket.onclose = () => { if (!stopped) reconnect(); };
    socket.onmessage = (message) => {
      if (stopped || typeof message.data !== 'string' || message.data.length > 65536) return;
      let event;
      try { const parsed = eventSchema.safeParse(JSON.parse(message.data)); if (!parsed.success) return; event = parsed.data; } catch { return; }
      if (['ping', 'heartbeat'].includes(event.type)) { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'pong' })); return; }
      if (event.type === 'pong') return;
      onMessage(event); if (event.type === 'session.revoked') stop();
    };
  }
  if (signal?.aborted) return stop;
  signal?.addEventListener('abort', stop, { once: true });
  if (typeof WebSocket === 'undefined') { onError?.(new Error('التحديثات المباشرة غير مدعومة.')); stop(); return stop; }
  connect(); return stop;
}
export function useApiRealtime(enabled = false) {
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const disconnect = connectApiEvents((event) => {
      if (event.type === 'session.updated') void client.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      if (event.type === 'session.revoked') void clearPrivateSession(client);
    }, { signal: controller.signal });
    return () => { controller.abort(); disconnect(); };
  }, [client, enabled]);
}
