/**
 * Phase 21 — on-device anonymizer tests.
 *
 * Coverage:
 *   - String-level: each PII pattern stripped to its sentinel.
 *   - Object walk: nested values, arrays, SSID/BSSID by-key replacement.
 *   - Top-level: schema-shape contract, tripwires, comment normalization.
 *   - Idempotency: anonymize(anonymize(x)) === anonymize(x).
 *   - Output passes the Phase 20 server's defense-in-depth scanner.
 *     (Re-implemented here as a TypeScript mirror — synced with
 *     fula-ai-training/server/anonymization_check.py.)
 *
 * Per the parent plan, anonymization correctness is privacy-critical.
 * We err toward false-positive matches (rejecting a clean string that
 * looked like an IP) rather than letting a real IP through.
 */
import {
    ANONYMIZER_VERSION,
    AnonymizerError,
    anonymizeString,
    anonymizeTranscript,
    anonymizeValue,
    toRelativeTs,
    type RawTranscriptEvent,
} from '../anonymizeTranscript';

// ---------------------------------------------------------------------------
// String-level pattern coverage
// ---------------------------------------------------------------------------

describe('anonymizeString — IPv4', () => {
    test('replaces single IPv4 with <IP>', () => {
        expect(anonymizeString('saw 192.168.1.55')).toBe('saw <IP>');
    });
    test('replaces multiple IPv4 occurrences', () => {
        expect(anonymizeString('peer 10.0.0.1 talked to 10.0.0.2')).toBe(
            'peer <IP> talked to <IP>',
        );
    });
    test('does not match strings that lack 4 octets', () => {
        // No IPv4 substitution; though the ISO-TS regex won't fire either
        // (no `T` + time), so 1.2.3 stays intact.
        expect(anonymizeString('version 1.2.3 release')).toBe('version 1.2.3 release');
    });
    test('does not match obviously-out-of-range octets', () => {
        expect(anonymizeString('999.999.999.999')).toBe('999.999.999.999');
    });
});

