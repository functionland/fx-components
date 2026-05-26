/**
 * Endpoint configuration for the Phase 21 opt-in transcript upload.
 *
 * Intentionally a tiny module so the URL is one source-of-truth that tests
 * can assert against and a deployer can change without grepping the codebase.
 *
 * SECURITY NOTE: This is the ONLY URL in the entire Blox AI feature that
 * makes a central network call from the device. Heartbeats and discovery
 * don't count — they're existing infrastructure outside this plan. If a
 * second Blox-AI-related upload endpoint ever shows up in this module,
 * something has gone wrong with the privacy model.
 *
 * HTTPS-only by construction. The Phase 20 intake server refuses HTTP.
 */

export const TRANSCRIPT_UPLOAD_URL = 'https://ai-training.fx.land/transcripts';

/**
 * Standard fetch headers for the upload. Includes `X-Anonymizer-Version`
 * so the server can correlate a wave of bad rejections to a specific
 * on-device anonymizer build.
 */
export function buildUploadHeaders(anonymizerVersion: string): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Anonymizer-Version': anonymizerVersion,
    };
}
