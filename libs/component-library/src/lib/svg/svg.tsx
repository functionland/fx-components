import React from 'react';
import {
  ColorProps,
  createRestyleComponent,
  spacing,
  SpacingProps,
} from '@shopify/restyle';
import Reanimated from 'react-native-reanimated';
import Svg, { SvgProps } from 'react-native-svg';
import { FxTheme } from '../theme/theme';
import { useFxTheme } from '../theme/useFxTheme';

export type FxSvgProps = ColorProps<FxTheme> &
  SpacingProps<FxTheme> &
  Omit<SvgProps, 'color'>;

const RestyledSvg = createRestyleComponent<FxSvgProps, FxTheme>([spacing], Svg);
const ReanimatedSvg = Reanimated.createAnimatedComponent(RestyledSvg);

export const FxSvg = ({ color, fill, ...rest }: FxSvgProps) => {
  const { colors } = useFxTheme();
  return <ReanimatedSvg fill={color ? colors[color] : fill} {...rest} />;
};
