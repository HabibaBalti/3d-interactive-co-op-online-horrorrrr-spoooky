import { createServer } from 'node:http';
import { existsSync, createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  decode,
  encode,
  PROTOCOL_VERSION,
  type ClientMessage,
  type ServerMessage,
} from '../shared/protocol';

/**
 * Realtime server. In M0 it only answers health checks and ping; M2 adds rooms and the
 * authoritative story-flag state. In production it also serves the built client from dist/,
 * so the whole game deploys as one service.
 */
const PORT = Number(process.env.PORT ?? 8787);
const DIST = resolve(import.meta.dirname, '../dist');
const SERVE_STATIC = existsSync(join(DIST, 'index.html'));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.map': 'application/json',
};

/** Resolves a URL path inside dist/, or null if it escapes it or does not exist. */
function staticFile(urlPath: string): string | null {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0] ?? '/'));
  const file = resolve(DIST, '.' + clean);
  if (!file.startsWith(DIST)) return null;
  if (existsSync(file) && statSync(file).isFile()) return file;
  return null;
}

const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, protocol: PROTOCOL_VERSION }));
    return;
  }
  if (SERVE_STATIC && (req.method === 'GET' || req.method === 'HEAD')) {
    // Unknown paths fall back to index.html so room links like /ABCDE work.
    const file = staticFile(req.url ?? '/') ?? join(DIST, 'index.html');
    const immutable = file.includes(`${join(DIST, 'assets')}`);
    res.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ server: http, path: '/ws', maxPayload: 64 * 1024 });

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === ws.OPEN) ws.send(encode(msg));
}

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const msg = decode<ClientMessage>(data.toString());
    if (!msg) return send(ws, { t: 'error', reason: 'malformed' });
    switch (msg.t) {
      case 'hello':
        if (msg.protocol !== PROTOCOL_VERSION) {
          return send(ws, { t: 'error', reason: 'protocol-mismatch' });
        }
        return send(ws, { t: 'welcome', protocol: PROTOCOL_VERSION, serverTime: Date.now() });
      case 'ping':
        return send(ws, { t: 'pong', at: msg.at });
    }
  });
});

http.listen(PORT, () => {
  console.log(
    `[still-here] realtime server on :${PORT} (ws path /ws)${SERVE_STATIC ? ', serving dist/' : ''}`,
  );
});
