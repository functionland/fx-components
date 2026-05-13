/**
 * Tests for src/utils/helper.ts — discovery-API integration.
 *
 * Covers:
 *   - findBox() 3-tier resolution (live API → cache → hardcoded)
 *   - refreshRelayCache() write to AsyncStorage
 *   - initFula() retry loop: success on first candidate, retry after failure,
 *     all-fail, outer-timeout-aborts-mid-loop
 */

// Mock React Native externals BEFORE importing helper.
jest.mock('@walletconnect/react-native-compat', () => ({}), { virtual: true });
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@functionland/react-native-fula', () => ({
  fula: {
    newClient: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@functionland/fula-sec', () => ({
  HDKEY: jest.fn().mockImplementation(() => ({
    createEDKeyPair: () => ({
      secretKey: new Uint8Array(32).fill(7),
      pubKey: new Uint8Array(32).fill(8),
    }),
  })),
  DID: jest.fn().mockImplementation(() => ({ did: () => 'did:fake' })),
}));
jest.mock('@walletconnect/encoding', () => ({
  numberToHex: (x: number) => x.toString(16),
  sanitizeHex: (x: string) => x,
  utf8ToHex: (x: string) => x,
}));
// `console` in helper.ts is a Node global; require('console').time is harmless.

// Mock global fetch.
const fetchMock = jest.fn();
(globalThis as any).fetch = fetchMock;
(globalThis as any).AbortController = class {
  signal = {};
  abort() {}
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fula } from '@functionland/react-native-fula';
import { findBox, refreshRelayCache, initFula, resetInitFula } from '../helper';
import { FXRelay, FXRelayCacheKey } from '../constants';

const newClientMock = fula.newClient as jest.Mock;
const logoutMock = fula.logout as jest.Mock;
const shutdownMock = fula.shutdown as jest.Mock;
const asyncStorageGetItem = AsyncStorage.getItem as jest.Mock;
const asyncStorageSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  fetchMock.mockReset();
  newClientMock.mockReset();
  logoutMock.mockReset().mockResolvedValue(undefined);
  shutdownMock.mockReset().mockResolvedValue(undefined);
  asyncStorageGetItem.mockReset();
  asyncStorageSetItem.mockReset();
  resetInitFula();
});

describe('findBox()', () => {
  const BOX_PID = '12D3KooWBox';

  it('tier 1: returns multiaddrs from Workers /find-box response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ multiaddr: '/dns/r1/.../p2p-circuit/p2p/BOX' }],
    });
    const result = await findBox(BOX_PID);
    expect(result).toEqual(['/dns/r1/.../p2p-circuit/p2p/BOX']);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/find-box'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('tier 1: empty array from Workers falls through to tier 2', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [] });
    asyncStorageGetItem.mockResolvedValueOnce(
      JSON.stringify({
        list: [{ dnsName: 'r2', peerId: 'PR2', addr: '/dns/r2/tcp/4001', multiaddr: '/dns/r2/tcp/4001/p2p/PR2' }],
        ts: Date.now(),
      }),
    );
    const result = await findBox(BOX_PID);
    expect(result).toEqual([`/dns/r2/tcp/4001/p2p/PR2/p2p-circuit/p2p/${BOX_PID}`]);
  });

  it('tier 2: Workers errors + cache hit → constructed addresses', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    asyncStorageGetItem.mockResolvedValueOnce(
      JSON.stringify({
        list: [
          { dnsName: 'a', peerId: 'PA', addr: '/dns/a/tcp/4001', multiaddr: '/dns/a/tcp/4001/p2p/PA' },
          { dnsName: 'b', peerId: 'PB', addr: '/dns/b/tcp/4001', multiaddr: '/dns/b/tcp/4001/p2p/PB' },
        ],
        ts: Date.now(),
      }),
    );
    const result = await findBox(BOX_PID);
    expect(result).toEqual([
      `/dns/a/tcp/4001/p2p/PA/p2p-circuit/p2p/${BOX_PID}`,
      `/dns/b/tcp/4001/p2p/PB/p2p-circuit/p2p/${BOX_PID}`,
    ]);
  });

  it('tier 2: cache older than max age → falls through to tier 3', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down'));
    // Cache from 8 days ago — older than FXRelayCacheMaxAgeMs (7 days).
    asyncStorageGetItem.mockResolvedValueOnce(
      JSON.stringify({
        list: [{ dnsName: 'old', peerId: 'OLD', addr: '/dns/old/tcp/4001', multiaddr: '/dns/old/tcp/4001/p2p/OLD' }],
        ts: Date.now() - 8 * 24 * 60 * 60 * 1000,
      }),
    );
    const result = await findBox(BOX_PID);
    expect(result).toEqual([`${FXRelay}/p2p/${BOX_PID}`]);
  });

  it('tier 3: Workers down + cache miss → hardcoded fallback', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down'));
    asyncStorageGetItem.mockResolvedValueOnce(null);
    const result = await findBox(BOX_PID);
    expect(result).toEqual([`${FXRelay}/p2p/${BOX_PID}`]);
  });

  it('tier 3: Workers returns non-ok status + cache miss → hardcoded', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    asyncStorageGetItem.mockResolvedValueOnce(null);
    const result = await findBox(BOX_PID);
    expect(result).toEqual([`${FXRelay}/p2p/${BOX_PID}`]);
  });
});

