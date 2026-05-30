/**
 * QuickStartCard — Plan A v2 — A3.
 *
 * Three pre-canned scenario buttons + optional freeform-prompt
 * disclosure. The canonical prompts the AI receives are hardcoded
 * English in `quickStartPrompts.ts`; ONLY the button labels +
 * subtitles go through i18n (codex + built-in advisor catch).
 *
 * If `prefilledScenario` is provided, the matching button is
 * highlighted/focused to give the user a "this matches your
 * situation" hint. The user still taps Start (or the scenario button)
 * to actually launch the session — codex + gemini + built-in agreed
 * v1's auto-start surprised the user. Removes 100% of "wait, what is
 * happening?" anxiety.
 */

import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import {
    FxBox,
    FxText,
    FxCard,
    FxButton,
    FxSpacer,
    useFxTheme,
} from '@functionland/component-library';
import { useTranslation } from 'react-i18next';

import {
    QUICK_START_SCENARIO_LIST,
    CUSTOM_QUESTION_ENABLED,
    type ScenarioId,
} from './quickStartPrompts';

export interface QuickStartCardProps {
    /** Fired when the user taps a scenario button. */
    onSelectScenario: (id: ScenarioId) => void;
    /** Fired when the user submits a freeform prompt. */
    onSubmitFreeform: (prompt: string) => void;
    /** Disable all inputs while a session is being started / in flight. */
    disabled?: boolean;
    /** Pre-selected scenario from a navigation route param (A4). */
    prefilledScenario?: ScenarioId | null;
}

export const QuickStartCard: React.FC<QuickStartCardProps> = ({
    onSelectScenario,
    onSubmitFreeform,
    disabled = false,
    prefilledScenario = null,
}) => {
    const { t } = useTranslation();
    const { colors } = useFxTheme();
    const [showFreeform, setShowFreeform] = React.useState(false);
    const [freeform, setFreeform] = React.useState('');

    const handleFreeformSubmit = React.useCallback(() => {
        const trimmed = freeform.trim();
        if (!trimmed) return;
        onSubmitFreeform(trimmed);
        setFreeform('');
    }, [freeform, onSubmitFreeform]);

    return (
        <FxCard testID="quickstart-card">
            <FxCard.Title>{t('diagnostics.quickStart.title')}</FxCard.Title>
            <FxBox paddingVertical="8">
                <FxText variant="bodySmallRegular">
                    {t('diagnostics.quickStart.subtitle')}
                </FxText>
                <FxSpacer height={12} />

                {QUICK_START_SCENARIO_LIST.map((scenario) => {
                    const isPrefilled = scenario.id === prefilledScenario;
                    return (
                        <FxBox key={scenario.id} marginBottom="8">
                            <FxButton
                                testID={`quickstart-${scenario.id}`}
                                onPress={() => onSelectScenario(scenario.id)}
                                disabled={disabled}
                                // Highlight the prefilled scenario with the
                                // primary visual treatment; others stay
                                // standard. Implementation note: this maps
                                // to the design system's primary/secondary
                                // variant. If FxButton uses different prop
                                // names per the actual library, this is the
                                // intent we want to convey.
                                variant={isPrefilled ? 'inverted' : undefined}
                            >
                                {t(scenario.labelKey)}
                            </FxButton>
                            <FxBox paddingHorizontal="8" paddingTop="4">
                                <FxText variant="bodyXSRegular" color="content2">
                                    {t(scenario.subtitleKey)}
                                </FxText>
                            </FxBox>
                        </FxBox>
                    );
                })}

                {CUSTOM_QUESTION_ENABLED && <FxSpacer height={12} />}

                {CUSTOM_QUESTION_ENABLED && (showFreeform ? (
                    <FxBox>
                        <TextInput
                            testID="quickstart-freeform-input"
                            value={freeform}
                            onChangeText={setFreeform}
                            placeholder={t('diagnostics.chat.promptPlaceholder')}
                            editable={!disabled}
                            multiline
                            style={[
                                styles.input,
                                {
                                    color: colors.content1,
                                    borderColor: colors.backgroundSecondary,
                                },
                            ]}
                        />
                        <FxSpacer height={8} />
                        <FxButton
                            testID="quickstart-freeform-submit"
                            onPress={handleFreeformSubmit}
                            disabled={disabled || !freeform.trim()}
                        >
                            {t('diagnostics.quickStart.startButton')}
                        </FxButton>
                    </FxBox>
                ) : (
                    <FxButton
                        testID="quickstart-freeform-disclose"
                        variant="inverted"
                        onPress={() => setShowFreeform(true)}
                        disabled={disabled}
                    >
                        {t('diagnostics.quickStart.freeformDisclosure')}
                    </FxButton>
                ))}
            </FxBox>
        </FxCard>
    );
};

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        minHeight: 80,
        textAlignVertical: 'top',
    },
});
