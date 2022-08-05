import {
  FxBox,
  FxButton,
  FxHorizontalRule,
} from '@functionland/component-library';

import React from 'react';
import { SettingsMenu } from '../../components/SettingsList';
import { HeaderText } from '../../components/Text';
import Version from '../../components/Version';

export const SettingsScreen = () => {
  return (
    <FxBox marginHorizontal="20">
      <HeaderText>Settings</HeaderText>
      <SettingsMenu />
      <FxHorizontalRule marginVertical="16" />
      <FxButton size={'large'}>{'Log out'}</FxButton>
      <Version marginTop="16" />
    </FxBox>
  );
};
