/**
 * manualBloxIp — persistence for a user-typed Blox LAN IP, used as a
 * fallback when mDNS auto-discovery fails.
 *
 * Why this exists: the device IP is normally broadcast over mDNS by the
 * go-fula container. When go-fula is down (the very situation Blox AI is
 * being asked to diagnose), nothing broadcasts the IP and the only path
 * left is slow BLE. Letting the user type the IP they already know (from
 * their router, a sticker, an earlier session) restores the fast LAN-HTTP
 * path even with every other container down — blox-ai's own container is
 * all that's needed to answer on `http://<ip>:8083`.
 *
 * This module is deliberately DUMB:
 *   - It only reads/writes a string. It does NOT validate the IP (the
 *     RFC1918/link-local gate lives in `aiTransport.ipIsPrivateLan`, the
 *     single source of truth, applied by both the UI and the selector).
 *   - It imports nothing from the transport layer, so there's no circular
 *     import and the unit test mocks only AsyncStorage.
 *
 * Keyed per-blox (`<prefix>/<bloxPeerId>`) so a phone paired with several
 * bloxs keeps an independent manual IP for each.
 *
 * All failures are non-fatal: manual IP is a best-effort convenience, not
 * a correctness requirement. A storage error just means we fall back to
 * mDNS/BLE, same as if the user had never typed an IP.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@blox-ai/manual-ip/v1';

function keyFor(bloxPeerId: string): string {
    return `${KEY_PREFIX}/${bloxPeerId}`;
}

/**
 * Read the saved manual IP for a blox, or null if none stored (or the
 * peer id is empty, or AsyncStorage errors). Never throws.
 */
export async function loadManualBloxIp(bloxPeerId: string): Promise<string | null> {
    if (!bloxPeerId) return null;
    try {
        const raw = await AsyncStorage.getItem(keyFor(bloxPeerId));
        if (raw === null) return null;
        const trimmed = raw.trim();
        return trimmed.length > 0 ? trimmed : null;
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('manualBloxIp: getItem failed', e);
        return null;
    }
}

/**
 * Persist a manual IP for a blox. The caller is responsible for
 * validating the value (via `ipIsPrivateLan`) before saving — this
 * module stores whatever string it's handed (trimmed). An empty/blank
 * value clears the entry instead of writing a useless key. Never throws.
 */
export async function saveManualBloxIp(bloxPeerId: string, ip: string): Promise<void> {
    if (!bloxPeerId) return;
    const trimmed = (ip ?? '').trim();
    if (trimmed.length === 0) {
        await removeManualBloxIp(bloxPeerId);
        return;
    }
    try {
        await AsyncStorage.setItem(keyFor(bloxPeerId), trimmed);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('manualBloxIp: setItem failed', e);
    }
}

/**
 * Forget the manual IP for a blox (user tapped "Clear", or a saved IP
 * stopped working and they want auto-discovery back). Never throws.
 */
export async function removeManualBloxIp(bloxPeerId: string): Promise<void> {
    if (!bloxPeerId) return;
    try {
        await AsyncStorage.removeItem(keyFor(bloxPeerId));
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('manualBloxIp: removeItem failed', e);
    }
}
