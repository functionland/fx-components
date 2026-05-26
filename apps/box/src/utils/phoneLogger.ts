/**
 * phoneLogger — Phase 12 (apps/box side of Phase 11's phone_context contract).
 *
 * Gathers the user's phone-side state and ships it to the Blox AI container's
 * POST /troubleshoot/phone-context endpoint when the user taps "Share my
 * phone's context" in the Diagnostics screen. The container ingests it as a
 * virtual tool_result in the model's prompt context (NOT emitted on SSE per
 * Codex Phase 11 Q8 catch) so the AI can cite phone-rooted causes ("Your
 * phone's wifi dropped to a different SSID at 14:23 — that's why").
 *
 * PRIVACY: phone_context NEVER leaves the user's blox. No central upload
 * channel. The Share modal shows the literal JSON to the user before sending
 * (per Codex Phase 12 Q6 — "don't silently redact").
 *
 * The TypeScript interface below MUST match fula-ota's
 * `docker/fxsupport/linux/plugins/blox-ai/api/phone_context.schema.json`
 * (Phase 11, schema_version: 1). Source of truth for the shape is THAT FILE.
 * If you edit fields here, update the schema and re-run Phase 11's tests.
 */
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

// ─────────────────────────────────────────────────────────────────────
// Type definitions — must match phone_context.schema.json (v1) byte-for-byte
// in field names. Caps (maxLength/maxItems) live in the schema; this side
// truncates before send to ensure we never produce a payload that the
// container would 400.
// ─────────────────────────────────────────────────────────────────────

export type Transport = 'libp2p' | 'ble' | 'hotspot';

export interface ConnectionAttempt {
    ts: string;           // ISO 8601 UTC
    transport: Transport;
    target_blox_id?: string;
    success: boolean;
    error?: string;
    duration_ms?: number;
}

export interface NetworkChange {
    ts: string;
    from?: string;
    to?: string;
}

export interface AppError {
    ts: string;
    screen?: string;
    error_summary: string;
}

export interface NetInfoSummary {
    is_connected?: boolean;
    is_internet_reachable?: boolean | null;
    type?: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'bluetooth' | 'unknown' | 'wimax' | 'vpn';
    wifi_ssid?: string;
    wifi_strength?: number;
    cellular_generation?: '2g' | '3g' | '4g' | '5g' | 'unknown';
}

export interface PhoneContext {
    app_version: string;
    os: 'android' | 'ios';
    os_version: string;
    device_model?: string;
    netinfo?: NetInfoSummary;
    recent_connection_attempts?: ConnectionAttempt[];
    last_successful_blox_interaction_ts?: string;
    recent_network_changes?: NetworkChange[];
    recent_app_errors?: AppError[];
}

// ─────────────────────────────────────────────────────────────────────
// Persistent ring buffers in AsyncStorage. Single key per Gemini Q2 refinement
// — one getItem/setItem per update instead of 3.
// ─────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'fula.phoneLogger.v1';

// Schema's maxItems values (Phase 11 phone_context.schema.json)
const MAX_CONNECTION_ATTEMPTS = 20;
const MAX_NETWORK_CHANGES = 10;
const MAX_APP_ERRORS = 10;

interface PersistedState {
    connection_attempts: ConnectionAttempt[];
    network_changes: NetworkChange[];
    app_errors: AppError[];
    last_successful_blox_interaction_ts?: string;
}

const EMPTY_STATE: PersistedState = {
    connection_attempts: [],
    network_changes: [],
    app_errors: [],
};

// Module-level promise chain to serialize writes — prevents lost updates when
// multiple events fire close together (Codex Q2 refinement: "simple module-
// level promise chain per ring key is enough"). One chain for the whole
// single-key file is even simpler than per-ring chains.
let writeChain: Promise<void> = Promise.resolve();

