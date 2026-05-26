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
