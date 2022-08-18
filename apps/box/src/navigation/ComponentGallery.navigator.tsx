import { FxPressableOpacity, FxTheme } from '@functionland/component-library';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { Image } from 'react-native';
import { ComponentGalleryScreen } from '../screens/Settings/ComponentGallery.screen';
import { AvatarDemoScreen } from '../screens/Settings/ComponentGallery/AvatarDemo.screen';
import { ComponentGalleryStackParamList } from './navigationConfig';

type ComponentGalleryBackProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};
const ComponentGalleryBack = ({ navigation }: ComponentGalleryBackProps) => {
  return (
    <FxPressableOpacity onPress={() => navigation.goBack()}>
      <Image source={require('../../assets/icons/back.png')} />
    </FxPressableOpacity>
  );
};

export const ComponentGalleryNavigator = () => {
  const theme = useTheme<FxTheme>();

  return (
    <ComponentGalleryStack.Navigator
      screenOptions={({ navigation }) => ({
        headerBackTitleVisible: false,
        headerTintColor: theme.colors.content1,
        headerStyle: {
          backgroundColor: theme.colors.backgroundApp,
        },
        headerTitle: '',
        // eslint-disable-next-line react/no-unstable-nested-components
        headerLeft: () => <ComponentGalleryBack navigation={navigation} />,
      })}
    >
      <ComponentGalleryStack.Screen
        name="Component Gallery"
        component={ComponentGalleryScreen}
      />
      <ComponentGalleryStack.Screen
        name="Avatars"
        component={AvatarDemoScreen}
      />
    </ComponentGalleryStack.Navigator>
  );
};

const ComponentGalleryStack =
  createNativeStackNavigator<ComponentGalleryStackParamList>();
