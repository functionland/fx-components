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
import { FxSvgProps } from '../svg/svg';
import { FxBox } from '../box/box';
import { FxSpacer } from '../spacer/spacer';
import { useFxTheme } from '../theme/useFxTheme';

const PressableBox = createBox<FxTheme, PressableProps>(Pressable);

const linkVariant = createVariant({
  themeKey: 'linkVariants',
  property: 'type',
});
const linkSize = createVariant({
  themeKey: 'linkSizes',
  property: 'size',
});

const FxLinkText = createRestyleComponent<
  React.ComponentProps<typeof FxText> &
    VariantProps<FxTheme, 'linkVariants', 'type'> &
    VariantProps<FxTheme, 'linkSizes', 'size'>,
  FxTheme
>([linkVariant, linkSize], FxText);

export type FxLinkProps = React.ComponentProps<typeof PressableBox> &
  Pick<React.ComponentProps<typeof FxLinkText>, 'type' | 'size'> & {
    icon?: React.ReactElement<FxSvgProps>;
    iconLeft?: React.ReactElement<FxSvgProps>;
    iconRight?: React.ReactElement<FxSvgProps>;
    children?: React.ReactNode | string;
  };
const FxLink = ({
  children,
  disabled,
  onPressIn,
  onPressOut,
  type,
  size,
  icon,
  iconLeft,
  iconRight,
  ...rest
}: FxLinkProps) => {
  const theme = useFxTheme();
  const [isPressed, setIsPressed] = React.useState(false);
  const _type = disabled ? 'disabled' : isPressed ? 'pressed' : type;

  const renderIcon = (_icon: React.ReactElement<FxSvgProps>) => {
    return React.createElement<FxSvgProps>(
      _icon.type,

      {
        color: theme.linkVariants[_type || 'defaults'].color,
        ..._icon.props,
        height: 16,
        width: 16,
      }
    );
  };

  return (
    <PressableBox
      disabled={disabled}
      alignItems="center"
      alignSelf="center"
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
          <FxLinkText size={size} type={_type}>
            {children}
          </FxLinkText>
        )}

        {iconRight && (
          <>
            <FxSpacer width={8} />
            {renderIcon(iconRight)}
          </>
        )}
      </FxBox>
    </PressableBox>
  );
};

export { FxLink };
