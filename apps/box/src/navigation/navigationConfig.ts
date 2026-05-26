import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  CompositeNavigationProp,
  NavigatorScreenParams,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ScenarioId } from '../screens/Diagnostics/quickStartPrompts';

export enum Routes {
  // Root
  InitialSetup = 'InitialSetup',
  MainTabs = 'MainTabs',
  Hub = 'Hub',
  Plugin = 'Plugin',

  // Initial Setup
  Welcome = 'Welcome',
  LinkPassword = 'Link Password',
  ConnectToWallet = 'Connect To Wallet',
  ConnectToBlox = 'Connect To Blox',
  ConnectToExistingBlox = 'Connect To Existing Blox',
  ConnectToWifi = 'Connect To Wifi',
  CheckConnection = 'Check Connection',
  SetupComplete = 'Setup Complete',
  SetBloxAuthorizer = 'Set Blox Authorizer',

  // Main Tab
  BloxTab = 'BloxTab',
  UsersTab = 'UsersTab',
  HubTab = 'HubTab',
  PluginTab = 'PluginTab',
  DevicesTab = 'DevicesTab',
  SettingsTab = 'SettingsTab',
  DiagnosticsTab = 'DiagnosticsTab',

  // Blox Manager
  BloxManager = 'BloxManager',

  // Settings Stack
  Settings = 'Settings',
  ConnectedDApps = 'ConnectedDApps',
  BloxStatusMonitor = 'BloxStatusMonitor',
  Mode = 'Mode',
  ChainSelection = 'ChainSelection',
  Pools = 'Pools',
  PoolDetails = 'PoolDetails',
  JoinRequests = 'JoinRequests',
  About = 'About',
  ComponentGallery = 'Component Gallery',
  BloxLogs = 'BloxLogs',
  BluetoothCommands = 'BluetoothCommands',
  AutoPinPairing = 'AutoPinPairing',

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
  [Routes.Plugin]: undefined;
  [Routes.BloxManager]: undefined;
};

export type MainTabsParamList = {
  [Routes.BloxTab]: undefined;
  [Routes.UsersTab]: undefined;
  [Routes.HubTab]: undefined;
  [Routes.PluginTab]: { name: string };
  [Routes.DevicesTab]: undefined;
  [Routes.SettingsTab]: NavigatorScreenParams<SettingsStackParamList>;
  [Routes.InitialSetup]: undefined;
  /**
   * Diagnostics tab accepts an optional `prefillScenario` route param
   * (Plan A v2 — A4): when Blox.screen's "Disconnected" CTA navigates
   * here, it passes `prefillScenario: 'disconnected'`. The screen
   * highlights the matching quick-start card and CLEARS the param after
   * first read so focus/remount doesn't re-prefill (codex catch).
   */
  [Routes.DiagnosticsTab]: { prefillScenario?: ScenarioId } | undefined;
};

export type SettingsStackParamList = {
  [Routes.Settings]: undefined;
  [Routes.ConnectedDApps]: {
    appName?: string;
    bundleId?: string;
    peerId?: string;
    returnDeepLink?: string;
    accountId?: string;
  };
  [Routes.BloxStatusMonitor]: undefined;
  [Routes.Mode]: undefined;
  [Routes.ChainSelection]: undefined;
  [Routes.Pools]: undefined;
  [Routes.PoolDetails]: { poolId: string };
  [Routes.JoinRequests]: { poolId: string };
  [Routes.About]: undefined;
  [Routes.BloxLogs]: undefined;
  [Routes.BluetoothCommands]: undefined;
  [Routes.AutoPinPairing]: {
    token?: string;
    endpoint?: string;
    returnUrl?: string;
  };
  [Routes.ComponentGallery]: NavigatorScreenParams<ComponentGalleryStackParamList>;
};

export type InitialSetupStackParamList = {
  [Routes.Welcome]: undefined;
  [Routes.LinkPassword]: undefined;
  [Routes.ConnectToWallet]: undefined;
  [Routes.ConnectToBlox]: undefined;
  [Routes.ConnectToExistingBlox]: undefined;
  [Routes.ConnectToWifi]: undefined;
  [Routes.CheckConnection]: { ssid: string };
  [Routes.SetupComplete]: { isManualSetup?: boolean };
  [Routes.SetBloxAuthorizer]: { isManualSetup?: boolean; deviceIp?: string; devicePort?: number; bloxPeerId?: string };
  [Routes.BluetoothCommands]: undefined;
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
