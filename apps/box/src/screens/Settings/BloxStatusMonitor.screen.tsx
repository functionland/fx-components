import {
  FxBox,
  FxRadioButton,
  FxRadioButtonWithLabel,
  FxText,
} from '@functionland/component-library';
import React from 'react';
import { SubHeaderText } from '../../components/Text';
import { useSettingsStore } from '../../stores';

const INTERVAL_OPTIONS = [
  { value: '0', label: 'Disabled' },
  { value: '480', label: 'Every 8 hours' },
  { value: '1440', label: 'Every 24 hours' },
] as const;

export const BloxStatusMonitorScreen = () => {
  const bloxStatusCheckInterval = useSettingsStore(
    (state) => state.bloxStatusCheckInterval
  );
  const setBloxStatusCheckInterval = useSettingsStore(
    (state) => state.setBloxStatusCheckInterval
  );

  return (
    <FxBox marginHorizontal="20">
      <SubHeaderText marginVertical="16">Blox Status Monitor</SubHeaderText>
      <FxText variant="bodySmallRegular" marginBottom="8">
        Check interval
      </FxText>
      <FxText variant="bodyXSRegular" color="content3" marginBottom="16">
        When enabled, the app periodically checks if your bloxes are reachable
        and notifies you of any that are disconnected — even when the app is
        closed.
      </FxText>
      <FxRadioButton.Group
        value={String(bloxStatusCheckInterval)}
        onValueChange={(val: string) =>
          setBloxStatusCheckInterval(Number(val))
        }
      >
        {INTERVAL_OPTIONS.map((opt) => (
          <FxBox key={opt.value} marginBottom="8">
            <FxRadioButtonWithLabel value={opt.value} label={opt.label} />
          </FxBox>
        ))}
      </FxRadioButton.Group>
      <FxText variant="bodyXSRegular" color="content3" marginTop="16">
        Note: On iOS, the system controls exact timing and may delay background
        tasks based on battery state and usage patterns. Each blox check takes
        approximately 30 seconds.
      </FxText>
    </FxBox>
  );
};
