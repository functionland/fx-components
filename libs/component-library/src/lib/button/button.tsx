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

const buttonVariant = createVariant({
  themeKey: 'buttonVariants',
  property: 'variant',
});
const buttonSize = createVariant({
  themeKey: 'buttonSizes',
  property: 'size',
});
const PressableBox = createBox<FxTheme, PressableProps>(Pressable);

const FxButtonBase = createRestyleComponent<
  React.ComponentProps<typeof PressableBox> &
    VariantProps<FxTheme, 'buttonVariants', 'variant'> &
    VariantProps<FxTheme, 'buttonSizes', 'size'>,
  FxTheme
>([buttonVariant, buttonSize], PressableBox);

const buttonTextVariant = createVariant({
  themeKey: 'buttonTextVariants',
  property: 'type',
});
const buttonTextSize = createVariant({
  themeKey: 'buttonTextSizes',
  property: 'size',
});

const FxButtonText = createRestyleComponent<
  React.ComponentProps<typeof FxText> &
    VariantProps<FxTheme, 'buttonTextVariants', 'type'> &
    VariantProps<FxTheme, 'buttonTextSizes', 'size'>,
  FxTheme
>([buttonTextVariant, buttonTextSize], FxText);

type FxButtonProps = React.ComponentProps<typeof FxButtonBase> & {
  children?: React.ReactNode | string;
};
const FxButton = ({
  children,
  disabled,
  onPressIn,
  onPressOut,
  variant,
  size,
  ...rest
}: FxButtonProps) => {
  const [isPressed, setIsPressed] = React.useState(false);
  const type = disabled ? 'disabled' : isPressed ? 'pressed' : variant;
  return (
    <FxButtonBase
      variant={type}
      size={size}
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
      <FxButtonText size={size} type={type}>
        {children}
      </FxButtonText>
    </FxButtonBase>
  );
};

export { FxButton };