describe('anonymizeString — IPv6', () => {
    test('replaces compressed IPv6', () => {
        expect(anonymizeString('peer fe80::1ff:fe23:4567:890a')).toBe(
            'peer <IP>',
        );
    });
    test('replaces full IPv6', () => {
        expect(anonymizeString('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(
            '<IP>',
        );
    });
});

describe('anonymizeString — peerIds + CIDs', () => {
    test('replaces libp2p peerId', () => {
        const s = 'connected to 12D3KooWBLAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        expect(anonymizeString(s)).toBe('connected to <PEERID>');
    });
    test('replaces legacy IPFS CID / peerId', () => {
        const s = 'fetched QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
        expect(anonymizeString(s)).toBe('fetched <CID>');
    });
});

describe('anonymizeString — home directory', () => {
    test('strips Linux username from /home/X path', () => {
        expect(anonymizeString('reading /home/ehsan/.fula/config')).toBe(
            'reading /home/<USER>/.fula/config',
        );
    });
    test('strips macOS username from /Users/X path', () => {
        expect(anonymizeString('writing /Users/alice/Documents/x.txt')).toBe(
            'writing /Users/<USER>/Documents/x.txt',
        );
    });
    test('leaves already-anonymized path alone (idempotent)', () => {
        expect(anonymizeString('/home/<USER>/.fula')).toBe('/home/<USER>/.fula');
    });
});

describe('anonymizeString — BSSID (MAC)', () => {
    test('replaces colon-separated MAC', () => {
        expect(anonymizeString('AP de:ad:be:ef:12:34')).toBe('AP <BSSID>');
    });
    test('replaces dash-separated MAC', () => {
        expect(anonymizeString('AP DE-AD-BE-EF-12-34')).toBe('AP <BSSID>');
    });
});

describe('anonymizeString — wall-clock timestamps', () => {
    test('strips a Z-suffixed ISO timestamp', () => {
        expect(anonymizeString('happened at 2026-05-23T12:34:56Z')).toBe(
            'happened at <TS>',
        );
    });
    test('strips a timestamp with numeric offset', () => {
        expect(anonymizeString('2026-05-23T12:34:56+02:00 saw error')).toBe(
            '<TS> saw error',
        );
    });
    test('strips a timestamp with fractional seconds', () => {
        expect(anonymizeString('2026-05-23T12:34:56.789Z')).toBe('<TS>');
    });
});

describe('anonymizeString — SSID by inline hint', () => {
    test('replaces value after ssid: hint', () => {
        const out = anonymizeString('ssid: HomeWifi5GHz');
        expect(out).toBe('ssid: <SSID>');
    });
    test('replaces value after SSID= hint', () => {
        expect(anonymizeString('SSID=CafeFreeWifi')).toBe('SSID=<SSID>');
    });
});

describe('anonymizeString — combined patterns', () => {
    test('handles multiple PII categories in one string', () => {
        const s = 'peer 12D3KooWBLAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@10.0.0.5 ssid: MyWifi at 2026-05-23T12:34:56Z';
        const out = anonymizeString(s);
        expect(out).not.toMatch(/12D3KooW/);
        expect(out).not.toMatch(/10\.0\.0\.5/);
        expect(out).not.toMatch(/MyWifi/);
        expect(out).not.toMatch(/2026-05-23T12:34:56Z/);
    });
    test('is idempotent', () => {
        const s = 'peer 12D3KooWBLAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa at 192.168.1.1';
        expect(anonymizeString(anonymizeString(s))).toBe(anonymizeString(s));
    });
});

// ---------------------------------------------------------------------------
// Recursive value walker
// ---------------------------------------------------------------------------

describe('anonymizeValue — recursive walk', () => {
    test('walks nested objects', () => {
        const v = {
            outer: {inner: {ip: '10.0.0.1', text: 'fine'}},
        };
        const o = anonymizeValue(v) as any;
        expect(o.outer.inner.ip).toBe('<IP>');
        expect(o.outer.inner.text).toBe('fine');
    });
    test('walks arrays', () => {
        const out = anonymizeValue(['10.0.0.1', '10.0.0.2', 'clean']) as string[];
        expect(out).toEqual(['<IP>', '<IP>', 'clean']);
    });
    test('SSID-named keys get value-replaced regardless of pattern', () => {
        const v = {wifi_ssid: 'NotAnObviousSSID'};
        expect(anonymizeValue(v)).toEqual({wifi_ssid: '<SSID>'});
    });
    test('BSSID-named keys get value-replaced', () => {
        const v = {wifi_bssid: 'whatever-string-here'};
        expect(anonymizeValue(v)).toEqual({wifi_bssid: '<BSSID>'});
    });
    test('numeric / boolean / null pass through', () => {
        expect(anonymizeValue(42)).toBe(42);
        expect(anonymizeValue(true)).toBe(true);
        expect(anonymizeValue(null)).toBe(null);
    });
    test('does not mutate input', () => {
        const original = {ip: '10.0.0.1'};
        anonymizeValue(original);
        expect(original.ip).toBe('10.0.0.1');
    });
});

// ---------------------------------------------------------------------------
// Relative timestamp conversion
// ---------------------------------------------------------------------------

describe('toRelativeTs', () => {
    const start = Date.parse('2026-05-23T10:00:00Z');

    test('returns +0s for input equal to session start', () => {
        expect(toRelativeTs('2026-05-23T10:00:00Z', start)).toBe('+0s');
    });
    test('returns +Ns for later input', () => {
        expect(toRelativeTs('2026-05-23T10:00:12Z', start)).toBe('+12s');
        expect(toRelativeTs('2026-05-23T10:01:00Z', start)).toBe('+60s');
    });
    test('returns +0s for earlier input (clock skew safety)', () => {
        expect(toRelativeTs('2026-05-23T09:00:00Z', start)).toBe('+0s');
    });
    test('returns +0s for unparseable input (never leaks raw ts)', () => {
        expect(toRelativeTs('not-a-timestamp', start)).toBe('+0s');
        expect(toRelativeTs('', start)).toBe('+0s');
    });
});

// ---------------------------------------------------------------------------
// Top-level transcript shaping + schema contract
// ---------------------------------------------------------------------------

const VALID_UUID = '12345678-90ab-4cde-90ab-1234567890ab';
const START_TS = '2026-05-23T10:00:00Z';

function makeRawEvents(): RawTranscriptEvent[] {
    return [
        {type: 'session_started', ts: START_TS, payload: {}},
        {type: 'thought', ts: '2026-05-23T10:00:02Z',
         payload: 'checking discovery'},
        {type: 'tool_call', ts: '2026-05-23T10:00:03Z',
         payload: {tool: 'diag/internet', args: {}}},
        {type: 'verdict', ts: '2026-05-23T10:00:10Z',
         payload: {summary: 'all clear', severity: 'green'}},
    ];
}

describe('anonymizeTranscript — happy path', () => {
    test('returns a schema-shaped object with tripwire fields', () => {
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: makeRawEvents(),
            rating: 1,
        });
        expect(out.schema_version).toBe(1);
        expect(out.upload_id).toBe(VALID_UUID);
        expect(out.session_relative_start).toBe('+0s');
        expect(out.consent.explicit_opt_in).toBe(true);
        expect(out.consent.preview_shown).toBe(true);
        expect(out.consent.anonymizer_version).toBe(ANONYMIZER_VERSION);
        expect(out.user_rating).toBe(1);
        expect(out.device_class).toBe('rk3588');
        expect(out.events).toHaveLength(4);
        expect(out.events[0].relative_ts).toBe('+0s');
        expect(out.events[1].relative_ts).toBe('+2s');
        expect(out.events[3].relative_ts).toBe('+10s');
    });

    test('preserves event ordering', () => {
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: makeRawEvents(),
            rating: 0,
        });
        expect(out.events.map((e) => e.type)).toEqual([
            'session_started', 'thought', 'tool_call', 'verdict',
        ]);
    });

    test('sanitizes a comment field', () => {
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: makeRawEvents(),
            rating: -1,
            comment: 'still offline; peer at 10.0.0.5',
        });
        expect(out.user_comment).toBe('still offline; peer at <IP>');
    });

    test('omits comment when empty after sanitization', () => {
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: makeRawEvents(),
            rating: 0,
            comment: '   ',
        });
        expect(out).not.toHaveProperty('user_comment');
    });

    test('strips CR/LF from comment (log-injection defense)', () => {
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: makeRawEvents(),
            rating: -1,
            comment: 'line1\nline2\r\nline3',
        });
        expect(out.user_comment).not.toMatch(/[\r\n]/);
    });

    test('emits canonical user_prompt unchanged (no PII to strip)', () => {
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: makeRawEvents(),
            rating: 0,
            userPrompt: 'My Blox is showing as disconnected in the app.',
            scenarioId: 'disconnected',
        });
        expect(out.user_prompt).toBe(
            'My Blox is showing as disconnected in the app.',
        );
        expect(out.scenario_id).toBe('disconnected');
    });

    test('sanitizes PII from freeform user_prompt', () => {
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: makeRawEvents(),
            rating: 0,
            userPrompt: 'My blox at 192.168.1.55 keeps dropping the relay',
            scenarioId: 'freeform',
        });
        expect(out.user_prompt).toBe(
            'My blox at <IP> keeps dropping the relay',
        );
        expect(out.scenario_id).toBe('freeform');
    });

    test('omits user_prompt when not supplied (backward compat)', () => {
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: makeRawEvents(),
            rating: 1,
        });
        expect(out).not.toHaveProperty('user_prompt');
        expect(out).not.toHaveProperty('scenario_id');
    });

    test('drops scenario_id that is not in the closed enum', () => {
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: makeRawEvents(),
            rating: 0,
            // @ts-expect-error — deliberately testing invalid runtime input
            scenarioId: 'not-an-enum-value',
        });
        expect(out).not.toHaveProperty('scenario_id');
    });
});

