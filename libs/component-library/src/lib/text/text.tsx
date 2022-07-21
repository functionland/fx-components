import {
  createRestyleComponent,
  createText,
  TextProps,
  textRestyleFunctions,
} from '@shopify/restyle';
import Animated from 'react-native-reanimated';
import { ReText } from 'react-native-redash';
import { FxTheme } from '../theme/theme';

export const FxText = createText<FxTheme>();

interface ReTextProps extends TextProps<FxTheme> {
  text: Animated.SharedValue<string>;
}

export const FxReText = createRestyleComponent<ReTextProps, FxTheme>(
  [...textRestyleFunctions],
  ReText
);
