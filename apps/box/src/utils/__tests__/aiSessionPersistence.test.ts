/**
 * aiSessionPersistence unit tests — the AsyncStorage glue that
 * powers AI-session resume across app background + relaunch.
 *
 * Coverage targets:
 *   - schedulePersist debounces (10 events fast-path + 500ms timer)
 *   - loadPersistedSession returns null for unset / stale / corrupt
 *   - clearPersistedSession wipes + cancels pending writes
 *   - flushDebounce force-writes immediately
 */
import {
    _resetForTests,
    clearPersistedSession,
    DEBOUNCE_EVERY_N,
    DEBOUNCE_MAX_MS,
    flushDebounce,
    loadPersistedSession,
    PERSISTED_SESSION_MAX_AGE_MS,
    schedulePersist,
    type PersistedSession,
} from '../aiSessionPersistence';

// Inline AsyncStorage mock — no project-wide mock exists yet and we
// don't want one (real code paths that DON'T touch persistence
// shouldn't accidentally hit a mocked AsyncStorage).
const _store = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
        getItem: jest.fn((k: string) => Promise.resolve(_store.get(k) ?? null)),
        setItem: jest.fn((k: string, v: string) => { _store.set(k, v); return Promise.resolve(); }),
        removeItem: jest.fn((k: string) => { _store.delete(k); return Promise.resolve(); }),
    },
}));

const SAMPLE: PersistedSession = {
    sessionId: 'sess-test-1',
    lastEventSeq: 7,
    lastPrompt: 'why disconnected?',
    lastScenarioId: 'disconnected',
    savedAt: Date.now(),
};

beforeEach(() => {
    _resetForTests();
    _store.clear();
    jest.useRealTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('schedulePersist debounce', () => {
    test('coalesces N writes into a single setItem after DEBOUNCE_EVERY_N events', async () => {
        jest.useFakeTimers();
        for (let i = 0; i < DEBOUNCE_EVERY_N; i++) {
            schedulePersist({ ...SAMPLE, lastEventSeq: i });
        }
        // The Nth event triggers an immediate flush (fire-and-forget).
        // Yield once to let the awaited setItem resolve.
        await Promise.resolve();
        await Promise.resolve();
        const raw = _store.get('@blox-ai/persisted-session/v1');
        expect(raw).toBeDefined();
        const parsed = JSON.parse(raw!);
        // Last value wins
        expect(parsed.lastEventSeq).toBe(DEBOUNCE_EVERY_N - 1);
    });

    test('flushes via timer when below the event-count threshold', async () => {
        jest.useFakeTimers();
        schedulePersist({ ...SAMPLE, lastEventSeq: 3 });
        // No flush yet — only 1 event, no timer fire
        expect(_store.get('@blox-ai/persisted-session/v1')).toBeUndefined();
        jest.advanceTimersByTime(DEBOUNCE_MAX_MS);
        // Yield microtasks so the setItem promise settles
        await Promise.resolve();
        await Promise.resolve();
        expect(_store.get('@blox-ai/persisted-session/v1')).toBeDefined();
    });

    test('repeated calls update pending state in place; only one write fires', async () => {
        jest.useFakeTimers();
        schedulePersist({ ...SAMPLE, lastEventSeq: 1 });
        schedulePersist({ ...SAMPLE, lastEventSeq: 2 });
        schedulePersist({ ...SAMPLE, lastEventSeq: 3 });
        jest.advanceTimersByTime(DEBOUNCE_MAX_MS);
        await Promise.resolve();
        await Promise.resolve();
        const raw = _store.get('@blox-ai/persisted-session/v1');
        expect(raw).toBeDefined();
        expect(JSON.parse(raw!).lastEventSeq).toBe(3);   // last write wins
    });
});

describe('flushDebounce', () => {
    test('writes the pending state immediately + cancels the timer', async () => {
        jest.useFakeTimers();
        schedulePersist({ ...SAMPLE, lastEventSeq: 99 });
        // Pending — no write yet
        expect(_store.get('@blox-ai/persisted-session/v1')).toBeUndefined();
        await flushDebounce();
        expect(_store.get('@blox-ai/persisted-session/v1')).toBeDefined();
        // Timer should be cancelled — advancing time doesn't double-write
        const beforeAdvance = _store.get('@blox-ai/persisted-session/v1');
        jest.advanceTimersByTime(DEBOUNCE_MAX_MS * 10);
        await Promise.resolve();
        expect(_store.get('@blox-ai/persisted-session/v1')).toBe(beforeAdvance);
    });

    test('no-op when nothing is pending', async () => {
        await expect(flushDebounce()).resolves.toBeUndefined();
        expect(_store.get('@blox-ai/persisted-session/v1')).toBeUndefined();
    });
});

describe('loadPersistedSession', () => {
    test('returns null when nothing is stored', async () => {
        await expect(loadPersistedSession()).resolves.toBeNull();
    });

    test('round-trips a valid snapshot', async () => {
        await flushDebounce();
        schedulePersist(SAMPLE);
        await flushDebounce();
        const loaded = await loadPersistedSession();
        expect(loaded).toEqual(SAMPLE);
    });

    test('discards snapshots older than PERSISTED_SESSION_MAX_AGE_MS + removes the key', async () => {
        const old: PersistedSession = {
            ...SAMPLE,
            savedAt: Date.now() - PERSISTED_SESSION_MAX_AGE_MS - 1000,
        };
        _store.set('@blox-ai/persisted-session/v1', JSON.stringify(old));
        await expect(loadPersistedSession()).resolves.toBeNull();
        // Stale entry was removed
        expect(_store.has('@blox-ai/persisted-session/v1')).toBe(false);
    });

    test('discards corrupt JSON + removes the key', async () => {
        _store.set('@blox-ai/persisted-session/v1', 'not-json{{{');
        await expect(loadPersistedSession()).resolves.toBeNull();
        expect(_store.has('@blox-ai/persisted-session/v1')).toBe(false);
    });

    test('discards schema-invalid blobs (missing required fields)', async () => {
        _store.set('@blox-ai/persisted-session/v1', JSON.stringify({
            sessionId: 'x',
            lastEventSeq: 1,
            // missing lastPrompt, lastScenarioId, savedAt
        }));
        await expect(loadPersistedSession()).resolves.toBeNull();
        expect(_store.has('@blox-ai/persisted-session/v1')).toBe(false);
    });
});

describe('clearPersistedSession', () => {
    test('removes the stored snapshot + cancels pending writes', async () => {
        jest.useFakeTimers();
        // Plant a stored entry
        _store.set('@blox-ai/persisted-session/v1', JSON.stringify(SAMPLE));
        // Schedule a new pending write
        schedulePersist({ ...SAMPLE, lastEventSeq: 42 });
        // Clear synchronously
        await clearPersistedSession();
        expect(_store.has('@blox-ai/persisted-session/v1')).toBe(false);
        // Pending timer was cancelled — advancing time doesn't write
        jest.advanceTimersByTime(DEBOUNCE_MAX_MS * 10);
        await Promise.resolve();
        expect(_store.has('@blox-ai/persisted-session/v1')).toBe(false);
    });
});
