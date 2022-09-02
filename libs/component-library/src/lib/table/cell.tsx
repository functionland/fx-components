import React from 'react';
import { FxBox } from '../box/box';
import { FxText, FxTextProps } from '../text/text';

type CellProps = FxTextProps;
export const Cell = ({ children, ...rest }: CellProps) => {
  return (
    <FxBox flex={1}>
      <FxText color="content1" variant="bodyXSRegular" {...rest}>
        {children}
      </FxText>
    </FxBox>
  );
};
