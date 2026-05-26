/**
 * Tests for the Phase 5 ble_stream extension to src/utils/ble.ts.
 *
 * Covers:
 *  - Backward compat: ble_header + ble_chunk still work (no regression)
 *  - Single-frame stream: one ble_stream with final=true → resolves promise
 *    with {frames, final}, callback invoked once
 *  - Multi-frame stream: ordered frames, callback invoked per frame, promise
 *    resolves on final=true with the full accumulated list
 *  - Frame payload JSON-parsing: data field is a JSON string → caller sees
 *    parsed object, not nested-stringified JSON
 *  - Per-command isolation: leftover stream state from a prior command does
 *    NOT bleed into a new command (cleanupCommand resets it)
 *  - Callback exception safety: bad callback can't kill the stream
 *  - Stream WITHOUT a callback: frames still accumulate, promise resolves
 *
 * Tests bypass the BLE listener wiring and invoke handleResponse directly
 * with simulated frame JSON. That isolates the parsing/resolution logic
 * from BLE-stack mocking.
 */

// react-native-ble-manager + react-native-permissions are auto-mocked via
// jest.config.js moduleNameMapper → src/__tests__/mocks/react-native.js.
// That mock has BleManager methods at the top level (onDidUpdate..., write,
// startNotification, etc.) so `import BleManager from 'react-native-ble-manager'`
// resolves to the mock object.
import { ResponseAssembler, BleStreamTimeoutError } from '../ble';

