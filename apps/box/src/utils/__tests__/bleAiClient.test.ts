/**
 * Plan A v2 — A0 BleAiClient tests.
 *
 * Focus: mirror the HttpAiClient test surface where it makes sense, plus
 * BLE-specific concerns (busy detection, stream-frame routing, lifecycle
 * invariant identical to HttpAiClient's).
 */

import { BleAiClient } from '../bleAiClient';
import { BleStreamTimeoutError } from '../ble';

// writeToBLEAndWaitForResponse signature is:
//   (cmd, peripheral, serviceUUID?, characteristicUUID?, timeout?, onStreamFrame?)
// The mock factory exposes a simpler shape — (cmd, onStreamFrame) — by
// pulling the 6th argument out of the jest.fn invocation. Tests don't
// care about serviceUUID/characteristicUUID/timeout.
function makeBleManager(behavior: {
    onWrite?: (cmd: string, onStreamFrame?: (frame: any) => void) => Promise<any>;
} = {}) {
    const onWrite = behavior.onWrite ?? (() => Promise.resolve({}));
    const writeToBLEAndWaitForResponse = jest.fn(
        (cmd: string, _peripheral?: string, _svc?: string, _char?: string, _timeout?: number, onStreamFrame?: (f: any) => void) => {
            return onWrite(cmd, onStreamFrame);
        }
    );
    return {
        writeToBLEAndWaitForResponse,
    } as any;
}

describe('BleAiClient — constructor validation', () => {
    test('rejects missing bleManager', () => {
        expect(() => new BleAiClient(null as any, 'periph')).toThrow(/bleManager/);
    });
    test('rejects missing peripheralId', () => {
        expect(() => new BleAiClient(makeBleManager(), '')).toThrow(/peripheralId/);
    });
});

describe('BleAiClient.health()', () => {
    test('ok=true when ai/status command resolves', async () => {
        const mgr = makeBleManager({ onWrite: () => Promise.resolve({}) });
        const c = new BleAiClient(mgr, 'periph');
        const r = await c.health();
        expect(r.ok).toBe(true);
        // Latency may be 0 in fast test environments; allow >= 0.
        expect(r.latencyMs).toBeGreaterThanOrEqual(0);
    });

    test('ok=false when ai/status command rejects', async () => {
        const mgr = makeBleManager({ onWrite: () => Promise.reject(new Error('no peer')) });
        const c = new BleAiClient(mgr, 'periph');
        const r = await c.health();
        expect(r.ok).toBe(false);
    });
});

describe('BleAiClient.runAi — stream frame routing + lifecycle', () => {
    test('onEvent fires for each parsed stream frame', async () => {
        // Capture the onStreamFrame callback so the test can drive it
        // synchronously like the BLE assembler does.
        let captured: ((frame: any) => void) | undefined;
        const mgr = makeBleManager({
            onWrite: (_cmd, onStreamFrame) => {
                captured = onStreamFrame;
                // Resolve eventually so onComplete fires (after the
                // synchronous frame deliveries).
                return Promise.resolve({});
            },
        });
        const c = new BleAiClient(mgr, 'periph');
        const onEvent = jest.fn();
        const onComplete = jest.fn();
        const onError = jest.fn();

        c.runAi('hi', undefined, { onEvent, onComplete, onError });

        // Simulate frames arriving from the BLE assembler.
        captured!({ type: 'session_started', session_id: 'sess-1', protocol_version: 3 });
        captured!({ type: 'thought', payload: 'thinking…' });
        captured!({ type: 'verdict', payload: { summary: 'ok', severity: 'green' } });

        // Wait one microtask for the resolved write promise.
        await Promise.resolve();
        await Promise.resolve();

        expect(onEvent).toHaveBeenCalledTimes(3);
        expect(onEvent.mock.calls[0][0].type).toBe('session_started');
        expect(onEvent.mock.calls[1][0].type).toBe('thought');
        expect(onEvent.mock.calls[2][0].type).toBe('verdict');
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(onError).not.toHaveBeenCalled();
    });

    test('updates sessionId from session_started event', async () => {
        let captured: ((frame: any) => void) | undefined;
        const mgr = makeBleManager({
            onWrite: (_cmd, onStreamFrame) => {
                captured = onStreamFrame;
                return new Promise(() => { /* never resolve in this test */ });
            },
        });
        const c = new BleAiClient(mgr, 'periph');
        const session = c.runAi('hi', undefined, {
            onEvent: jest.fn(), onComplete: jest.fn(), onError: jest.fn(),
        });

        expect(session.sessionId).toBe('');
        captured!({ type: 'session_started', session_id: 'sess-99', protocol_version: 3 });
        expect(session.sessionId).toBe('sess-99');
    });

    test('"Another command is in progress" → ble-busy error (not transient)', async () => {
        const mgr = makeBleManager({
            onWrite: () => Promise.reject(new Error('Another command is in progress')),
        });
        const c = new BleAiClient(mgr, 'periph');
        const onError = jest.fn();
        const onComplete = jest.fn();
        c.runAi('hi', undefined, { onEvent: jest.fn(), onComplete, onError });

        await new Promise(res => setTimeout(res, 5));

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'http-busy', transient: false }),
        );
        expect(onComplete).not.toHaveBeenCalled();
    });

    test('BleStreamTimeoutError → network error (transient)', async () => {
        const mgr = makeBleManager({
            onWrite: () => Promise.reject(new BleStreamTimeoutError('timeout', [])),
        });
        const c = new BleAiClient(mgr, 'periph');
        const onError = jest.fn();
        c.runAi('hi', undefined, { onEvent: jest.fn(), onError });

        await new Promise(res => setTimeout(res, 5));

        expect(onError).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'network', transient: true }),
        );
    });

    test('cancel() prevents onError + onComplete from firing afterwards', async () => {
        let resolveWrite: (v?: any) => void = () => {};
        const mgr = makeBleManager({
            onWrite: () => new Promise((res) => { resolveWrite = res; }),
        });
        const c = new BleAiClient(mgr, 'periph');
        const onError = jest.fn();
        const onComplete = jest.fn();
        const session = c.runAi('hi', undefined, { onEvent: jest.fn(), onComplete, onError });

        session.cancel();
        // Now resolve the underlying write — onComplete should NOT fire
        // because closed was set in cancel().
        resolveWrite();
        await new Promise(res => setTimeout(res, 5));

        expect(onComplete).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
    });
});

