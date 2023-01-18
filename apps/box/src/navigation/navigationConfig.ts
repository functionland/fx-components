import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  CompositeNavigationProp,
  NavigatorScreenParams,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export enum Routes {
  // Root
  InitialSetup = 'InitialSetup',
  MainTabs = 'MainTabs',
  Hub = 'Hub',

  // Initial Setup
  Welcome = 'Welcome',
  LinkPassword = 'Link Password',
  ConnectToWallet = 'Connect To Wallet',
  ConnectToBlox = 'Connect To Blox',
  ConnectToWifi = 'Connect To Wifi',
  CheckConnection = 'Check Connection',
  SetupComplete = 'Setup Complete',
  SetBloxAuthorizer = 'Set Blox Authorizer',

  // Main Tab
  BloxTab = 'BloxTab',
  UsersTab = 'UsersTab',
  HubTab = 'HubTab',
  DevicesTab = 'DevicesTab',
  SettingsTab = 'SettingsTab',

  // Settings Stack
  Settings = 'Settings',
  ConnectedDApps = 'ConnectedDApps',
  Mode = 'Mode',
  Pools = 'Pools',
  About = 'About',
  ComponentGallery = 'Component Gallery',

  // Component Gallery
  Avatars = 'Avatars',
  Buttons = 'Buttons',
  ButtonGroups = 'Button Groups',
  Forms = 'Forms',
  Gallery = 'Gallery',
  UsageBar = 'Usage Bar',
  ProgressBar = 'Progress Bar',
  Tabs = 'Tabs',
  Toast = 'Toast',
  Table = 'Table',
  Breadcrumbs = 'Breadcrumbs',
  Files = 'Files',
}

export type RootStackParamList = {
  [Routes.InitialSetup]: undefined;
  [Routes.MainTabs]: NavigatorScreenParams<MainTabsParamList>;
  [Routes.Hub]: undefined;
};

export type MainTabsParamList = {
  [Routes.BloxTab]: undefined;
  [Routes.UsersTab]: undefined;
  [Routes.HubTab]: undefined;
  [Routes.DevicesTab]: undefined;
  [Routes.SettingsTab]: NavigatorScreenParams<SettingsStackParamList>;
};

export type SettingsStackParamList = {
  [Routes.Settings]: undefined;
  [Routes.ConnectedDApps]: undefined;
  [Routes.Mode]: undefined;
  [Routes.Pools]: undefined;
  [Routes.About]: undefined;
  [Routes.ComponentGallery]: NavigatorScreenParams<ComponentGalleryStackParamList>;
};

export type InitialSetupStackParamList = {
  [Routes.Welcome]: undefined;
  [Routes.LinkPassword]: undefined;
  [Routes.ConnectToWallet]: { password: string };
  [Routes.ConnectToBlox]: undefined;
  [Routes.ConnectToWifi]: undefined;
  [Routes.CheckConnection]: { ssid: string };
  [Routes.SetupComplete]: undefined;
  [Routes.SetBloxAuthorizer]: undefined;
};

export type ComponentGalleryStackParamList = {
  [Routes.Avatars]: undefined;
  [Routes.Buttons]: undefined;
  [Routes.ButtonGroups]: undefined;
  [Routes.Forms]: undefined;
  [Routes.Gallery]: undefined;
  [Routes.UsageBar]: undefined;
  [Routes.ProgressBar]: undefined;
  [Routes.Tabs]: undefined;
  [Routes.Toast]: undefined;
  [Routes.Table]: undefined;
  [Routes.Breadcrumbs]: undefined;
  [Routes.Files]: undefined;
};
type MainTabsNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type SettingsStackNavigationProps<
  T extends keyof SettingsStackParamList
> = CompositeNavigationProp<
  NativeStackNavigationProp<SettingsStackParamList, T>,
  MainTabsNavigationProp
>;

export type ComponentGalleryStackNavigationProps<
  T extends keyof ComponentGalleryStackParamList
> = CompositeNavigationProp<
  NativeStackNavigationProp<ComponentGalleryStackParamList, T>,
  NativeStackNavigationProp<SettingsStackParamList>
>;
