/**
 * Phase 12 tests for phoneLogger.ts — ring buffers, NetInfo subscriber,
 * gatherContext shape matching fula-ota's phone_context.schema.json (v1).
 */
import * as AsyncStorageModule from '@react-native-async-storage/async-storage';
import {
    recordConnectionAttempt,
    recordNetworkChange,
    recordAppError,
    gatherContext,
    clearPhoneLogger,
    installNetInfoLogger,
} from '../phoneLogger';

const AsyncStorage = AsyncStorageModule.default;
const resetStore = (AsyncStorageModule as any).__resetStore;

beforeEach(async () => {
    resetStore();
    jest.clearAllMocks();
    await clearPhoneLogger();
});

describe('phoneLogger ring buffers', () => {
    test('connection_attempts caps at 20 (FIFO drop)', async () => {
        for (let i = 0; i < 25; i++) {
            await recordConnectionAttempt({
                ts: `2026-05-24T07:${String(i).padStart(2, '0')}:00Z`,
                transport: 'libp2p',
                success: i % 2 === 0,
            });
        }
        const ctx = await gatherContext();
        expect(ctx.recent_connection_attempts).toHaveLength(20);
        // Oldest entries (0..4) dropped; first remaining is index 5
        expect(ctx.recent_connection_attempts![0].ts).toBe('2026-05-24T07:05:00Z');
        expect(ctx.recent_connection_attempts![19].ts).toBe('2026-05-24T07:24:00Z');
    });

    test('network_changes caps at 10', async () => {
        for (let i = 0; i < 15; i++) {
            await recordNetworkChange({
                ts: `2026-05-24T07:${String(i).padStart(2, '0')}:00Z`,
                from: `prev-${i}`,
                to: `cur-${i}`,
            });
        }
        const ctx = await gatherContext();
        expect(ctx.recent_network_changes).toHaveLength(10);
        expect(ctx.recent_network_changes![0].from).toBe('prev-5');
    });

    test('app_errors caps at 10', async () => {
        for (let i = 0; i < 12; i++) {
            await recordAppError({
                ts: `2026-05-24T07:${String(i).padStart(2, '0')}:00Z`,
                screen: 'Diagnostics',
                error_summary: `error ${i}`,
            });
        }
        const ctx = await gatherContext();
        expect(ctx.recent_app_errors).toHaveLength(10);
        expect(ctx.recent_app_errors![0].error_summary).toBe('error 2');
    });

    test('last_successful_blox_interaction_ts tracks only successful attempts', async () => {
        await recordConnectionAttempt({
            ts: '2026-05-24T07:00:00Z', transport: 'libp2p', success: false,
        });
        await recordConnectionAttempt({
            ts: '2026-05-24T07:05:00Z', transport: 'libp2p', success: true,
        });
        await recordConnectionAttempt({
            ts: '2026-05-24T07:10:00Z', transport: 'libp2p', success: false,
        });
        const ctx = await gatherContext();
        expect(ctx.last_successful_blox_interaction_ts).toBe('2026-05-24T07:05:00Z');
    });
});

describe('phoneLogger sanitization (caps in gatherContext)', () => {
    test('connection_attempt.target_blox_id truncated to 128 chars', async () => {
        await recordConnectionAttempt({
            ts: '2026-05-24T07:00:00Z',
            transport: 'libp2p',
            success: false,
            target_blox_id: 'A'.repeat(500),
        });
        const ctx = await gatherContext();
        expect(ctx.recent_connection_attempts![0].target_blox_id!.length).toBe(128);
    });

    test('connection_attempt.error truncated to 500 chars', async () => {
        await recordConnectionAttempt({
            ts: '2026-05-24T07:00:00Z',
            transport: 'libp2p',
            success: false,
            error: 'X'.repeat(1000),
        });
        const ctx = await gatherContext();
        expect(ctx.recent_connection_attempts![0].error!.length).toBe(500);
    });

    test('connection_attempt.duration_ms clamped to [0, 600000]', async () => {
        await recordConnectionAttempt({
            ts: '2026-05-24T07:00:00Z',
            transport: 'libp2p',
            success: false,
            duration_ms: 9999999,
        });
        const ctx = await gatherContext();
        expect(ctx.recent_connection_attempts![0].duration_ms).toBe(600000);
    });

    test('network_change.from/to truncated to 64 chars', async () => {
        await recordNetworkChange({
            ts: '2026-05-24T07:00:00Z',
            from: 'a'.repeat(100),
            to: 'b'.repeat(100),
        });
        const ctx = await gatherContext();
        expect(ctx.recent_network_changes![0].from!.length).toBe(64);
        expect(ctx.recent_network_changes![0].to!.length).toBe(64);
    });

    test('app_error.error_summary truncated to 500 chars', async () => {
        await recordAppError({
            ts: '2026-05-24T07:00:00Z',
            error_summary: 'Z'.repeat(1000),
        });
        const ctx = await gatherContext();
        expect(ctx.recent_app_errors![0].error_summary.length).toBe(500);
    });
});

describe('phoneLogger.gatherContext shape', () => {
    test('returns minimal valid context when no data', async () => {
        const ctx = await gatherContext();
        // Required by phone_context.schema.json
        expect(ctx).toHaveProperty('app_version');
        expect(ctx).toHaveProperty('os');
        expect(ctx).toHaveProperty('os_version');
        expect(['android', 'ios']).toContain(ctx.os);
        // Optional arrays absent when empty (don't waste bytes)
        expect(ctx.recent_connection_attempts).toBeUndefined();
        expect(ctx.recent_network_changes).toBeUndefined();
        expect(ctx.recent_app_errors).toBeUndefined();
    });

    test('netinfo populated from NetInfo.fetch', async () => {
        // Default mock returns {isConnected: true, type: 'wifi'}
        const ctx = await gatherContext();
        expect(ctx.netinfo).toBeDefined();
        expect(ctx.netinfo!.is_connected).toBe(true);
        expect(ctx.netinfo!.type).toBe('wifi');
    });

    test('clearPhoneLogger empties all rings', async () => {
        await recordConnectionAttempt({
            ts: '2026-05-24T07:00:00Z', transport: 'libp2p', success: true,
        });
        await recordNetworkChange({ ts: '2026-05-24T07:00:00Z' });
        await recordAppError({
            ts: '2026-05-24T07:00:00Z', error_summary: 'x',
        });

        await clearPhoneLogger();
        const ctx = await gatherContext();
        expect(ctx.recent_connection_attempts).toBeUndefined();
        expect(ctx.recent_network_changes).toBeUndefined();
        expect(ctx.recent_app_errors).toBeUndefined();
        expect(ctx.last_successful_blox_interaction_ts).toBeUndefined();
    });
});

describe('installNetInfoLogger', () => {
    test('idempotent — second install does not double-subscribe', () => {
        const NetInfo = require('@react-native-community/netinfo').default;
        NetInfo.addEventListener.mockClear();
        const unsub1 = installNetInfoLogger();
        const unsub2 = installNetInfoLogger();
        expect(typeof unsub1).toBe('function');
        expect(typeof unsub2).toBe('function');
        // ONE subscription call across both installs
        expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
        unsub1();
    });
});
