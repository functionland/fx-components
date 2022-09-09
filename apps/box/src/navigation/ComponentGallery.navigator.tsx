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
import { ComponentGalleryStackParamList } from './navigationConfig';
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
        name="Gallery"
        component={ComponentGalleryScreen}
      />
      <ComponentGalleryStack.Screen
        name="Avatars"
        component={AvatarDemoScreen}
      />
      <ComponentGalleryStack.Screen
        name="Buttons"
        component={ButtonsDemoScreen}
      />
      <ComponentGalleryStack.Screen
        name="Button Groups"
        component={ButtonGroupDemoScreen}
      />
      <ComponentGalleryStack.Screen name="Forms" component={FormDemoScreen} />
      <ComponentGalleryStack.Screen
        name="Progress Bar"
        component={ProgressBarDemoScreen}
      />
      <ComponentGalleryStack.Screen name="Tabs" component={TabsDemoScreen} />
      <ComponentGalleryStack.Screen name="Toast" component={ToastDemoScreen} />
      <ComponentGalleryStack.Screen name="Usage Bar" component={UsageBarDemo} />
      <ComponentGalleryStack.Screen name="Table" component={TableDemoScreen} />
      <ComponentGalleryStack.Screen
        name="Breadcrumbs"
        component={BreadcrumbsDemoScreen}
      />
      <ComponentGalleryStack.Screen name="Files" component={FilesDemoScreen} />
    </ComponentGalleryStack.Navigator>
  );
};

const ComponentGalleryStack =
  createNativeStackNavigator<ComponentGalleryStackParamList>();
