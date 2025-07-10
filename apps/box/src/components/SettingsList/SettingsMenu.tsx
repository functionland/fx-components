import React from 'react';
import { FxBox, capitalizeFirstLetter } from '@functionland/component-library';
import {
  Routes,
  SettingsStackNavigationProps,
} from '../../navigation/navigationConfig';
import { SettingMenuItem } from './SettingMenuItem';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore } from '../../stores';
import { CHAIN_DISPLAY_NAMES } from '../../contracts/config';

export const SettingsMenu = () => {
  const navigation =
    useNavigation<SettingsStackNavigationProps<Routes.Settings>>();
  const rootNavigation = useNavigation();

  const mode = useSettingsStore().getMode();
  const selectedChain = useSettingsStore((state) => state.selectedChain);

  // Add app component gallery in development mode
  const appGallery = __DEV__
    ? [
        {
          name: 'Component Gallery',
          detail: null,
          onPress: () => navigation.navigate(Routes.ComponentGallery),
        },
      ]
    : [];

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
    },
    {
      name: 'Chain Selection',
      detail: `Current: ${CHAIN_DISPLAY_NAMES[selectedChain]}`,
      onPress: () => navigation.navigate(Routes.ChainSelection),
    },
    {
      name: 'Pools',
      detail: null,
      onPress: () => navigation.navigate(Routes.Pools),
    },
    {
      name: 'Blox discovery',
      detail: null,
      onPress: () =>
        rootNavigation.navigate(Routes.InitialSetup, {
          screen: Routes.ConnectToExistingBlox,
        }),
    },
    {
      name: 'Bluetooth commands',
      detail: null,
      onPress: () =>
        rootNavigation.navigate(Routes.InitialSetup, {
          screen: Routes.BluetoothCommands,
        }),
    },
    {
      name: 'Blox logs',
      detail: null,
      onPress: () => navigation.navigate(Routes.BloxLogs),
    },
    {
      name: 'About',
      detail: null,
      onPress: () => navigation.navigate(Routes.About),
    },
    //...appGallery,
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
