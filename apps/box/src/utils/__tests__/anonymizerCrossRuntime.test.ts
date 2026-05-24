/**
 * Phase 21 cross-runtime drift gate (advisor catch).
 *
 * Half of a paired test. The other half lives at
 * fula-ai-training/server/tests/test_intake.py
 * ::test_canonical_js_anonymizer_output_is_accepted
 *
 * They share an identical fixture file
 * (canonical_js_anonymizer_output.json, present in both repos byte-for-byte).
 *
 * This side asserts: feeding a known input into the JS anonymizer produces
 * the fixture exactly. The Python side asserts: POSTing that fixture to
 * the FastAPI intake yields a 200.
 *
 * If the JS anonymizer changes its output shape, this test fails.
 * If the server schema tightens beyond what the fixture satisfies, the
 * Python test fails.
 *
 * Either failure tells you that the JS↔server contract has drifted and a
 * production transcript upload would 400 silently. Sync the fixture in
 * BOTH repos and re-run BOTH test suites when fixing.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { anonymizeTranscript, type RawTranscriptEvent } from '../anonymizeTranscript';

const fixture = JSON.parse(
    readFileSync(
        join(__dirname, 'fixtures', 'canonical_js_anonymizer_output.json'),
        'utf8',
    ),
);

const CANONICAL_UPLOAD_ID = '12345678-90ab-4cde-90ab-1234567890ab';
const CANONICAL_START_TS = '2026-05-23T10:00:00Z';

function canonicalInputEvents(): RawTranscriptEvent[] {
    return [
        {type: 'session_started', ts: CANONICAL_START_TS, payload: {}},
        {type: 'thought', ts: '2026-05-23T10:00:02Z',
         payload: 'checking discovery; saw peer at 10.0.0.5'},
        {type: 'tool_call', ts: '2026-05-23T10:00:03Z',
         payload: {tool: 'diag/internet', args: {}}},
        {type: 'tool_result', ts: '2026-05-23T10:00:05Z',
         payload: {dns_ok: true, https_discovery_ok: false}},
        {type: 'verdict', ts: '2026-05-23T10:00:10Z',
         payload: {summary: 'discovery unreachable', severity: 'yellow'}},
    ];
}

describe('cross-runtime drift gate', () => {
    test('JS anonymizer output matches the shared fixture byte-for-byte', () => {
        const produced = anonymizeTranscript({
            uploadId: CANONICAL_UPLOAD_ID,
            sessionStartTs: CANONICAL_START_TS,
            events: canonicalInputEvents(),
            rating: -1,
            comment: "didn't fix it; still offline",
        });
        expect(produced).toEqual(fixture);
    });
});
