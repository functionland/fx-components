import React from 'react';
import { ColorProps, useTheme } from '@shopify/restyle';
import Svg, { SvgProps } from 'react-native-svg';
import { FxTheme } from '../theme/theme';

export type FxSvgProps = ColorProps<FxTheme> & Omit<SvgProps, 'color'>;

export const FxSvg = ({ color, fill, ...rest }: FxSvgProps) => {
  const { colors } = useTheme<FxTheme>();
  return <Svg fill={color ? colors[color] : fill} {...rest} />;
};
