import React from 'react';
import {
  createBox,
  createRestyleComponent,
  createVariant,
  VariantProps,
} from '@shopify/restyle';
import { Pressable, PressableProps } from 'react-native';
import { FxTheme } from '../theme/theme';
import { FxText } from '../text/text';
import { FxButtonClasses } from '../theme/buttonClasses';

const buttonVariant = createVariant({ themeKey: 'buttonVariants' });
const PressableBox = createBox<FxTheme, PressableProps>(Pressable);

const FxButtonBase = createRestyleComponent<
  React.ComponentProps<typeof PressableBox> &
    VariantProps<FxTheme, 'buttonVariants'>,
  FxTheme
>([buttonVariant], PressableBox);

type FxButtonProps = Omit<
  React.ComponentProps<typeof FxButtonBase>,
  'variant'
> & {
  buttonClass?: keyof typeof FxButtonClasses;
  children?: React.ReactNode | string;
};

const FxButton = ({
  buttonClass = 'default',
  children,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: FxButtonProps) => {
  const [isPressed, setIsPressed] = React.useState(false);
  const className = disabled ? 'disabled' : isPressed ? 'pressed' : buttonClass;
  return (
    <FxButtonBase
      {...FxButtonClasses[className].button}
      paddingVertical="12"
      alignItems="center"
      borderRadius="s"
      disabled={disabled}
      onPressIn={(e) => {
        setIsPressed(true);
        if (onPressIn) onPressIn(e);
      }}
      onPressOut={(e) => {
        setIsPressed(false);
        if (onPressOut) onPressOut(e);
      }}
      {...rest}
    >
      <FxText {...FxButtonClasses[className].text}>{children}</FxText>
    </FxButtonBase>
  );
};

export { FxButton };
