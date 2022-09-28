import React from 'react';
import { FxBox, FxAvatar, FxText } from '@functionland/component-library';

export const BloxHeader = () => {
  return (
    <FxBox
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingHorizontal="20"
      paddingVertical="12"
    >
      <FxText variant="h300">Home Blox Setup</FxText>
      <FxAvatar source={require('../api/mockAssets/sample.png')} size="small" />
    </FxBox>
  );
};
