/**
 * Plan A v2 — A3 canonical scenario prompts.
 *
 * The CANONICAL prompts the AI receives are kept HERE (English),
 * NOT in i18n. Reason (codex + built-in advisor agreement, gemini
 * concurred with caveat): the runbook on the blox does symptom
 * matching against English text. Translated prompts would degrade
 * runbook match quality and produce inconsistent diagnoses across
 * locales.
 *
 * Button labels + subtitles go through i18n
 * (`diagnostics.quickStart.*`) — only the prompt the AI sees stays
 * English.
 *
 * The `scenario_id` is sent alongside the prompt so future analytics
 * can correlate without parsing English. Not used today; reserved.
 */

export type ScenarioId =
    | 'disconnected'
    | 'not-earning'
    | 'cannot-join-pool';

export interface QuickStartScenario {
    id: ScenarioId;
    /** English prompt sent to /troubleshoot. Stable; do NOT translate. */
    canonicalPrompt: string;
    /** i18n key for the user-visible button label. */
    labelKey: string;
    /** i18n key for the user-visible subtitle/hint. */
    subtitleKey: string;
}

export const QUICK_START_SCENARIOS: Readonly<Record<ScenarioId, QuickStartScenario>> = {
    'disconnected': {
        id: 'disconnected',
        canonicalPrompt:
            'My Blox is showing as disconnected in the app. Please diagnose ' +
            'why the device is not reachable and propose a fix.',
        labelKey: 'diagnostics.quickStart.disconnectedLabel',
        subtitleKey: 'diagnostics.quickStart.disconnectedSubtitle',
    },
    'not-earning': {
        id: 'not-earning',
        canonicalPrompt:
            'My Blox is not earning rewards or pinning content. Check that ' +
            'everything required to earn is healthy (kubo, cluster, ' +
            'wireguard, registration with discovery) and propose a fix.',
        labelKey: 'diagnostics.quickStart.notEarningLabel',
        subtitleKey: 'diagnostics.quickStart.notEarningSubtitle',
    },
    'cannot-join-pool': {
        id: 'cannot-join-pool',
        canonicalPrompt:
            'I cannot join a pool. Please check the path from this device ' +
            'to the pool join flow (network, IPFS cluster, registration) ' +
            'and propose a fix.',
        labelKey: 'diagnostics.quickStart.cannotJoinPoolLabel',
        subtitleKey: 'diagnostics.quickStart.cannotJoinPoolSubtitle',
    },
};

export const QUICK_START_SCENARIO_LIST: ReadonlyArray<QuickStartScenario> =
    Object.values(QUICK_START_SCENARIOS);

/** Resolve a scenario id to its canonical prompt + display keys. */
export function getScenario(id: ScenarioId): QuickStartScenario {
    return QUICK_START_SCENARIOS[id];
}

/**
 * Feature flag — free-text ("custom question") troubleshooting input.
 *
 * false (default) = the free-text entry points are hidden everywhere:
 *   - QuickStartCard's "type your own" freeform disclosure + input
 *   - BloxAIChat's no-session CTA text box
 * The pre-canned scenario buttons (which drive the deterministic YAML
 * decision trees on the blox — NO LLM) stay fully available.
 *
 * This pairs with the fula-ota BLOX_AI_MODEL_ENABLED=0 decommission: with
 * no model loaded on the device, a free-text prompt would fall through to
 * the LLM path and fail, so we hide that entry point. Re-enable both sides
 * together (flip this flag to true AND ship BLOX_AI_MODEL_ENABLED=1).
 *
 * The explicit `: boolean` annotation stops TS from narrowing to the
 * literal `false` — keeps the gated branches type-reachable so all the
 * retained code stays referenced (no unused-symbol churn) and reversal is
 * a one-line flip.
 */
export const CUSTOM_QUESTION_ENABLED: boolean = false;