describe('BleAiClient.userReply / phoneContext', () => {
    test('userReply resolves on success', async () => {
        const mgr = makeBleManager({ onWrite: () => Promise.resolve({}) });
        const c = new BleAiClient(mgr, 'periph');
        await expect(c.userReply('s', 'q', 'r')).resolves.toBeUndefined();
    });

    test('userReply rejects with ble-busy when channel is in use', async () => {
        const mgr = makeBleManager({
            onWrite: () => Promise.reject(new Error('Another command is in progress')),
        });
        const c = new BleAiClient(mgr, 'periph');
        await expect(c.userReply('s', 'q', 'r')).rejects.toMatchObject({
            kind: 'http-busy',
            transient: false,
        });
    });

    test('phoneContext rejects with network on generic BLE failure', async () => {
        const mgr = makeBleManager({
            onWrite: () => Promise.reject(new Error('connection lost')),
        });
        const c = new BleAiClient(mgr, 'periph');
        await expect(c.phoneContext('s', { foo: 1 })).rejects.toMatchObject({
            kind: 'network',
            transient: true,
        });
    });
});

describe('BleAiClient.executeAction', () => {
    test('successful execution_result payload', async () => {
        const mgr = makeBleManager({
            onWrite: () => Promise.resolve({
                type: 'execution_result',
                action_id: 'a1',
                success: true,
                duration_ms: 200,
            }),
        });
        const c = new BleAiClient(mgr, 'periph');
        const r = await c.executeAction({ action_id: 'a1', approval_token: 'tok' });
        expect(r.ok).toBe(true);
        expect(r.payload?.success).toBe(true);
    });

    test('handles JSON-string response from BLE assembler', async () => {
        const mgr = makeBleManager({
            onWrite: () => Promise.resolve(JSON.stringify({
                type: 'execution_result',
                action_id: 'a1',
                success: true,
                duration_ms: 100,
            })),
        });
        const c = new BleAiClient(mgr, 'periph');
        const r = await c.executeAction({ action_id: 'a1', approval_token: 'tok' });
        expect(r.ok).toBe(true);
    });

    test('busy channel → ble-busy', async () => {
        const mgr = makeBleManager({
            onWrite: () => Promise.reject(new Error('Another command is in progress')),
        });
        const c = new BleAiClient(mgr, 'periph');
        const r = await c.executeAction({ action_id: 'a1', approval_token: 'tok' });
        expect(r.ok).toBe(false);
        expect(r.error?.kind).toBe('http-busy');
        expect(r.error?.transient).toBe(false);
    });

    test('malformed response → sse-malformed', async () => {
        const mgr = makeBleManager({ onWrite: () => Promise.resolve('not-execution-result') });
        const c = new BleAiClient(mgr, 'periph');
        const r = await c.executeAction({ action_id: 'a1', approval_token: 'tok' });
        expect(r.ok).toBe(false);
        expect(r.error?.kind).toBe('sse-malformed');
    });

    test('includes security_code only when provided', async () => {
        const writes: string[] = [];
        const mgr = makeBleManager({
            onWrite: (cmd) => {
                writes.push(cmd);
                return Promise.resolve({ type: 'execution_result', action_id: 'a1', success: true, duration_ms: 0 });
            },
        });
        const c = new BleAiClient(mgr, 'periph');
        await c.executeAction({ action_id: 'a1', approval_token: 'tok' });
        await c.executeAction({ action_id: 'a2', approval_token: 'tok' }, '1234');

        const args0 = JSON.parse(writes[0]).args;
        const args1 = JSON.parse(writes[1]).args;
        expect(args0.security_code).toBeUndefined();
        expect(args1.security_code).toBe('1234');
    });
});

describe('BleAiClient.cancel — best-effort swallows errors', () => {
    test('does not throw when underlying write fails', async () => {
        const mgr = makeBleManager({ onWrite: () => Promise.reject(new Error('boom')) });
        const c = new BleAiClient(mgr, 'periph');
        await expect(c.cancel('s')).resolves.toBeUndefined();
    });
});
