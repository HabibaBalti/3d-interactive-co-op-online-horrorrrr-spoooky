import { decode, encode, PROTOCOL_VERSION, type ServerMessage } from '../../shared/protocol';

export type ProbeState =
  { status: 'connecting' } | { status: 'online'; rtt: number | null } | { status: 'offline' };

/** Default: same host, `/ws` path (Vite proxies it in dev). Override with VITE_SERVER_URL. */
export function serverUrl(): string {
  const configured = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (configured) return configured;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}

/**
 * M0 connectivity check: handshake + ping with exponential-backoff reconnect.
 * Grows into the real room client in M2.
 */
export class ServerProbe {
  private ws: WebSocket | null = null;
  private retry = 0;
  private pingTimer = 0;

  constructor(private readonly onState: (s: ProbeState) => void) {}

  connect(): void {
    this.onState({ status: 'connecting' });
    const ws = (this.ws = new WebSocket(serverUrl()));
    ws.onopen = () => {
      this.retry = 0;
      ws.send(encode({ t: 'hello', protocol: PROTOCOL_VERSION }));
    };
    ws.onmessage = (ev) => {
      const msg = decode<ServerMessage>(String(ev.data));
      if (!msg) return;
      if (msg.t === 'welcome') {
        this.onState({ status: 'online', rtt: null });
        this.ping();
        this.pingTimer = window.setInterval(() => this.ping(), 5000);
      } else if (msg.t === 'pong') {
        this.onState({ status: 'online', rtt: Math.round(performance.now() - msg.at) });
      }
    };
    ws.onclose = () => {
      window.clearInterval(this.pingTimer);
      this.onState({ status: 'offline' });
      const delay = Math.min(30_000, 1000 * 2 ** this.retry++);
      window.setTimeout(() => this.connect(), delay);
    };
  }

  private ping(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(encode({ t: 'ping', at: performance.now() }));
    }
  }
}
