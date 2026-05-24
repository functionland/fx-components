/**
 * Phase 21 — endpoint constant tests.
 *
 * These are deliberately picky: the upload URL is the SINGLE central
 * channel in the entire Blox AI feature. Any silent change to it is a
 * regression worth catching at jest time, not in production.
 */
import {
    TRANSCRIPT_UPLOAD_URL,
    buildUploadHeaders,
} from '../uploadTranscriptUrl';

describe('TRANSCRIPT_UPLOAD_URL', () => {
    test('points at the agreed production endpoint', () => {
        expect(TRANSCRIPT_UPLOAD_URL).toBe(
            'https://ai-training.fx.land/transcripts',
        );
    });

    test('is HTTPS — no plaintext upload of anonymized transcripts', () => {
        expect(TRANSCRIPT_UPLOAD_URL.startsWith('https://')).toBe(true);
    });

    test('does not point at any non-fx.land host', () => {
        // Defensive: catches a typo'd domain or a sneaky redirect.
        expect(new URL(TRANSCRIPT_UPLOAD_URL).hostname.endsWith('.fx.land')).toBe(true);
    });
});

describe('buildUploadHeaders', () => {
    test('includes Content-Type, Accept, anonymizer version', () => {
        const h = buildUploadHeaders('0.1.0');
        expect(h['Content-Type']).toBe('application/json');
        expect(h['Accept']).toBe('application/json');
        expect(h['X-Anonymizer-Version']).toBe('0.1.0');
    });

    test('does not leak auth or device-identifying headers', () => {
        const h = buildUploadHeaders('0.1.0');
        // Sanity: keys we should never set, given the no-identity contract.
        for (const forbidden of ['Authorization', 'Cookie', 'X-Device-Id',
                                  'X-Blox-Id', 'X-User-Id']) {
            expect(h).not.toHaveProperty(forbidden);
        }
    });

    test('header set is exactly the documented three', () => {
        const h = buildUploadHeaders('0.1.0');
        expect(Object.keys(h).sort()).toEqual(
            ['Accept', 'Content-Type', 'X-Anonymizer-Version'],
        );
    });
});
