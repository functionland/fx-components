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

export type FxButtonProps = React.ComponentProps<typeof FxButtonBase> & {
  icon?: React.ReactElement<FxSvgProps>;
  iconLeft?: React.ReactElement<FxSvgProps>;
  iconRight?: React.ReactElement<FxSvgProps>;
  children?: React.ReactNode | string;
};
const FxButton = ({
  children,
  disabled,
  onPressIn,
  onPressOut,
  variant,
  size,
  icon,
  iconLeft,
  iconRight,
  ...rest
}: FxButtonProps) => {
  const theme = useTheme<FxTheme>();
  const [isPressed, setIsPressed] = React.useState(false);
  const type = disabled ? 'disabled' : isPressed ? 'pressed' : variant;

  const renderIcon = (_icon: React.ReactElement<FxSvgProps>) => {
    return React.createElement<FxSvgProps>(
      _icon.type,

      {
        height: 25,
        width: 25,
        color: theme.buttonTextVariants[type || 'defaults'].color,
        ..._icon.props,
      }
    );
  };

  return (
    <FxButtonBase
      variant={type}
      size={size}
      disabled={disabled}
      alignItems="center"
      justifyContent="center"
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
      <FxBox flexDirection="row" alignItems="center" justifyContent="center">
        {iconLeft && (
          <>
            {renderIcon(iconLeft)}
            <FxSpacer width={8} />
          </>
        )}
        {icon ? (
          <>{renderIcon(icon)}</>
        ) : (
          <FxButtonText size={size} type={type}>
            {children}
          </FxButtonText>
        )}

        {iconRight && (
          <>
            <FxSpacer width={8} />
            {renderIcon(iconRight)}
          </>
        )}
      </FxBox>
    </FxButtonBase>
  );
};

export { FxButton };
