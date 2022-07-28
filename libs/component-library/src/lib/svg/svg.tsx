import React from 'react';
import {
  ColorProps,
  composeRestyleFunctions,
  spacing,
  SpacingProps,
  useRestyle,
  useTheme,
} from '@shopify/restyle';
import Reanimated from 'react-native-reanimated';
import Svg, { SvgProps } from 'react-native-svg';
import { FxTheme } from '../theme/theme';

const ReanimatedSvg = Reanimated.createAnimatedComponent(Svg);

export type FxSvgProps = ColorProps<FxTheme> &
  SpacingProps<FxTheme> &
  Omit<SvgProps, 'color'>;

const restyleFunctions = composeRestyleFunctions<
  FxTheme,
  Omit<
    FxSvgProps,
    | 'color'
    | 'fill'
    | 'opacity'
    | 'fontSize'
    | 'fontStyle'
    | 'fontWeight'
    | 'letterSpacing'
  >
>([spacing]);

export const FxSvg = ({
  color,
  fill,
  opacity,
  fontSize,
  fontStyle,
  fontWeight,
  letterSpacing,
  ...rest
}: FxSvgProps) => {
  const { colors } = useTheme<FxTheme>();
  const props = useRestyle(restyleFunctions, rest);
  return (
    <ReanimatedSvg
      fill={color ? colors[color] : fill}
      opacity={opacity}
      fontSize={fontSize}
      fontStyle={fontStyle}
      fontWeight={fontWeight}
      letterSpacing={letterSpacing}
      {...props}
    />
  );
};
