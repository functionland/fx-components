import React from 'react';
import {
  DefaultTheme,
  NavigationContainer,
  LinkingOptions,
} from '@react-navigation/native';
import { useFxTheme } from '@functionland/component-library';
import { Routes } from './navigationConfig';

type NavContainerProps = {
  children?: React.ReactNode | string;
};
const linking: LinkingOptions<unknown> = {
  enabled: true,
  prefixes: ['fxblox://'],
  config: {
    screens: {
      [Routes.MainTabs]: {
        screens: {
          [Routes.SettingsTab]: {
            screens: {
              [Routes.ConnectedDApps]:
                '/connectdapp/:appName/:bundleId/:peerId/:returnDeepLink',
            },
          },
        },
      },
    },
  },
};
export const NavContainer = ({ children }: NavContainerProps) => {
  const theme = useFxTheme();

  return (
    <NavigationContainer
      linking={linking}
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: theme.colors.backgroundApp,
        },
      }}
    >
      {children}
    </NavigationContainer>
  );
};
