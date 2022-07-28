import React from 'react';
import {
  FxPressableOpacity,
  FxPressableOpacityProps,
} from '../pressable-opacity/pressableOpacity';

export const FxCard = ({
  onPress,
  disabled,
  ...rest
}: FxPressableOpacityProps) => (
  <FxPressableOpacity
    onPress={onPress}
    disabled={!onPress || disabled}
    padding="16"
    backgroundColor="backgroundPrimary"
    borderRadius="s"
    {...rest}
  />
);
