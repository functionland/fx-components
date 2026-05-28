/**
 * aiSessionPersistence — debounced AsyncStorage glue for AI-session
 * resume after the app is backgrounded OR killed by the OS.
 *
 * One key (single atomic write) holds the minimal state needed to
 * reattach to a blox-ai container session via
 * `httpAiClient.resume(sessionId, lastEventSeq)`:
 *
 *   - sessionId: the per-session UUID minted by the container
 *   - lastEventSeq: highest SSE id field observed (per-session
 *     monotonic seq number; see blox-ai 1a420fd)
 *   - lastPrompt + lastScenarioId: needed if the server returns 404
 *     (session evicted by TTL/LRU/container restart) so we can offer
 *     a one-tap retry that re-runs the original question
 *   - savedAt: epoch ms — discarded as too-stale beyond
 *     PERSISTED_SESSION_MAX_AGE_MS (matches the container's 30-min
 *     SLIDING TTL with a small safety buffer)
 *
 * Debounce policy (advisor 2026-05-28): write every DEBOUNCE_EVERY_N
 * events OR DEBOUNCE_MAX_MS milliseconds, whichever fires first.
 * Avoids queue-of-writes-per-event during a fast tool_call burst.
 *
 * Crash safety: single key, single AsyncStorage.setItem call. If the
 * app dies mid-write, AsyncStorage's underlying transactional store
 * either commits the prior value or this one — never a partial blob.
 * (RN's @react-native-async-storage/async-storage uses SQLite on
 * Android and a JSON file with atomic-rename on iOS.)
 *
 * On 404 from the server (session no longer exists): the caller MUST
 * call `clearPersistedSession()` AND `flushDebounce()` synchronously
 * BEFORE the error renders, otherwise the next AppState foreground
 * fires another resume against the same dead session.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@blox-ai/persisted-session/v1';

// 10 events or 500ms — whichever fires first (advisor input).
export const DEBOUNCE_EVERY_N = 10;
export const DEBOUNCE_MAX_MS = 500;

// Container TTL is 30 min sliding. If our persisted snapshot is older
// than 25 min the session is very likely already evicted; skip the
// resume attempt + clear locally. Keeps us from wasting a request +
// flashing an error event for an obviously-stale state.
export const PERSISTED_SESSION_MAX_AGE_MS = 25 * 60 * 1000;

export interface PersistedSession {
    sessionId: string;
    lastEventSeq: number;
    lastPrompt: string;
    /**
     * One of the canonical ScenarioId values OR 'freeform' (matches
     * useAiSession.lastScenarioId). Kept as a free string here so we
     * don't pull a type dep into the persistence module.
     */
    lastScenarioId: string;
    /** epoch ms — used to discard snapshots older than the container's TTL. */
    savedAt: number;
}

// Module-level debounce state. The hook calls schedulePersist() each
// time an event arrives; this module accumulates and flushes at the
// debounce threshold. NOT exposed — callers go through the public
// functions below.
let pendingState: PersistedSession | null = null;
let pendingCount = 0;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimer(): void {
    if (pendingTimer !== null) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
    }
}

async function flushNow(): Promise<void> {
    const toWrite = pendingState;
    pendingState = null;
    pendingCount = 0;
    clearTimer();
    if (toWrite === null) return;
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toWrite));
    } catch (e) {
        // AsyncStorage failures are non-fatal — resume is best-effort,
        // not a correctness requirement. Surface to console for
        // debugging but don't propagate.
        // eslint-disable-next-line no-console
        console.warn('aiSessionPersistence: setItem failed', e);
    }
}

/**
 * Queue a persistence write. Coalesces — repeated calls within the
 * debounce window update `pendingState` in place; the actual
 * AsyncStorage.setItem fires when DEBOUNCE_EVERY_N events accumulate
 * OR DEBOUNCE_MAX_MS elapses.
 */
export function schedulePersist(state: PersistedSession): void {
    pendingState = state;
    pendingCount += 1;
    if (pendingCount >= DEBOUNCE_EVERY_N) {
        // Fire-and-forget — flushNow handles its own errors.
        void flushNow();
        return;
    }
    if (pendingTimer === null) {
        pendingTimer = setTimeout(() => { void flushNow(); }, DEBOUNCE_MAX_MS);
    }
}

/**
 * Force-flush any pending write immediately. Used on the 404 path
 * before clearPersistedSession so a debounced write can't sneak
 * back in after the clear.
 */
export async function flushDebounce(): Promise<void> {
    await flushNow();
}

/**
 * Load the persisted snapshot, returning null if there's nothing
 * stored OR if the snapshot is too stale (older than
 * PERSISTED_SESSION_MAX_AGE_MS — the container almost certainly
 * evicted the session by now). Stale entries are removed so a
 * subsequent foreground transition doesn't keep retrying.
 */
export async function loadPersistedSession(): Promise<PersistedSession | null> {
    let raw: string | null;
    try {
        raw = await AsyncStorage.getItem(STORAGE_KEY);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('aiSessionPersistence: getItem failed', e);
        return null;
    }
    if (raw === null) return null;
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        // Corrupt blob — discard.
        await clearPersistedSession();
        return null;
    }
    if (
        parsed === null
        || typeof parsed !== 'object'
        || typeof (parsed as PersistedSession).sessionId !== 'string'
        || typeof (parsed as PersistedSession).lastEventSeq !== 'number'
        || typeof (parsed as PersistedSession).lastPrompt !== 'string'
        || typeof (parsed as PersistedSession).lastScenarioId !== 'string'
        || typeof (parsed as PersistedSession).savedAt !== 'number'
    ) {
        await clearPersistedSession();
        return null;
    }
    const state = parsed as PersistedSession;
    const age = Date.now() - state.savedAt;
    if (age > PERSISTED_SESSION_MAX_AGE_MS) {
        await clearPersistedSession();
        return null;
    }
    return state;
}

/**
 * Synchronously cancel any pending debounced write + clear the
 * persisted snapshot. Caller MUST await this BEFORE rendering a
 * recovery affordance after a 404 so the next AppState foreground
 * doesn't immediately re-trigger the dead resume.
 */
export async function clearPersistedSession(): Promise<void> {
    pendingState = null;
    pendingCount = 0;
    clearTimer();
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('aiSessionPersistence: removeItem failed', e);
    }
}

/**
 * Test-only: reset the internal debounce state so unit tests don't
 * leak pending timers across cases. NOT exported in the public API
 * (callers shouldn't need this).
 */
export const _resetForTests = (): void => {
    pendingState = null;
    pendingCount = 0;
    clearTimer();
};
