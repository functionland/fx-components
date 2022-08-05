import React from 'react';
import {
  FxChevronRightIcon,
  FxBox,
  FxCard,
  FxText,
} from '@functionland/component-library';
import { SettingsStackNavigationProps } from '../../navigation/navigationConfig';
import { useNavigation } from '@react-navigation/native';

export const SettingsMenu = () => {
  const navigation = useNavigation<SettingsStackNavigationProps<'Settings'>>();
  const menuItems = [
    {
      name: 'Connected dApps',
      detail: null,
      onPress: () => navigation.navigate('ConnectedDApps'),
    },
    {
      name: 'Mode',
      detail: `Current: Dark`,
      onPress: () => navigation.navigate('Mode'),
    }, // TODO: pull in mode from store when store is implemented
    {
      name: 'Pools',
      detail: null,
      onPress: () => navigation.navigate('Pools'),
    },
    {
      name: 'About',
      detail: null,
      onPress: () => navigation.navigate('About'),
    },
  ];

  return (
    <FxBox marginTop="16">
      {menuItems.map(({ name, detail, onPress }) => (
        <FxCard
          flexDirection="row"
          justifyContent="space-between"
          key={name}
          marginTop="8"
          onPress={onPress}
        >
          <FxText variant="bodyMediumRegular">{name}</FxText>
          <FxBox flexDirection="row" alignItems="center">
            <FxText variant="bodyXXSRegular" marginRight="8">
              {detail}
            </FxText>
            <FxChevronRightIcon color="content1" />
          </FxBox>
        </FxCard>
      ))}
    </FxBox>
  );
};
