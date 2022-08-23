import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { useFxTheme } from '@functionland/component-library';

type NavContainerProps = {
  children?: React.ReactNode | string;
};

export const NavContainer = ({ children }: NavContainerProps) => {
  const theme = useFxTheme();

  return (
    <NavigationContainer
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
