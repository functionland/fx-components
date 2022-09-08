import React from 'react';
import { FxBox, FxBoxProps } from '../box/box';

type HeaderProps = FxBoxProps;

export const Header = ({ children, ...rest }: HeaderProps) => {
  return (
    <FxBox
      flexDirection="row"
      backgroundColor="backgroundSecondary"
      paddingHorizontal="12"
      paddingVertical="8"
      {...rest}
    >
      {children}
    </FxBox>
  );
};