describe('refreshRelayCache()', () => {
  it('writes fetched relay list to AsyncStorage', async () => {
    const list = [{ dnsName: 'r', peerId: 'P', addr: '/dns/r/tcp/4001', multiaddr: '/dns/r/tcp/4001/p2p/P' }];
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => list });
    await refreshRelayCache();
    expect(asyncStorageSetItem).toHaveBeenCalledWith(
      FXRelayCacheKey,
      expect.stringContaining('"dnsName":"r"'),
    );
    const wrote = JSON.parse(asyncStorageSetItem.mock.calls[0][1]);
    expect(wrote.list).toEqual(list);
    expect(typeof wrote.ts).toBe('number');
  });

  it('does not throw on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'));
    await expect(refreshRelayCache()).resolves.toBeUndefined();
    expect(asyncStorageSetItem).not.toHaveBeenCalled();
  });

  it('skips write on empty list', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [] });
    await refreshRelayCache();
    expect(asyncStorageSetItem).not.toHaveBeenCalled();
  });
});

describe('initFula()', () => {
  const PASSWORD = 'pw';
  const SIG = 'sig';
  const PID = '12D3KooWInitFulaBlox';

  beforeEach(() => {
    // Default: findBox returns the hardcoded fallback (no fetch mock, no cache).
    fetchMock.mockRejectedValue(new Error('no api in this test by default'));
    asyncStorageGetItem.mockResolvedValue(null);
  });

  it('first candidate succeeds → resolves with peerId, no retry', async () => {
    newClientMock.mockResolvedValueOnce('returned-peer-id');
    const result = await initFula({ password: PASSWORD, signiture: SIG, bloxPeerId: PID });
    expect(result).toBe('returned-peer-id');
    expect(newClientMock).toHaveBeenCalledTimes(1);
    // outer logout+shutdown runs once before the loop; no retry cleanup.
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(shutdownMock).toHaveBeenCalledTimes(1);
  });

  it('explicit bloxAddr path uses that one address only (no findBox)', async () => {
    newClientMock.mockResolvedValueOnce('peer-via-addr');
    const result = await initFula({
      password: PASSWORD,
      signiture: SIG,
      bloxAddr: '/dns/custom-relay/.../p2p-circuit/p2p/THING',
    });
    expect(result).toBe('peer-via-addr');
    expect(fetchMock).not.toHaveBeenCalled();  // no findBox call
    expect(newClientMock).toHaveBeenCalledWith(
      expect.any(String),
      '',
      '/dns/custom-relay/.../p2p-circuit/p2p/THING',
      '',
      true, true, true,
    );
  });

  it('first candidate fails, second succeeds — observes cleanup between', async () => {
    // Two candidates from cache.
    fetchMock.mockReset();
    fetchMock.mockRejectedValueOnce(new Error('no api'));   // findBox tier 1 fails
    asyncStorageGetItem.mockResolvedValueOnce(
      JSON.stringify({
        list: [
          { dnsName: 'a', peerId: 'PA', addr: '/dns/a/tcp/4001', multiaddr: '/dns/a/tcp/4001/p2p/PA' },
          { dnsName: 'b', peerId: 'PB', addr: '/dns/b/tcp/4001', multiaddr: '/dns/b/tcp/4001/p2p/PB' },
        ],
        ts: Date.now(),
      }),
    );

    newClientMock
      .mockRejectedValueOnce(new Error('first candidate down'))
      .mockResolvedValueOnce('second-candidate-peer');

    const result = await initFula({ password: PASSWORD, signiture: SIG, bloxPeerId: PID });
    expect(result).toBe('second-candidate-peer');
    expect(newClientMock).toHaveBeenCalledTimes(2);
    // Logout+shutdown invoked once before loop + once between attempts.
    expect(logoutMock).toHaveBeenCalledTimes(2);
    expect(shutdownMock).toHaveBeenCalledTimes(2);
  });

  it('all candidates fail → rejects with last error', async () => {
    fetchMock.mockReset();
    fetchMock.mockRejectedValueOnce(new Error('no api'));
    asyncStorageGetItem.mockResolvedValueOnce(
      JSON.stringify({
        list: [
          { dnsName: 'a', peerId: 'PA', addr: '/dns/a/tcp/4001', multiaddr: '/dns/a/tcp/4001/p2p/PA' },
          { dnsName: 'b', peerId: 'PB', addr: '/dns/b/tcp/4001', multiaddr: '/dns/b/tcp/4001/p2p/PB' },
        ],
        ts: Date.now(),
      }),
    );

    newClientMock
      .mockRejectedValueOnce(new Error('first fail'))
      .mockRejectedValueOnce(new Error('second fail (last)'));

    await expect(
      initFula({ password: PASSWORD, signiture: SIG, bloxPeerId: PID }),
    ).rejects.toThrow(/second fail/);
  });

  it('cancellation via shouldCancel aborts mid-loop', async () => {
    fetchMock.mockReset();
    fetchMock.mockRejectedValueOnce(new Error('no api'));
    asyncStorageGetItem.mockResolvedValueOnce(
      JSON.stringify({
        list: [
          { dnsName: 'a', peerId: 'PA', addr: '/dns/a/tcp/4001', multiaddr: '/dns/a/tcp/4001/p2p/PA' },
          { dnsName: 'b', peerId: 'PB', addr: '/dns/b/tcp/4001', multiaddr: '/dns/b/tcp/4001/p2p/PB' },
        ],
        ts: Date.now(),
      }),
    );

    let calls = 0;
    newClientMock.mockImplementation(async () => {
      calls++;
      throw new Error(`fail #${calls}`);
    });

    // Cancel before the second candidate is tried.
    const shouldCancel = () => calls >= 1;

    await expect(
      initFula({ password: PASSWORD, signiture: SIG, bloxPeerId: PID, shouldCancel }),
    ).rejects.toThrow(/cancelled/);
    expect(newClientMock).toHaveBeenCalledTimes(1);  // didn't try the second
  });

  it('rejects when password is missing', async () => {
    await expect(
      initFula({ password: '', signiture: SIG, bloxPeerId: PID }),
    ).rejects.toThrow(/Password and signature are required/);
  });
});
