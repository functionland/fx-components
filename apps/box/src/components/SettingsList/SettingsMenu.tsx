import React from 'react';
import { FxBox, capitalizeFirstLetter } from '@functionland/component-library';
import {
  Routes,
  SettingsStackNavigationProps,
} from '../../navigation/navigationConfig';
import { SettingMenuItem } from './SettingMenuItem';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore } from '../../stores';

export const SettingsMenu = () => {
  const navigation =
    useNavigation<SettingsStackNavigationProps<Routes.Settings>>();
  const mode = useSettingsStore().getMode();

  const menuItems = [
    {
      name: 'Connected dApps',
      detail: null,
      onPress: () => navigation.navigate(Routes.ConnectedDApps),
    },
    {
      name: 'Mode',
      detail: `Current: ${capitalizeFirstLetter(mode)} mode`,
      onPress: () => navigation.navigate(Routes.Mode),
    }, // TODO: pull in mode from store when store is implemented
    {
      name: 'Pools',
      detail: null,
      onPress: () => navigation.navigate(Routes.Pools),
    },
    {
      name: 'About',
      detail: null,
      onPress: () => navigation.navigate(Routes.About),
    },
    {
      name: 'Component Gallery',
      detail: null,
      onPress: () => navigation.navigate(Routes.ComponentGallery),
    },
  ];

  return (
    <FxBox marginTop="16">
      {menuItems.map(({ name, detail, onPress }) => (
        <SettingMenuItem
          key={name}
          name={name}
          detail={detail}
          onPress={onPress}
        />
      ))}
    </FxBox>
  );
};
