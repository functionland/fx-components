import React from 'react';
import { BoxProps } from '@shopify/restyle';
import { FxBox } from '../box/box';
import { FxTheme } from '../theme/theme';

export const FxHorizontalRule = (props: BoxProps<FxTheme>) => (
  <FxBox
    width="100%"
    height={1}
    backgroundColor="backgroundSecondary"
    {...props}
  />
);
