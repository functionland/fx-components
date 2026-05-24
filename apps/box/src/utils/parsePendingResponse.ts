/**
 * parsePendingResponse — Phase 15 pure helper.
 *
 * Separated from PendingActionsPanel.tsx so the parsing logic can be
 * tested without importing @functionland/component-library (per Phase 5
 * lesson: that library can't render in jest).
 */
import type {
    RecommendedActionEvent,
    VerdictEvent,
} from './bloxAiEvents';

export interface PendingActionsRecord {
    ts: string;
    trigger: 'isolation_mode';
    verdict?: VerdictEvent | null;
    actions: RecommendedActionEvent[];
}

/**
 * Defensive parser — returns null on any malformed input so the panel
 * silently hides rather than crashing the Diagnostics screen.
 */
export function parsePendingResponse(raw: unknown): PendingActionsRecord | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.ts !== 'string') return null;
    if (r.trigger !== 'isolation_mode') return null;
    if (!Array.isArray(r.actions)) return null;
    let verdict: VerdictEvent | null = null;
    if (r.verdict && typeof r.verdict === 'object') {
        const v = r.verdict as any;
        if (v.type === 'verdict' && v.payload &&
            typeof v.payload.summary === 'string' &&
            ['green', 'yellow', 'red'].includes(v.payload.severity)) {
            verdict = v as VerdictEvent;
        }
    }
    const actions: RecommendedActionEvent[] = [];
    for (const a of r.actions as unknown[]) {
        if (!a || typeof a !== 'object') continue;
        const x = a as Record<string, unknown>;
        if (x.type === 'recommended_action' &&
            typeof x.action_id === 'string' &&
            typeof x.action_name === 'string' &&
            typeof x.reasoning === 'string' &&
            typeof x.confidence === 'number' &&
            (x.tier === 2 || x.tier === 3) &&
            typeof x.approval_token === 'string' &&
            typeof x.args === 'object' && x.args !== null) {
            actions.push(x as unknown as RecommendedActionEvent);
        }
    }
    if (actions.length === 0) return null;
    return { ts: r.ts, trigger: 'isolation_mode', verdict, actions };
}
