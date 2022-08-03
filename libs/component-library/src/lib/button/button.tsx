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
import { FxSvgProps } from '../svg/svg';
import { FxBox } from '../box/box';
import { FxSpacer } from '../spacer/spacer';

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
  iconLeft?: React.ReactElement<FxSvgProps>;
  children?: React.ReactNode | string;
};

const FxButton = ({
  buttonClass = 'default',
  children,
  disabled,
  onPressIn,
  onPressOut,
  iconLeft,
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
      <FxBox flexDirection="row" alignItems="center">
        {iconLeft &&
          React.createElement<FxSvgProps>(
            iconLeft.type,

            {
              height: 25,
              width: 25,
              color: FxButtonClasses[className].text.color,
              ...iconLeft.props,
            }
          )}
        <FxSpacer width={8} />
        <FxText {...FxButtonClasses[className].text}>{children}</FxText>
      </FxBox>
    </FxButtonBase>
  );
};

export { FxButton };