async function readState(): Promise<PersistedState> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...EMPTY_STATE };
        const parsed = JSON.parse(raw);
        // Defensive: tolerate missing keys from older versions
        return {
            connection_attempts: Array.isArray(parsed.connection_attempts)
                ? parsed.connection_attempts : [],
            network_changes: Array.isArray(parsed.network_changes)
                ? parsed.network_changes : [],
            app_errors: Array.isArray(parsed.app_errors)
                ? parsed.app_errors : [],
            last_successful_blox_interaction_ts: typeof parsed.last_successful_blox_interaction_ts === 'string'
                ? parsed.last_successful_blox_interaction_ts : undefined,
        };
    } catch {
        return { ...EMPTY_STATE };
    }
}

async function writeState(s: PersistedState): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
        // Persistence failure is non-fatal. The next push retries.
    }
}

function enqueueWrite(mutator: (s: PersistedState) => PersistedState): Promise<void> {
    const next = writeChain.then(async () => {
        const cur = await readState();
        const updated = mutator(cur);
        await writeState(updated);
    });
    writeChain = next.catch(() => undefined);
    return next;
}

// ─────────────────────────────────────────────────────────────────────
// Push APIs — call sites are NetInfo subscriber + bleManager + error boundary
// ─────────────────────────────────────────────────────────────────────

export function recordConnectionAttempt(a: ConnectionAttempt): Promise<void> {
    return enqueueWrite((s) => {
        const arr = [...s.connection_attempts, a].slice(-MAX_CONNECTION_ATTEMPTS);
        return {
            ...s,
            connection_attempts: arr,
            last_successful_blox_interaction_ts: a.success
                ? a.ts
                : s.last_successful_blox_interaction_ts,
        };
    });
}

export function recordNetworkChange(c: NetworkChange): Promise<void> {
    return enqueueWrite((s) => ({
        ...s,
        network_changes: [...s.network_changes, c].slice(-MAX_NETWORK_CHANGES),
    }));
}

export function recordAppError(e: AppError): Promise<void> {
    return enqueueWrite((s) => ({
        ...s,
        app_errors: [...s.app_errors, e].slice(-MAX_APP_ERRORS),
    }));
}

// ─────────────────────────────────────────────────────────────────────
// NetInfo subscriber — install once in App.tsx root. Tracks SSID transitions
// for the recent_network_changes ring.
// ─────────────────────────────────────────────────────────────────────

let netInfoUnsubscribe: (() => void) | null = null;
let lastSeenNetwork: string | null = null;

export function installNetInfoLogger(): () => void {
    if (netInfoUnsubscribe) return netInfoUnsubscribe;
    netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
        const cur = describeNetwork(state);
        if (cur !== lastSeenNetwork) {
            const ts = new Date().toISOString();
            const change: NetworkChange = { ts };
            if (lastSeenNetwork) change.from = lastSeenNetwork;
            if (cur) change.to = cur;
            // Only record if at least one side is non-empty
            if (change.from || change.to) {
                void recordNetworkChange(change);
            }
            lastSeenNetwork = cur;
        }
    });
    return () => {
        if (netInfoUnsubscribe) netInfoUnsubscribe();
        netInfoUnsubscribe = null;
        lastSeenNetwork = null;
    };
}

function describeNetwork(state: NetInfoState): string | null {
    if (!state.isConnected) return 'none';
    if (state.type === 'wifi') {
        const details = state.details as { ssid?: string } | null;
        if (details?.ssid) return `wifi:${details.ssid}`;
        return 'wifi:unknown';
    }
    if (state.type === 'cellular') return 'cellular';
    return String(state.type);
}

// ─────────────────────────────────────────────────────────────────────
// gatherContext — called when user taps Share. Builds a PhoneContext that
// validates against phone_context.schema.json (Phase 11). String/array caps
// applied client-side so the container never returns 400.
// ─────────────────────────────────────────────────────────────────────

