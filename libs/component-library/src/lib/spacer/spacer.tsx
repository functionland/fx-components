import {
  createRestyleComponent,
  LayoutProps,
  spacing,
  SpacingProps,
} from '@shopify/restyle';
import { View } from 'react-native';
import { FxTheme } from '../theme/theme';
import { layoutHeightFunc, layoutWidthFunc } from '../utils/restyle';

type FxSpacerProps = Pick<LayoutProps<FxTheme>, 'width' | 'height'> &
  SpacingProps<FxTheme>;

export const FxSpacer = createRestyleComponent<FxSpacerProps, FxTheme>(
  [layoutWidthFunc, layoutHeightFunc, spacing],
  View
);