describe('anonymizeTranscript — input validation', () => {
    test('rejects malformed UUID', () => {
        expect(() =>
            anonymizeTranscript({
                uploadId: 'not-a-uuid',
                sessionStartTs: START_TS,
                events: makeRawEvents(),
                rating: 1,
            })
        ).toThrow(AnonymizerError);
    });
    test('rejects uppercase UUID (server requires lowercase)', () => {
        expect(() =>
            anonymizeTranscript({
                uploadId: VALID_UUID.toUpperCase(),
                sessionStartTs: START_TS,
                events: makeRawEvents(),
                rating: 1,
            })
        ).toThrow(AnonymizerError);
    });
    test('rejects empty events', () => {
        expect(() =>
            anonymizeTranscript({
                uploadId: VALID_UUID,
                sessionStartTs: START_TS,
                events: [],
                rating: 1,
            })
        ).toThrow(AnonymizerError);
    });
    test('rejects too-many events (>200)', () => {
        const many = Array.from({length: 201}, () => ({
            type: 'thought', ts: START_TS, payload: 'x',
        }));
        expect(() =>
            anonymizeTranscript({
                uploadId: VALID_UUID,
                sessionStartTs: START_TS,
                events: many,
                rating: 1,
            })
        ).toThrow(AnonymizerError);
    });
    test('rejects invalid rating', () => {
        expect(() =>
            anonymizeTranscript({
                uploadId: VALID_UUID,
                sessionStartTs: START_TS,
                events: makeRawEvents(),
                rating: 7 as unknown as 0,
            })
        ).toThrow(AnonymizerError);
    });
    test('rejects unparseable sessionStartTs', () => {
        expect(() =>
            anonymizeTranscript({
                uploadId: VALID_UUID,
                sessionStartTs: 'not-a-timestamp',
                events: makeRawEvents(),
                rating: 1,
            })
        ).toThrow(AnonymizerError);
    });
    test('rejects unknown event type (potential injection)', () => {
        const bad = makeRawEvents();
        bad.push({type: 'execute_arbitrary', ts: START_TS} as any);
        expect(() =>
            anonymizeTranscript({
                uploadId: VALID_UUID,
                sessionStartTs: START_TS,
                events: bad,
                rating: 1,
            })
        ).toThrow(AnonymizerError);
    });
});

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