export async function gatherContext(): Promise<PhoneContext> {
    const state = await readState();

    let netinfo: NetInfoSummary | undefined;
    try {
        const ni = await NetInfo.fetch();
        netinfo = {
            is_connected: ni.isConnected ?? undefined,
            is_internet_reachable: ni.isInternetReachable,
            type: mapNetInfoType(ni.type),
        };
        if (ni.type === 'wifi') {
            const details = ni.details as { ssid?: string; strength?: number } | null;
            if (details?.ssid) {
                netinfo.wifi_ssid = truncate(details.ssid, 64);
            }
            if (typeof details?.strength === 'number') {
                // Clamp to schema's allowed RSSI range [-120..0]
                netinfo.wifi_strength = Math.max(-120, Math.min(0, details.strength));
            }
        }
        if (ni.type === 'cellular') {
            const details = ni.details as { cellularGeneration?: string } | null;
            if (details?.cellularGeneration) {
                netinfo.cellular_generation = mapCellularGen(details.cellularGeneration);
            }
        }
    } catch {
        // No NetInfo state — leave netinfo undefined
    }

    const ctx: PhoneContext = {
        app_version: truncate(DeviceInfo.getVersion(), 32),
        os: (Platform.OS === 'ios' ? 'ios' : 'android'),
        os_version: truncate(String(Platform.Version), 32),
        device_model: truncate(DeviceInfo.getModel(), 64),
    };
    if (netinfo) ctx.netinfo = netinfo;
    if (state.connection_attempts.length > 0) {
        ctx.recent_connection_attempts = state.connection_attempts
            .slice(-MAX_CONNECTION_ATTEMPTS)
            .map(sanitizeAttempt);
    }
    if (state.network_changes.length > 0) {
        ctx.recent_network_changes = state.network_changes
            .slice(-MAX_NETWORK_CHANGES)
            .map(sanitizeNetworkChange);
    }
    if (state.app_errors.length > 0) {
        ctx.recent_app_errors = state.app_errors
            .slice(-MAX_APP_ERRORS)
            .map(sanitizeAppError);
    }
    if (state.last_successful_blox_interaction_ts) {
        ctx.last_successful_blox_interaction_ts =
            state.last_successful_blox_interaction_ts;
    }
    return ctx;
}

function truncate(s: string, n: number): string {
    return s.length > n ? s.slice(0, n) : s;
}

function sanitizeAttempt(a: ConnectionAttempt): ConnectionAttempt {
    const out: ConnectionAttempt = {
        ts: a.ts,
        transport: a.transport,
        success: a.success,
    };
    if (a.target_blox_id) out.target_blox_id = truncate(a.target_blox_id, 128);
    if (a.error) out.error = truncate(a.error, 500);
    if (typeof a.duration_ms === 'number') {
        out.duration_ms = Math.max(0, Math.min(600000, Math.floor(a.duration_ms)));
    }
    return out;
}

function sanitizeNetworkChange(c: NetworkChange): NetworkChange {
    const out: NetworkChange = { ts: c.ts };
    if (c.from) out.from = truncate(c.from, 64);
    if (c.to) out.to = truncate(c.to, 64);
    return out;
}

function sanitizeAppError(e: AppError): AppError {
    const out: AppError = {
        ts: e.ts,
        error_summary: truncate(e.error_summary, 500),
    };
    if (e.screen) out.screen = truncate(e.screen, 64);
    return out;
}

function mapNetInfoType(t: string | undefined): NetInfoSummary['type'] {
    switch (t) {
        case 'wifi':
        case 'cellular':
        case 'ethernet':
        case 'none':
        case 'bluetooth':
        case 'wimax':
        case 'vpn':
            return t;
        default:
            return 'unknown';
    }
}

function mapCellularGen(g: string | undefined): NetInfoSummary['cellular_generation'] {
    if (g === '2g' || g === '3g' || g === '4g' || g === '5g') return g;
    return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────
// Test/dev helpers — clear all rings (used by jest tests + a dev menu item)
// ─────────────────────────────────────────────────────────────────────

export async function clearPhoneLogger(): Promise<void> {
    return enqueueWrite(() => ({ ...EMPTY_STATE }));
}
