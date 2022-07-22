import React from 'react';
import { FxBox, FxBoxProps } from '../box/box';

export const FxCard = (props: FxBoxProps) => (
  <FxBox
    {...props}
    padding="16"
    backgroundColor="backgroundPrimary"
    borderRadius="s"
  />
);
