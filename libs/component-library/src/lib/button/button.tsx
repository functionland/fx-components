import React from 'react';
import {
  createBox,
  createRestyleComponent,
  createVariant,
  useTheme,
  VariantProps,
} from '@shopify/restyle';
import { Pressable, PressableProps } from 'react-native';
import { FxTheme } from '../theme/theme';
import { FxText } from '../text/text';
import { FxSvgProps } from '../svg/svg';
import { FxBox } from '../box/box';
import { FxSpacer } from '../spacer/spacer';

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
  iconLeft?: React.ReactElement<FxSvgProps>;
  children?: React.ReactNode | string;
};
const FxButton = ({
  children,
  disabled,
  onPressIn,
  onPressOut,
  variant,
  size,
  iconLeft,
  ...rest
}: FxButtonProps) => {
  const theme = useTheme<FxTheme>();
  const [isPressed, setIsPressed] = React.useState(false);
  const type = disabled ? 'disabled' : isPressed ? 'pressed' : variant;

  const icon = React.useMemo(() => {
    if (!iconLeft) return null;

    return React.createElement<FxSvgProps>(
      iconLeft.type,

      {
        height: 25,
        width: 25,
        color: theme.buttonTextVariants[type || 'defaults'].color,
        ...iconLeft.props,
      }
    );
  }, [iconLeft, type, theme.buttonTextVariants]);

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
      <FxBox flexDirection="row" alignItems="center">
        {icon}
        <FxSpacer width={8} />
        <FxButtonText size={size} type={type}>
          {children}
        </FxButtonText>
      </FxBox>
    </FxButtonBase>
  );
};

export { FxButton };
