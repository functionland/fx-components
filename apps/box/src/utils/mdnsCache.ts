/**
 * mdnsCache — process-wide cache of recent mDNS records for blox devices.
 *
 * The pairing flow (`ConnectToExistingBlox.screen.tsx`) runs its own
 * Zeroconf scan to discover bloxes during initial setup. This cache is a
 * separate, AI-transport-specific shim that:
 *
 *  - runs a one-shot scan on demand (no global subscription, no UI),
 *  - keeps the resolved records in module scope with `observedAt`
 *    timestamps for freshness checks,
 *  - exposes a `findAuthorizedBlox()` query that the AI transport
 *    selector uses to pick a LAN HTTP candidate.
 *
 * Freshness window default 90 s — repo polls mDNS every 60 s in the
 * paired pairing flow; 30 s forced unnecessary BLE fallbacks (codex Plan
 * HTTP v2 final-review catch).
 *
 * No global subscription on purpose: the AI transport runs in short
 * bursts (one selector call per AI session start), so a transient scan
 * + cached results is cheaper than a long-lived listener. The cache
 * survives across selector calls within the same TTL.
 *
 * The cache also accepts external `noteRecord()` updates so other parts
 * of the app (e.g. the existing pairing screen) can opportunistically
 * feed the cache.
 */

import Zeroconf from 'react-native-zeroconf';
import { NativeModules } from 'react-native';
import type { MDNSBloxService } from '../models/blox';

const SERVICE_NAME = '_fulatower._tcp.';
const DEFAULT_SCAN_TIMEOUT_MS = 4000;
const DEFAULT_FRESHNESS_MAX_AGE_MS = 90_000;

interface CachedRecord {
    service: MDNSBloxService;
    observedAt: number;
}

interface InflightScan {
    promise: Promise<void>;
}

// Process-wide singleton. React Native module scope is the natural place
// for this — no extra DI required.
const records = new Map<string, CachedRecord>();   // keyed by hardwareID
let inflight: InflightScan | null = null;

function recordKey(s: MDNSBloxService): string {
    return s.txt?.hardwareID || s.txt?.bloxPeerIdString || s.host || s.name;
}

/**
 * Insert/refresh a record. Called both from the internal scan resolver
 * and from external callers (e.g. the existing pairing screen) so the
 * cache benefits from any Zeroconf event the app already produces.
 */
export function noteRecord(s: MDNSBloxService): void {
    const key = recordKey(s);
    if (!key) return;
    records.set(key, { service: s, observedAt: Date.now() });
}

/**
 * Look up an authorized blox record. Returns the most recent record
 * matching `bloxPeerId` with `authorizer === appPeerId` AND age <
 * maxAgeMs. Returns null if no fresh match.
 */
export function findAuthorizedBlox(
    bloxPeerId: string,
    appPeerId: string,
    maxAgeMs: number = DEFAULT_FRESHNESS_MAX_AGE_MS,
): { service: MDNSBloxService; observedAt: number } | null {
    const now = Date.now();
    for (const rec of records.values()) {
        if (rec.service.txt?.bloxPeerIdString !== bloxPeerId) continue;
        if (rec.service.txt?.authorizer !== appPeerId) continue;
        if (now - rec.observedAt > maxAgeMs) continue;
        return rec;
    }
    return null;
}

/**
 * Run a one-shot Zeroconf scan and populate the cache with whatever
 * resolves within `timeoutMs`. Concurrent calls share the same scan
 * — no double-scanning.
 *
 * The scan listens for `resolved` events; records arrive asynchronously
 * during the timeout window. Returns when the window closes (we don't
 * try to detect "scan complete" beyond the timeout — Zeroconf's "stop"
 * event is unreliable across platforms).
 *
 * Returns silently on platforms where the native module isn't linked
 * (e.g. dev builds without iOS pods installed). Caller should not rely
 * on this method ALWAYS populating the cache.
 */
export function refreshOnce(timeoutMs: number = DEFAULT_SCAN_TIMEOUT_MS): Promise<void> {
    if (inflight) return inflight.promise;

    const promise = new Promise<void>((resolve) => {
        // Native module check — RNZeroconf isn't linked in some test/CI
        // environments. Resolve immediately so callers don't hang.
        const moduleAvailable = !!NativeModules.RNZeroconf;
        if (!moduleAvailable) {
            console.log('[mdnsCache] RNZeroconf native module not available; skipping scan');
            resolve();
            return;
        }

        let zc: Zeroconf | null;
        try {
            zc = new Zeroconf();
        } catch (err) {
            console.warn('[mdnsCache] Zeroconf construction failed', err);
            resolve();
            return;
        }

        const cleanup = () => {
            try {
                zc?.stop();
                zc?.removeAllListeners?.('resolved');
                zc?.removeAllListeners?.('error');
                zc?.removeAllListeners?.('stop');
            } catch (e) {
                // Tolerate platform-level cleanup quirks.
            }
            zc = null;
        };

        const timer = setTimeout(() => {
            cleanup();
            resolve();
        }, timeoutMs);

        // `Service` from react-native-zeroconf's .d.ts is a loose
        // Record<string, string> on txt; we know our broadcaster
        // emits the MDNSBloxService shape (Phase 6+ pairing flow).
        // Cast at the boundary; noteRecord defensively reads optional
        // fields.
        zc.on('resolved', (service: unknown) => {
            try {
                noteRecord(service as MDNSBloxService);
            } catch (e) {
                console.warn('[mdnsCache] noteRecord failed', e);
            }
        });
        zc.on('error', (err: Error) => {
            console.warn('[mdnsCache] scan error', err);
            // Don't resolve early — keep listening; other records may
            // still resolve before the timeout.
        });

        try {
            // The Zeroconf scan API expects the protocol type and
            // service type separately. Service name `_fulatower._tcp.`
            // → scan('fulatower', 'tcp').
            zc.scan('fulatower', 'tcp');
        } catch (e) {
            console.warn('[mdnsCache] scan() failed', e);
            clearTimeout(timer);
            cleanup();
            resolve();
        }
    }).finally(() => {
        inflight = null;
    });

    inflight = { promise };
    return promise;
}

/**
 * Clear the cache. Tests call this between cases. Production callers
 * may also use this on network change events (NetInfo) to force a fresh
 * scan on the next selector invocation.
 */
export function clear(): void {
    records.clear();
}

/**
 * Snapshot for tests + diagnostics. Don't mutate.
 */
export function _internalRecords(): ReadonlyMap<string, CachedRecord> {
    return records;
}
