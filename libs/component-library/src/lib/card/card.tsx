import React from 'react';
import { ViewProps } from 'react-native';
import { BoxProps } from '@shopify/restyle';
import { FxBox } from '../box/box';
import { FxTheme } from '../theme/theme';

type FxCardProps = BoxProps<FxTheme> & ViewProps;

export const FxCard = (props: FxCardProps) => (
  <FxBox
    {...props}
    marginHorizontal="16"
    padding="16"
    backgroundColor="backgroundPrimary"
    borderRadius="s"
  />
);
