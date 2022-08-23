import {
  FxAvatar,
  FxBox,
  FxSafeAreaBox,
  FxSpacer,
} from '@functionland/component-library';
import { HeaderText } from '../../../components/Text';
import React from 'react';

export const AvatarDemoScreen = () => {
  return (
    <FxSafeAreaBox flex={1}>
      <HeaderText>Avatars</HeaderText>
      <FxSpacer marginTop="32" />
      <FxBox flex={1} alignItems="center">
        <FxAvatar
          source={require('../../Users/img/sample.png')}
          size="small"
          icon="none"
          onPress={() => {
            return;
          }}
        />
        <FxSpacer marginTop="16" />
        <FxAvatar
          source={require('../../Users/img/sample.png')}
          size="medium"
          icon="deselected"
          onPress={() => {
            return;
          }}
        />
        <FxSpacer marginTop="16" />
        <FxAvatar
          source={require('../../Users/img/sample.png')}
          size="large"
          icon="selected"
          onPress={() => {
            return;
          }}
        />
        <FxSpacer marginTop="16" />
        <FxAvatar
          source={require('../../Users/img/sample.png')}
          size="xl"
          icon="edit"
          onPress={() => {
            return;
          }}
        />
      </FxBox>
    </FxSafeAreaBox>
  );
};
