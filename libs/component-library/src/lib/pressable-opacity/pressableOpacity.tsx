import { createBox } from '@shopify/restyle';
import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import { FxTheme } from '../theme/theme';

const PressableBox = createBox<FxTheme, PressableProps>(Pressable);

type FxPressableOpacityProps = React.ComponentProps<typeof PressableBox>;

export const FxPressableOpacity = ({
  style,
  children,
  ...props
}: FxPressableOpacityProps) => {
  return (
    <PressableBox
      {...props}
      style={(args) => [
        typeof style === 'function' ? style(args) : style,
        args.pressed && {
          opacity: 0.5,
        },
      ]}
    >
      {children}
    </PressableBox>
  );
};