describe('ResponseAssembler.ble_stream', () => {
    let assembler: ResponseAssembler;

    beforeEach(() => {
        assembler = new ResponseAssembler();
    });

    afterEach(() => {
        assembler.cleanup();
    });

    function setupCommandWithResolver(): {
        promise: Promise<any>;
        callbackFrames: any[];
    } {
        // Manually wire the command state so handleResponse has somewhere to
        // resolve to (writeToBLEAndWaitForResponse does this normally; we
        // bypass it for the pure handleResponse test).
        const callbackFrames: any[] = [];
        const promise = new Promise<any>((resolve) => {
            // Access private internals via the cast — these are exactly the
            // fields writeToBLEAndWaitForResponse sets up.
            (assembler as any).currentCommand = 'test-cmd';
            (assembler as any).commandResolve = resolve;
            (assembler as any).onStreamFrame = (f: any) => {
                callbackFrames.push(f);
            };
        });
        return { promise, callbackFrames };
    }

    // ─────────────── single-frame stream ───────────────
    test('single-frame stream resolves on final=true', async () => {
        const { promise, callbackFrames } = setupCommandWithResolver();
        await assembler.handleResponse(JSON.stringify({
            type: 'ble_stream',
            index: 0,
            data: JSON.stringify({ event: 'hello', token: 'world' }),
            final: true,
        }));
        const result = await promise;
        expect(result).toEqual({
            frames: [{ event: 'hello', token: 'world' }],
            final: { event: 'hello', token: 'world' },
        });
        expect(callbackFrames).toHaveLength(1);
        expect(callbackFrames[0]).toEqual({ event: 'hello', token: 'world' });
    });

    // ─────────────── multi-frame stream ───────────────
    test('multi-frame stream invokes callback per frame and resolves on final', async () => {
        const { promise, callbackFrames } = setupCommandWithResolver();
        for (let i = 0; i < 3; i++) {
            await assembler.handleResponse(JSON.stringify({
                type: 'ble_stream',
                index: i,
                data: JSON.stringify({ tok: i }),
                final: false,
            }));
        }
        // Final frame
        await assembler.handleResponse(JSON.stringify({
            type: 'ble_stream',
            index: 3,
            data: JSON.stringify({ done: true }),
            final: true,
        }));
        const result = await promise;
        expect(result.frames).toEqual([
            { tok: 0 }, { tok: 1 }, { tok: 2 }, { done: true },
        ]);
        expect(result.final).toEqual({ done: true });
        expect(callbackFrames).toHaveLength(4);
        expect(callbackFrames[0]).toEqual({ tok: 0 });
        expect(callbackFrames[3]).toEqual({ done: true });
    });

    // ─────────────── frame data is a non-JSON string ───────────────
    test('frame data that is not JSON is delivered as-is (string)', async () => {
        const { promise, callbackFrames } = setupCommandWithResolver();
        await assembler.handleResponse(JSON.stringify({
            type: 'ble_stream',
            index: 0,
            data: 'plain text token',
            final: true,
        }));
        const result = await promise;
        expect(result.final).toBe('plain text token');
        expect(callbackFrames[0]).toBe('plain text token');
    });

    // ─────────────── per-command isolation ───────────────
    test('stream state does not bleed across commands (cleanupCommand resets)', async () => {
        // First command: 2 frames, no final — leave stream half-finished
        const { callbackFrames: framesA } = setupCommandWithResolver();
        await assembler.handleResponse(JSON.stringify({
            type: 'ble_stream', index: 0, data: '"a"', final: false,
        }));
        await assembler.handleResponse(JSON.stringify({
            type: 'ble_stream', index: 1, data: '"b"', final: false,
        }));
        expect(framesA).toHaveLength(2);
        // Internal: streamFrames has 2 entries, isStreaming=true
        expect((assembler as any).streamFrames).toHaveLength(2);
        expect((assembler as any).isStreaming).toBe(true);

        // Simulate the writeToBLEAndWaitForResponse `finally` block resetting
        // command state (e.g., a timeout fired)
        (assembler as any).cleanupCommand();

        // Stream state must be wiped clean
        expect((assembler as any).streamFrames).toEqual([]);
        expect((assembler as any).isStreaming).toBe(false);
        expect((assembler as any).onStreamFrame).toBeNull();

        // Second command: a single-frame stream — must start with frames=[c]
        // not [a, b, c]
        const { promise: pB, callbackFrames: framesB } = setupCommandWithResolver();
        await assembler.handleResponse(JSON.stringify({
            type: 'ble_stream', index: 0, data: '"c"', final: true,
        }));
        const result = await pB;
        expect(result.frames).toEqual(['c']);
        expect(framesB).toEqual(['c']);
    });

    // ─────────────── callback exception safety ───────────────
    test('callback throwing does not kill the stream or unhandle errors', async () => {
        const promise = new Promise<any>((resolve) => {
            (assembler as any).currentCommand = 'test';
            (assembler as any).commandResolve = resolve;
            (assembler as any).onStreamFrame = () => {
                throw new Error('user code blew up');
            };
        });
        // Should not throw out of handleResponse
        await expect(assembler.handleResponse(JSON.stringify({
            type: 'ble_stream', index: 0, data: '"x"', final: true,
        }))).resolves.not.toThrow();
        const result = await promise;
        expect(result.final).toBe('x');
    });

    // ─────────────── stream without callback ───────────────
    test('stream without onStreamFrame still accumulates and resolves', async () => {
        const promise = new Promise<any>((resolve) => {
            (assembler as any).currentCommand = 'test';
            (assembler as any).commandResolve = resolve;
            (assembler as any).onStreamFrame = null;
        });
        await assembler.handleResponse(JSON.stringify({
            type: 'ble_stream', index: 0, data: '{"n":1}', final: false,
        }));
        await assembler.handleResponse(JSON.stringify({
            type: 'ble_stream', index: 1, data: '{"n":2}', final: true,
        }));
        const result = await promise;
        expect(result.frames).toEqual([{ n: 1 }, { n: 2 }]);
        expect(result.final).toEqual({ n: 2 });
    });

    // ─────────────── timeout-with-partial-frames (advisor consensus) ───────────────
    test('BleStreamTimeoutError carries the partial frames that arrived', () => {
        // Pure unit test on the error class — full integration with the
        // timeout path requires mocking writeToBLEAndWaitForResponse end to
        // end (BleManager.write + retrieveServices + startNotification),
        // which is heavy. The contract that matters: `partialFrames` is
        // surfaced and instanceof checks work for downstream consumers.
        const err = new BleStreamTimeoutError('test', [{ a: 1 }, { b: 2 }]);
        expect(err).toBeInstanceOf(BleStreamTimeoutError);
        expect(err).toBeInstanceOf(Error);
        expect(err.partialFrames).toEqual([{ a: 1 }, { b: 2 }]);
        expect(err.name).toBe('BleStreamTimeoutError');
        expect(err.message).toBe('test');
    });

    // ─────────────── malformed frame doesn't hang the stream ───────────────
    test('malformed JSON in a frame does not hang or throw out of handleResponse', async () => {
        const { promise, callbackFrames } = setupCommandWithResolver();
        // Send something that's not valid JSON at all — handleResponse's
        // top-level try/catch should swallow and return value as-is (legacy
        // behavior). The command promise stays pending; no callback fires.
        const r = await assembler.handleResponse('not-json-at-all');
        expect(r).toBe('not-json-at-all');
        expect(callbackFrames).toHaveLength(0);

        // Now finish the stream legitimately — the promise should still
        // resolve, proving the malformed frame didn't poison the assembler.
        await assembler.handleResponse(JSON.stringify({
            type: 'ble_stream', index: 0, data: '"recovered"', final: true,
        }));
        const result = await promise;
        expect(result.final).toBe('recovered');
    });

    // ─────────────── backward compat: ble_header + ble_chunk ───────────────
    test('legacy ble_header + ble_chunk path still works (no regression)', async () => {
        // The legacy path uses its own responsePromise / resolveResponse
        // setup INSIDE handleResponse (distinct from the command-level
        // resolver used by streams). handleResponse(ble_header) RETURNS a
        // Promise that only resolves once all chunks have arrived. We
        // must capture that promise WITHOUT awaiting it (awaiting now
        // would hang forever), send the chunks, then await it.
        const resultPromise = assembler.handleResponse(JSON.stringify({
            type: 'ble_header', chunks: 2,
        }));

        // Chunk-handling calls also return promises, but those resolve
        // synchronously to `null` since the per-chunk path doesn't await
        // anything. Still safe to await them in sequence.
        await assembler.handleResponse(JSON.stringify({
            type: 'ble_chunk', index: 0, data: '{"hel',
        }));
        await assembler.handleResponse(JSON.stringify({
            type: 'ble_chunk', index: 1, data: 'lo":1}',
        }));

        const result = await resultPromise;
        expect(result).toEqual({ hello: 1 });
    });
});
