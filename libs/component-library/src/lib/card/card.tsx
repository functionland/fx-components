import React from 'react';
import { BoxProps } from '@shopify/restyle';
import { FxBox } from '../box/box';
import { FxTheme } from '../theme/theme';

export const FxCard = (props: BoxProps<FxTheme>) => (
  <FxBox
    {...props}
    marginHorizontal="16"
    padding="16"
    backgroundColor="backgroundPrimary"
    borderRadius="s"
  />
);
