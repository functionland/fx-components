import {
  FxBox,
  FxBoxProps,
  FxHorizontalRule,
  FxText,
} from '@functionland/component-library';
import React from 'react';

type CardRowProps = FxBoxProps & {
  children?: React.ReactNode;
};

export const CardRow = ({ children, ...rest }: CardRowProps) => {
  return (
    <>
      <FxBox flexDirection="row" justifyContent="space-between" {...rest}>
        {children}
      </FxBox>
      <FxHorizontalRule marginVertical="12" />
    </>
  );
};

type CardRowContentType = {
  children: React.ReactNode | string;
};
export const CardRowTitle = ({ children }: CardRowContentType) => {
  return (
    <FxText color="content1" variant="bodySmallRegular">
      {children}
    </FxText>
  );
};

export const CardRowData = ({ children }: CardRowContentType) => {
  return (
    <FxText color="content2" variant="bodySmallLight">
      {children}
    </FxText>
  );
};
