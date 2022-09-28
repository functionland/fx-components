import React from 'react';
import { BoxProps } from '@shopify/restyle';
import { FxBox } from '../box/box';
import { FxTheme } from '../theme/theme';

export const FxVerticalRule = (props: BoxProps<FxTheme>) => (
  <FxBox
    width={1}
    height="100%"
    backgroundColor="backgroundSecondary"
    {...props}
  />
);
