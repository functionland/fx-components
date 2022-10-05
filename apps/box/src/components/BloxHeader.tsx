import React from 'react';
import { FxBox, FxAvatar, FxText } from '@functionland/component-library';

type TBloxHeader = {
  title: string;
};

export const BloxHeader = ({ title }: TBloxHeader) => {
  return (
    <FxBox
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingHorizontal="20"
      paddingVertical="12"
    >
      <FxText variant="h300">{title}</FxText>
      <FxAvatar source={require('../api/mockAssets/sample.png')} size="small" />
    </FxBox>
  );
};
