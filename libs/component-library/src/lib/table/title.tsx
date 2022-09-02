import React from 'react';
import { FxBox } from '../box/box';
import { FxText, FxTextProps } from '../text/text';

type TitleProps = FxTextProps & {
  width?: number;
};
export const Title = ({ width, children, ...rest }: TitleProps) => {
  return (
    <FxBox flex={width ? undefined : 1} width={width}>
      {children && (
        <FxText variant="eyebrow2" {...rest}>
          {children}
        </FxText>
      )}
    </FxBox>
  );
};
