import { FxBox, FxText } from '@functionland/component-library';
import React from 'react';
import { UsageBar } from '../components';

export const BoxScreen = () => {
  return (
    <FxBox>
      <UsageBar />
      <FxText variant="body">Box Dashboard</FxText>
    </FxBox>
  );
};
