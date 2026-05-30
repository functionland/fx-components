/**
 * manualBloxIp unit tests — the AsyncStorage glue for the user-typed
 * Blox LAN IP fallback (used when mDNS auto-discovery fails).
 *
 * Coverage targets:
 *   - load: unset → null; trims; blank → null; empty peer id → null;
 *     getItem error → null (non-fatal)
 *   - save: trims + writes per-blox key; blank clears instead of writing;
 *     empty peer id → no-op; setItem error swallowed
 *   - remove: deletes the key; empty peer id → no-op; removeItem error swallowed
 *   - per-blox keying isolates IPs across multiple paired bloxs
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    loadManualBloxIp,
    saveManualBloxIp,
    removeManualBloxIp,
} from '../manualBloxIp';

// Inline AsyncStorage mock — mirrors aiSessionPersistence.test.ts. No
// project-wide mock exists (and we don't want one — real code paths that
// don't touch storage shouldn't hit a mocked AsyncStorage).
const _store = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
        getItem: jest.fn((k: string) => Promise.resolve(_store.get(k) ?? null)),
        setItem: jest.fn((k: string, v: string) => { _store.set(k, v); return Promise.resolve(); }),
        removeItem: jest.fn((k: string) => { _store.delete(k); return Promise.resolve(); }),
    },
}));

const KEY = (id: string) => `@blox-ai/manual-ip/v1/${id}`;
const PEER = 'QmBloxPeerOne';
const PEER2 = 'QmBloxPeerTwo';

beforeEach(() => {
    _store.clear();
    jest.clearAllMocks();
});

describe('loadManualBloxIp', () => {
    test('returns null when nothing is stored', async () => {
        await expect(loadManualBloxIp(PEER)).resolves.toBeNull();
    });

    test('returns null for an empty peer id without touching storage', async () => {
        await expect(loadManualBloxIp('')).resolves.toBeNull();
        expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    test('returns the trimmed stored IP', async () => {
        _store.set(KEY(PEER), '  192.168.1.50  ');
        await expect(loadManualBloxIp(PEER)).resolves.toBe('192.168.1.50');
    });

    test('returns null for a blank stored value', async () => {
        _store.set(KEY(PEER), '   ');
        await expect(loadManualBloxIp(PEER)).resolves.toBeNull();
    });

    test('returns null and warns when getItem throws', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('boom'));
        await expect(loadManualBloxIp(PEER)).resolves.toBeNull();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });
});

describe('saveManualBloxIp', () => {
    test('persists the trimmed IP under the per-blox key', async () => {
        await saveManualBloxIp(PEER, '  10.0.0.5  ');
        expect(_store.get(KEY(PEER))).toBe('10.0.0.5');
    });

    test('keys IPs independently per blox', async () => {
        await saveManualBloxIp(PEER, '192.168.1.2');
        await saveManualBloxIp(PEER2, '192.168.1.3');
        await expect(loadManualBloxIp(PEER)).resolves.toBe('192.168.1.2');
        await expect(loadManualBloxIp(PEER2)).resolves.toBe('192.168.1.3');
    });

    test('is a no-op for an empty peer id', async () => {
        await saveManualBloxIp('', '192.168.1.2');
        expect(AsyncStorage.setItem).not.toHaveBeenCalled();
        expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    test('clears the entry when given a blank IP instead of writing a useless key', async () => {
        _store.set(KEY(PEER), '192.168.1.9');
        await saveManualBloxIp(PEER, '   ');
        expect(AsyncStorage.setItem).not.toHaveBeenCalled();
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith(KEY(PEER));
        expect(_store.has(KEY(PEER))).toBe(false);
    });

    test('swallows setItem errors (never throws)', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
        await expect(saveManualBloxIp(PEER, '192.168.1.50')).resolves.toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });
});

describe('removeManualBloxIp', () => {
    test('removes the stored entry', async () => {
        _store.set(KEY(PEER), '192.168.1.50');
        await removeManualBloxIp(PEER);
        expect(_store.has(KEY(PEER))).toBe(false);
    });

    test('is a no-op for an empty peer id', async () => {
        await removeManualBloxIp('');
        expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    test('swallows removeItem errors (never throws)', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('boom'));
        await expect(removeManualBloxIp(PEER)).resolves.toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });
});
