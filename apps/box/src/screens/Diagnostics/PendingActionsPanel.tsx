/**
 * PendingActionsPanel — Phase 15.
 *
 * When the user opens the Diagnostics screen, fetch the most recent
 * isolation-mode-staged recommendations from the container's `ai/pending`
 * BLE command (Phase 6 manifest). If any are present, render at the top
 * of the screen as a "while you were away" banner. Approve/dismiss reuses
 * Phase 12's ApprovalModal.
 *
 * Format: `ai/pending` returns the most recent line from
 * `/var/log/fula/ai-pending-actions.jsonl` (Phase 14 writes it), which
 * looks like:
 *   { ts, trigger: "isolation_mode", verdict?, actions: [recommended_action…] }
 *
 * If the plugin isn't installed OR the BLE call fails OR there are no
 * staged actions, the panel renders nothing (silent — the rest of the
 * Diagnostics screen still works).
 */
import React from 'react';
import {
    FxBox,
    FxText,
    FxCard,
    FxButton,
    FxSpacer,
} from '@functionland/component-library';
import { useTranslation } from 'react-i18next';
import type { RecommendedActionEvent } from '../../utils/bloxAiEvents';
// PendingActionsRecord + parsePendingResponse live in utils/ so the parser
// can be tested without dragging the component library into the test path
// (Phase 5 lesson). Re-export so external imports don't change.
export { parsePendingResponse } from '../../utils/parsePendingResponse';
export type { PendingActionsRecord } from '../../utils/parsePendingResponse';
import type { PendingActionsRecord } from '../../utils/parsePendingResponse';

export interface PendingActionsPanelProps {
    /** Fetched pending record. null = not loaded yet OR none staged. */
    pending: PendingActionsRecord | null;
    /** Called when the user taps Approve on one of the staged actions. */
    onApprove: (action: RecommendedActionEvent) => void;
    /** Called when the user dismisses the banner (don't show again this session). */
    onDismiss: () => void;
    /** True while ai/execute is in flight for one of these actions. */
    busy?: boolean;
}

export const PendingActionsPanel: React.FC<PendingActionsPanelProps> = ({
    pending,
    onApprove,
    onDismiss,
    busy = false,
}) => {
    const { t } = useTranslation();
    if (!pending || pending.actions.length === 0) return null;
    const verdict = pending.verdict;
    return (
        <FxCard testID="pending-actions-panel" marginBottom="12">
            <FxBox padding="12">
                <FxText variant="h300">
                    {t('diagnostics.pending.title', { n: pending.actions.length })}
                </FxText>
                <FxSpacer height={4} />
                <FxText variant="bodySmallRegular">
                    {t('diagnostics.pending.subtitle', { ts: pending.ts })}
                </FxText>
                {verdict && (
                    <>
                        <FxSpacer height={8} />
                        <FxText variant="bodyMediumRegular">
                            {t('diagnostics.pending.verdictPrefix')}{' '}
                            {verdict.payload.summary}
                        </FxText>
                    </>
                )}
                <FxSpacer height={8} />
                {pending.actions.map((a) => (
                    <FxBox
                        key={a.action_id}
                        paddingVertical="8"
                        testID={`pending-action-${a.action_id}`}
                    >
                        <FxText variant="bodyMediumRegular">{a.action_name}</FxText>
                        <FxSpacer height={4} />
                        <FxText variant="bodySmallRegular">{a.reasoning}</FxText>
                        <FxSpacer height={4} />
                        <FxText variant="bodySmallRegular">
                            {t('diagnostics.chat.confidence', {
                                pct: Math.round(a.confidence * 100),
                            })}
                            {' • '}
                            {a.tier === 2
                                ? t('diagnostics.chat.tier2Label')
                                : t('diagnostics.chat.tier3Label')}
                        </FxText>
                        <FxSpacer height={6} />
                        <FxButton
                            onPress={() => onApprove(a)}
                            disabled={busy}
                            testID={`pending-approve-${a.action_id}`}
                        >
                            {t('diagnostics.chat.approveButton')}
                        </FxButton>
                    </FxBox>
                ))}
                <FxSpacer height={4} />
                <FxButton
                    variant="inverted"
                    onPress={onDismiss}
                    disabled={busy}
                    testID="pending-dismiss"
                >
                    {t('diagnostics.pending.dismiss')}
                </FxButton>
            </FxBox>
        </FxCard>
    );
};

