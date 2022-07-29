import React from 'react';
import {
  ColorProps,
  createRestyleComponent,
  spacing,
  SpacingProps,
  useTheme,
} from '@shopify/restyle';
import Reanimated from 'react-native-reanimated';
import Svg, { SvgProps } from 'react-native-svg';
import { FxTheme } from '../theme/theme';

export type FxSvgProps = ColorProps<FxTheme> &
  SpacingProps<FxTheme> &
  Omit<SvgProps, 'color'>;

const RestyledSvg = createRestyleComponent<FxSvgProps, FxTheme>([spacing], Svg);
const ReanimatedSvg = Reanimated.createAnimatedComponent(RestyledSvg);

export const FxSvg = ({ color, fill, ...rest }: FxSvgProps) => {
  const { colors } = useTheme<FxTheme>();
  return <ReanimatedSvg fill={color ? colors[color] : fill} {...rest} />;
};