describe('anonymizeTranscript — idempotency', () => {
    test('running through the anonymizer twice yields the same output', () => {
        const first = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: makeRawEvents(),
            rating: 1,
            comment: 'no PII here',
        });
        // Synthesize a "re-anonymized" pass by feeding the output's
        // events back through the per-string walker. Sentinels must
        // be invariant under re-application.
        const reWalked = anonymizeValue(first);
        expect(reWalked).toEqual(first);
    });
});

// ---------------------------------------------------------------------------
// Server-side PII scanner mirror (in-test)
// ---------------------------------------------------------------------------

/**
 * Re-implementation of fula-ai-training/server/anonymization_check.py's
 * scanner in TypeScript. Used to assert that the anonymizer's output
 * passes the server's defense-in-depth filter on every test corpus.
 *
 * KEEP IN SYNC with the Python file — they must agree on what counts as
 * a leak. If you add a scanner here, add the equivalent there.
 *
 * Returns the scanner name on the first hit, or null when clean.
 */
const SERVER_SCANNERS: Array<readonly [string, RegExp]> = [
    ['ipv4_literal', /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/],
    ['ipv6_literal', /\b[A-Fa-f0-9]{1,4}(?::[A-Fa-f0-9]{0,4}){2,}\b/],
    ['peerid_libp2p', /\b12D3KooW[A-HJ-NP-Za-km-z1-9]{40,}\b/],
    ['peerid_legacy', /\bQm[A-HJ-NP-Za-km-z1-9]{40,46}\b/],
    ['home_directory', /\/(?:home|Users)\/(?!<USER>\/)[A-Za-z0-9_.-]{1,32}\//],
    ['wallclock_ts', /\b20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)\b/],
];

