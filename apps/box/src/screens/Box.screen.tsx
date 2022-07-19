import { FxBox } from '@functionland/component-library';
import React from 'react';
import { UsageBar } from '../components';

export const BoxScreen = () => {
  return (
    <FxBox paddingVertical="24">
      <UsageBar isEditable />
    </FxBox>
  );
};
