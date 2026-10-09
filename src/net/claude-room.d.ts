/** The subset of the hosted page's `window.claude` room capability this game uses. */
export interface RoomPeer {
  peer: string;
  isMe: boolean;
  sameTab: boolean;
  presence: Readonly<Record<string, unknown>>;
}

export interface RoomMessage {
  topic: string;
  data?: unknown;
  isMe: boolean;
  sameTab: boolean;
  peer: string;
}

export interface NamedRoom {
  emit(topic: string, data?: unknown): Promise<void>;
  on(
    topic: string,
    fn: (m: RoomMessage) => void,
    onError?: (e: { code: string }) => void,
  ): () => void;
  presence(patch: Record<string, unknown>): Promise<void>;
  peers(): readonly RoomPeer[];
  onPeers(fn: (c: { peers: readonly RoomPeer[] }) => void): () => void;
  connected(): boolean;
  leave(): Promise<void>;
}

export interface RoomApi {
  join(name: string): Promise<NamedRoom>;
}
