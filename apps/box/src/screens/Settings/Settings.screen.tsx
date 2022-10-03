import {
  FxBox,
  FxButton,
  FxHorizontalRule,
  FxSafeAreaBox,
} from '@functionland/component-library';

import React from 'react';
import { SettingsMenu } from '../../components/SettingsList';
import { HeaderText } from '../../components/Text';
import Version from '../../components/Version';

export const SettingsScreen = () => {
  return (
    <FxSafeAreaBox flex={1} edges={['top']}>
      <FxBox paddingHorizontal="20" paddingVertical="12">
        <HeaderText>Settings</HeaderText>
        <SettingsMenu />
        <FxHorizontalRule marginVertical="16" />
        <FxButton size={'large'}>{'Log out'}</FxButton>
        <Version marginTop="16" />
      </FxBox>
    </FxSafeAreaBox>
  );
};
