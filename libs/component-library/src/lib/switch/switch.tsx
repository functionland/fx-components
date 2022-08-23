import React from 'react';
import { createBox } from '@shopify/restyle';
import { Switch, SwitchProps } from 'react-native';
import { FxTheme } from '../theme/theme';
import { useFxTheme } from '../theme/useFxTheme';

const BaseSwitch = createBox<FxTheme, SwitchProps>(Switch);

export type FxSwitchProps = React.ComponentProps<typeof BaseSwitch>;

const FxSwitch = (props: FxSwitchProps) => {
  const { colors } = useFxTheme();

  return (
    <BaseSwitch
      trackColor={{ false: colors.border, true: colors.greenBase }}
      thumbColor={colors.white}
      accessibilityRole="switch"
      accessibilityState={{ disabled: props.disabled, checked: props.value }}
      accessibilityLiveRegion="polite"
      {...props}
    />
  );
};

export { FxSwitch };
