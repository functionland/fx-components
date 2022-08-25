import { createBox } from '@shopify/restyle';
import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import { FxTheme } from '../theme/theme';

const PressableBox = createBox<FxTheme, PressableProps>(Pressable);

export type FxPressableOpacityProps = React.ComponentProps<typeof PressableBox>;

export const FxPressableOpacity = ({
  style,
  children,
  ...props
}: FxPressableOpacityProps) => {
  return (
    <PressableBox
      hitSlop={16}
      style={(args) => [
        args.pressed && {
          opacity: 0.5,
        },
        typeof style === 'function' ? style(args) : style,
      ]}
      {...props}
    >
      {children}
    </PressableBox>
  );
};
