import React from 'react';
import { createBox, useTheme } from '@shopify/restyle';
import { Switch, SwitchProps } from 'react-native';
import { FxTheme } from '../theme/theme';

const BaseSwitch = createBox<FxTheme, SwitchProps>(Switch);

export type FxSwitchProps = React.ComponentProps<typeof BaseSwitch>;

const FxSwitch = (props: FxSwitchProps) => {
  const { colors } = useTheme<FxTheme>();

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
