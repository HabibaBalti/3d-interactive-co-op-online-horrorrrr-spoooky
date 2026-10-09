import { describe, expect, it } from 'vitest';
import { decode, encode, type ClientMessage } from './protocol';

describe('protocol', () => {
  it('round-trips messages', () => {
    const msg: ClientMessage = { t: 'ping', at: 42 };
    expect(decode<ClientMessage>(encode(msg))).toEqual(msg);
  });

  it('rejects malformed frames', () => {
    expect(decode('not json')).toBeNull();
    expect(decode('{"x":1}')).toBeNull();
    expect(decode('null')).toBeNull();
  });
});
