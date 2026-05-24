/**
 * bloxAiEvents — Phase 12 typed SSE event surface for the Blox AI plugin.
 *
 * Mirrors fula-ota's `sse_events.v3.schema.json` (Phase 11). The 10 event
 * variants the container can emit on /troubleshoot and /execute-action:
 *
 *   session_started, thought, tool_call, tool_result, verdict,
 *   recommended_action, execution_result, user_question,
 *   user_reply_received, error
 *
 * The container emits one variant per BLE frame (Phase 5 `ble_stream`); this
 * module's `parseBloxAiEvent` discriminates the union. Per Codex Phase 12 Q6,
 * unknown/malformed frames are returned as `{type: 'error', ...}` rather
 * than thrown — keeps the transcript renderable.
 */

export type Severity = 'green' | 'yellow' | 'red';
export type ExpectedResponseType = 'text' | 'boolean' | 'choice';

export interface SessionStartedEvent {
    type: 'session_started';
    session_id: string;
    protocol_version: 3;
    ttl_seconds?: number;
}

export interface ThoughtEvent {
    type: 'thought';
    payload: string;
}

export interface ToolCallEvent {
    type: 'tool_call';
    call_id: string;
    payload: {
        tool: string;       // one of the 11 diag/* names per Phase 6
        args: Record<string, unknown>;
    };
}

export interface ToolResultEvent {
    type: 'tool_result';
    call_id: string;
    ok: boolean;
    payload: unknown;       // tool-specific; Phase 9 deliberately untyped
    error?: string;
}

export interface VerdictEvent {
    type: 'verdict';
    payload: {
        summary: string;
        severity: Severity;
        root_cause?: string;
    };
}

export interface RecommendedActionEvent {
    type: 'recommended_action';
    action_id: string;
    action_name: string;
    args: Record<string, unknown>;
    reasoning: string;
    confidence: number;     // 0..1
    tier: 2 | 3;
    approval_token: string;
    expected_duration_s?: number;
}

export interface ExecutionResultEvent {
    type: 'execution_result';
    action_id: string;
    success: boolean;
    exit_code?: number;
    stdout_excerpt?: string;
    stderr_excerpt?: string;
    duration_ms: number;
    follow_up?: string;
}

export interface UserQuestionEvent {
    type: 'user_question';
    question_id: string;
    payload: {
        question: string;
        expected_response_type?: ExpectedResponseType;
        options?: string[];
    };
}

export interface UserReplyReceivedEvent {
    type: 'user_reply_received';
    question_id: string;
    session_id: string;
}

export interface ErrorEvent {
    type: 'error';
    code: string;
    message: string;
    recoverable: boolean;
}

export type BloxAiEvent =
    | SessionStartedEvent
    | ThoughtEvent
    | ToolCallEvent
    | ToolResultEvent
    | VerdictEvent
    | RecommendedActionEvent
    | ExecutionResultEvent
    | UserQuestionEvent
    | UserReplyReceivedEvent
    | ErrorEvent;

const KNOWN_TYPES: ReadonlySet<string> = new Set([
    'session_started', 'thought', 'tool_call', 'tool_result', 'verdict',
    'recommended_action', 'execution_result', 'user_question',
    'user_reply_received', 'error',
]);

/**
 * Parse a frame's `data` payload (already-decoded object from
 * ResponseAssembler's ble_stream branch) into a typed BloxAiEvent. Malformed
 * frames are returned as synthetic `error` events so the chat transcript
 * stays renderable even when the container emits garbage.
 */
export function parseBloxAiEvent(frame: unknown): BloxAiEvent {
    if (!frame || typeof frame !== 'object') {
        return malformed('frame is not an object');
    }
    const f = frame as Record<string, unknown>;
    const t = f.type;
    if (typeof t !== 'string') {
        return malformed('frame missing string `type`');
    }
    if (!KNOWN_TYPES.has(t)) {
        return malformed(`unknown event type: ${t}`);
    }
    // Minimal shape validation — full validation happens container-side
    // against sse_events.schema.json. We only catch the cases that would
    // crash the renderer.
    switch (t) {
        case 'thought':
            if (typeof f.payload !== 'string') {
                return malformed('thought.payload not a string');
            }
            break;
        case 'tool_call':
            if (typeof f.call_id !== 'string' || !f.payload ||
                typeof (f.payload as any).tool !== 'string') {
                return malformed('tool_call missing call_id or payload.tool');
            }
            break;
        case 'tool_result':
            if (typeof f.call_id !== 'string' || typeof f.ok !== 'boolean') {
                return malformed('tool_result missing call_id or ok');
            }
            break;
        case 'verdict':
            if (!f.payload || typeof (f.payload as any).summary !== 'string' ||
                !isSeverity((f.payload as any).severity)) {
                return malformed('verdict missing summary or severity');
            }
            break;
        case 'recommended_action':
            if (typeof f.action_id !== 'string' ||
                typeof f.action_name !== 'string' ||
                typeof f.approval_token !== 'string' ||
                (f.tier !== 2 && f.tier !== 3)) {
                return malformed('recommended_action missing required fields');
            }
            break;
        case 'execution_result':
            if (typeof f.action_id !== 'string' ||
                typeof f.success !== 'boolean' ||
                typeof f.duration_ms !== 'number') {
                return malformed('execution_result missing required fields');
            }
            break;
        case 'user_question':
            if (typeof f.question_id !== 'string' || !f.payload ||
                typeof (f.payload as any).question !== 'string') {
                return malformed('user_question missing question_id or payload.question');
            }
            break;
        case 'user_reply_received':
            if (typeof f.question_id !== 'string' || typeof f.session_id !== 'string') {
                return malformed('user_reply_received missing ids');
            }
            break;
        case 'session_started':
            if (typeof f.session_id !== 'string' || f.protocol_version !== 3) {
                return malformed('session_started missing session_id or wrong protocol_version');
            }
            break;
        case 'error':
            if (typeof f.code !== 'string' || typeof f.message !== 'string' ||
                typeof f.recoverable !== 'boolean') {
                return malformed('error event missing required fields');
            }
            break;
    }
    return f as unknown as BloxAiEvent;
}

function isSeverity(s: unknown): s is Severity {
    return s === 'green' || s === 'yellow' || s === 'red';
}

function malformed(detail: string): ErrorEvent {
    return {
        type: 'error',
        code: 'MALFORMED_FRAME',
        message: detail,
        recoverable: true,
    };
}

/**
 * Tag for a transcript entry — what the renderer needs to know about each
 * event so it can place + style it in the chat list. Order-stable; entries
 * are appended in arrival order.
 */
export interface TranscriptEntry {
    id: string;             // unique within a session — call_id / action_id / index fallback
    event: BloxAiEvent;
    receivedAt: number;     // Date.now() at parse time, for sort + animation
}