function* walkStrings(v: unknown): Generator<string> {
    if (typeof v === 'string') yield v;
    else if (Array.isArray(v)) for (const x of v) yield* walkStrings(x);
    else if (v && typeof v === 'object') {
        for (const x of Object.values(v as object)) yield* walkStrings(x);
    }
}

function serverFindPII(payload: unknown): string | null {
    for (const s of walkStrings(payload)) {
        for (const [name, rx] of SERVER_SCANNERS) {
            if (rx.test(s)) return name;
        }
    }
    return null;
}

describe('output passes the Phase 20 server-side PII scanner', () => {
    test('clean transcript passes the scanner', () => {
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: makeRawEvents(),
            rating: 1,
        });
        expect(serverFindPII(out)).toBeNull();
    });

    test('transcript with raw IPs anywhere is cleaned to pass scanner', () => {
        const raw = makeRawEvents();
        raw.push({type: 'thought', ts: '2026-05-23T10:00:11Z',
                  payload: 'saw 10.0.0.1 talking to fe80::1ff:fe23:4567:890a'});
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: raw,
            rating: 1,
        });
        expect(serverFindPII(out)).toBeNull();
    });

    test('transcript with peerIds is cleaned', () => {
        const raw = makeRawEvents();
        raw.push({type: 'thought', ts: '2026-05-23T10:00:11Z',
                  payload: 'connected 12D3KooWBLAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'});
        raw.push({type: 'thought', ts: '2026-05-23T10:00:12Z',
                  payload: 'cid QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'});
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: raw,
            rating: 1,
        });
        expect(serverFindPII(out)).toBeNull();
    });

    test('transcript with home paths is cleaned', () => {
        const raw = makeRawEvents();
        raw.push({type: 'thought', ts: '2026-05-23T10:00:11Z',
                  payload: 'reading /home/ehsan/.fula/config'});
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: raw,
            rating: 1,
        });
        expect(serverFindPII(out)).toBeNull();
    });

    test('transcript with SSID + BSSID inside phone_context-ish payload is cleaned', () => {
        const raw = makeRawEvents();
        raw.push({type: 'thought', ts: '2026-05-23T10:00:11Z',
                  payload: {
                      wifi_ssid: 'HomeWiFi5G',
                      wifi_bssid: 'aa:bb:cc:dd:ee:ff',
                      message: 'connected on ssid: HomeWiFi5G via aa:bb:cc:dd:ee:ff',
                  }});
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: raw,
            rating: 1,
        });
        expect(serverFindPII(out)).toBeNull();
    });

    test('transcript with wall-clock timestamps in event payloads is cleaned', () => {
        const raw = makeRawEvents();
        raw.push({type: 'thought', ts: '2026-05-23T10:00:11Z',
                  payload: 'kubo restarted at 2026-05-23T10:00:05Z'});
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: raw,
            rating: 1,
        });
        expect(serverFindPII(out)).toBeNull();
    });

    test('large multi-PII transcript ends up clean', () => {
        const raw: RawTranscriptEvent[] = [
            {type: 'session_started', ts: START_TS, payload: {}},
            ...Array.from({length: 50}, (_, i) => ({
                type: 'thought' as const,
                ts: new Date(Date.parse(START_TS) + i * 1000).toISOString(),
                payload: `iter ${i}: 10.${i}.0.1 12D3KooW${'X'.repeat(45)} /home/user${i}/cfg`,
            })),
        ];
        const out = anonymizeTranscript({
            uploadId: VALID_UUID,
            sessionStartTs: START_TS,
            events: raw,
            rating: 0,
            comment: 'happened at 2026-05-23T10:00:15Z near aa:bb:cc:dd:ee:ff',
        });
        expect(serverFindPII(out)).toBeNull();
    });
});
