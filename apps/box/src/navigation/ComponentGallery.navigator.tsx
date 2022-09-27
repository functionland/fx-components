import {
  FxPressableOpacity,
  useFxTheme,
} from '@functionland/component-library';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Image } from 'react-native';
import { ComponentGalleryScreen } from '../screens/Settings/ComponentGallery.screen';
import {
  AvatarDemoScreen,
  ButtonGroupDemoScreen,
  ProgressBarDemoScreen,
  TabsDemoScreen,
  UsageBarDemo,
  ToastDemoScreen,
  FormDemoScreen,
  ButtonsDemoScreen,
  BreadcrumbsDemoScreen,
  FilesDemoScreen,
} from '../screens/Settings/ComponentGallery';
import { Routes, ComponentGalleryStackParamList } from './navigationConfig';
import { TableDemoScreen } from '../screens/Settings/ComponentGallery/TableDemo.screen';

type ComponentGalleryBackProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  tintColor: string;
};
const ComponentGalleryBack = ({
  navigation,
  tintColor,
}: ComponentGalleryBackProps) => {
  return (
    <FxPressableOpacity onPress={() => navigation.goBack()}>
      <Image
        source={require('../../assets/icons/back.png')}
        style={{ tintColor: tintColor }}
      />
    </FxPressableOpacity>
  );
};

export const ComponentGalleryNavigator = () => {
  const theme = useFxTheme();

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
        headerLeft: () => (
          <ComponentGalleryBack
            navigation={navigation}
            tintColor={theme.colors.content1}
          />
        ),
      })}
    >
      <ComponentGalleryStack.Screen
        name={Routes.Gallery}
        component={ComponentGalleryScreen}
      />
      <ComponentGalleryStack.Screen
        name={Routes.Avatars}
        component={AvatarDemoScreen}
      />
      <ComponentGalleryStack.Screen
        name={Routes.Buttons}
        component={ButtonsDemoScreen}
      />
      <ComponentGalleryStack.Screen
        name={Routes.ButtonGroups}
        component={ButtonGroupDemoScreen}
      />
      <ComponentGalleryStack.Screen
        name={Routes.Forms}
        component={FormDemoScreen}
      />
      <ComponentGalleryStack.Screen
        name={Routes.ProgressBar}
        component={ProgressBarDemoScreen}
      />
      <ComponentGalleryStack.Screen
        name={Routes.Tabs}
        component={TabsDemoScreen}
      />
      <ComponentGalleryStack.Screen
        name={Routes.Toast}
        component={ToastDemoScreen}
      />
      <ComponentGalleryStack.Screen
        name={Routes.UsageBar}
        component={UsageBarDemo}
      />
      <ComponentGalleryStack.Screen
        name={Routes.Table}
        component={TableDemoScreen}
      />
      <ComponentGalleryStack.Screen
        name={Routes.Breadcrumbs}
        component={BreadcrumbsDemoScreen}
      />
      <ComponentGalleryStack.Screen
        name={Routes.Files}
        component={FilesDemoScreen}
      />
    </ComponentGalleryStack.Navigator>
  );
};

const ComponentGalleryStack =
  createNativeStackNavigator<ComponentGalleryStackParamList>();
