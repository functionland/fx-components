import React, { useEffect, useRef, useState } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import {
  FxBottomSheetModalMethods,
  FxArrowUpIcon,
  useFxTheme,
  FxScanCodeIcon,
} from '@functionland/component-library';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BloxScreen } from '../screens/Blox/Blox.screen';
import { PluginScreen } from '../screens/Plugin.screen';
import { DevicesScreen } from '../screens/Devices.screen';
import { UsersScreen } from '../screens/Users/Users.screen';
import ChatAIScreen from '../screens/ChatAI.screen';
import {
  BloxIcon,
  UserIcon,
  // HubIcon,
  DevicesIcon,
  SettingsIcon,
} from '../components';
import { SvgUri } from 'react-native-svg';
import { PoolDetailsScreen } from '../screens/Settings/PoolDetails.screen';
import { JoinRequestsScreen } from '../screens/Settings/JoinRequests.screen';
import {
  Routes,
  MainTabsParamList,
  SettingsStackParamList,
} from './navigationConfig';
import {
  SettingsScreen,
  AboutScreen,
  BloxLogsScreen,
  PoolsScreen,
  ModeScreen,
  ChainSelectionScreen,
  ConnectedDAppsScreen,
} from '../screens/Settings';
import { ComponentGalleryNavigator } from './ComponentGallery.navigator';
import { GlobalBottomSheet } from '../components/GlobalBottomSheet';
import { Helper } from '../utils';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { useLogger } from '../hooks';
import { useBloxsStore } from '../stores';
import { BluetoothCommandsScreen } from '../screens/Settings/Bluetooth/BluetoothCommands.screen';
import Zeroconf from 'react-native-zeroconf';
import { MDNSBloxService } from '../models';

export const MainTabsNavigator = () => {
  const theme = useFxTheme();
  const [
    password,
    signiture,
    setFulaIsReady,
    fulaIsReady,
    fulaReinitCount,
    setFulaReinitCount,
    useLocalIp,
    setUseLocalIp,
  ] = useUserProfileStore((state) => [
    state.password,
    state.signiture,
    state.setFulaIsReady,
    state.fulaIsReady,
    state.fulaReinitCount,
    state.setFulaReinitCount,
    state.useLocalIp,
    state.setUseLocalIp,
  ]);
  const [bloxs, currentBloxPeerId, updateBloxsStore] = useBloxsStore(
    (state) => [state.bloxs, state.currentBloxPeerId, state.update]
  );
  const globalBottomSheetRef = useRef<FxBottomSheetModalMethods>(null);
  const logger = useLogger();
  const zeroconf = new Zeroconf();
  const mDnsTimer = useRef<NodeJS.Timeout>();
  const [scanning, setScanning] = useState(false);

  const openGlobalBottomSheet = () => {
    globalBottomSheetRef.current?.present();
  };

  const closeGlobalBottomSheet = () => {
    globalBottomSheetRef.current?.close();
  };

  const isValidIp = (ip: string): boolean => {
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    return ipRegex.test(ip);
  };

  const scanMDNS = () => {
    zeroconf.stop();
    zeroconf.scan('fulatower', 'tcp', 'local.');
  };

  useEffect(() => {
    if (useLocalIp === 'scan' && currentBloxPeerId) {
      zeroconf.on('start', () => {
        setScanning(true);
        clearTimeout(mDnsTimer.current);
        mDnsTimer.current = setTimeout(() => {
          zeroconf.stop();
          setScanning(false);
        }, 6000);
        console.log('The scan has started.\n\r');
      });

      zeroconf.on('resolved', (resolved: MDNSBloxService) => {
        // Check if the resolved device matches the currentBloxPeerId
        if (resolved && resolved.txt?.bloxPeerIdString === currentBloxPeerId) {
          // Fetch the first IP address from the resolved data
          const firstIp = resolved.addresses?.[0];
          if (firstIp) {
            console.log(`Matching Blox found. Setting local IP: ${firstIp}`);
            setUseLocalIp(firstIp); // Set the local IP
            zeroconf.stop(); // Stop scanning once a match is found
            setScanning(false); // Update scanning state
            if (firstIp !== 'scan' && firstIp !== '' && isValidIp(firstIp)) {
              setFulaReinitCount(fulaReinitCount + 1);
            }
          }
        }
        console.log('Resolved device:', resolved);
      });

      scanMDNS();

      // Cleanup function to remove event listeners
      return () => {
        zeroconf.removeAllListeners('start');
        zeroconf.removeAllListeners('resolved');
        zeroconf.stop(); // Ensure scanning is stopped on cleanup
      };
    } else if (useLocalIp === 'delete') {
      setFulaReinitCount(fulaReinitCount + 1);
    }
  }, [currentBloxPeerId, useLocalIp]);

  useEffect(() => {
    const bloxsArray = Object.values(bloxs || {});
    if (!currentBloxPeerId && bloxsArray.length) {
      updateBloxsStore({
        currentBloxPeerId: bloxsArray[0].peerId || 'PeerId is empty',
      });
    }
  }, [currentBloxPeerId]);

  useEffect(() => {
    if (password && signiture && currentBloxPeerId) {
      let bloxAddr = '';
      setFulaIsReady(false);
      logger.log('MainTabsNavigator:intiFula', {
        bloxPeerId: currentBloxPeerId,
        password: password ? 'Has password' : undefined,
        signiture: signiture ? 'Has signiture' : undefined,
        bloxs,
      });
      if (
        useLocalIp &&
        useLocalIp !== 'scan' &&
        useLocalIp !== '' &&
        useLocalIp !== 'delete' &&
        isValidIp(useLocalIp)
      ) {
        bloxAddr = '/ip4/' + useLocalIp + '/tcp/40001/p2p/' + currentBloxPeerId;
      }
      try {
        Helper.initFula({
          password,
          signiture,
          bloxAddr: bloxAddr,
          bloxPeerId: currentBloxPeerId,
        })
          .then(() => {
            setFulaIsReady(true);
          })
          .catch(() => {
            setFulaIsReady(false);
          });
      } catch (error) {
        logger.logError('MainTabsNavigator:intiFula', error);
      }
    }
  }, [password, signiture, currentBloxPeerId, fulaReinitCount]);
  return (
    <>
      <MainTabs.Navigator
        tabBarPosition="bottom"
        screenOptions={() => ({
          tabBarIndicatorStyle: {
            height: 0,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.content3,
          tabBarStyle: {
            backgroundColor: theme.colors.backgroundApp,
            borderTopWidth: 1,
            borderTopColor: theme.colors.backgroundSecondary,
            paddingBottom: 4,
          },
          tabBarLabelStyle: {
            ...theme.textVariants.bodyXSRegular,
            textTransform: 'none',
          },
          headerShown: false,
          headerStyle: {
            backgroundColor: theme.colors.backgroundApp,
          },
          headerTitleStyle: {
            color: theme.colors.content1,
          },
        })}
      >
        <MainTabs.Screen
          name={Routes.BloxTab}
          component={BloxScreen}
          options={{
            // eslint-disable-next-line react/no-unstable-nested-components
            tabBarIcon: ({ color }) => <BloxIcon fill={color} />,
            tabBarLabel: 'Blox',
          }}
        />
        <MainTabs.Screen
          name={Routes.UsersTab}
          component={UsersScreen}
          options={{
            // eslint-disable-next-line react/no-unstable-nested-components
            tabBarIcon: ({ color }) => <UserIcon fill={color} />,
            tabBarLabel: 'Users',
          }}
        />
        <MainTabs.Screen
          name={Routes.PluginTab}
          component={PluginScreen}
          options={{
            // eslint-disable-next-line react/no-unstable-nested-components
            tabBarIcon: ({ color }) => <FxArrowUpIcon fill={color} />,
            tabBarLabel: '',
          }}
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              openGlobalBottomSheet();
            },
          })}
        />
        <MainTabs.Screen
          name={Routes.ChatAITab}
          component={ChatAIScreen}
          options={{
            // eslint-disable-next-line react/no-unstable-nested-components
            tabBarIcon: ({ color }) => <FxScanCodeIcon fill={color} />,
            tabBarLabel: 'Loyal Agent',
          }}
        />
        <MainTabs.Screen
          name={Routes.DevicesTab}
          component={DevicesScreen}
          options={{
            // eslint-disable-next-line react/no-unstable-nested-components
            tabBarIcon: ({ color }) => <DevicesIcon fill={color} />,
            tabBarLabel: 'Devices',
          }}
        />
        <MainTabs.Screen
          name={Routes.SettingsTab}
          component={SettingsNavigator}
          options={{
            // eslint-disable-next-line react/no-unstable-nested-components
            tabBarIcon: ({ color }) => <SettingsIcon fill={color} />,
            tabBarLabel: 'Settings',
          }}
        />
      </MainTabs.Navigator>
      <GlobalBottomSheet
        ref={globalBottomSheetRef}
        closeBottomSheet={closeGlobalBottomSheet}
      />
    </>
  );
};

const MainTabs = createMaterialTopTabNavigator<MainTabsParamList>();

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const SettingsNavigator = () => {
  const theme = useFxTheme();

  return (
    <SettingsStack.Navigator
      screenOptions={() => ({
        headerBackTitleVisible: false,
        headerBackImageSource: require('../../assets/icons/back.png'),
        headerTintColor: theme.colors.content1,
        headerStyle: {
          backgroundColor: theme.colors.backgroundApp,
        },
        headerTitle: '',
      })}
    >
      <SettingsStack.Screen
        name={Routes.Settings}
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name={Routes.ConnectedDApps}
        component={ConnectedDAppsScreen}
      />
      <SettingsStack.Screen name={Routes.Mode} component={ModeScreen} />
      <SettingsStack.Screen name={Routes.ChainSelection} component={ChainSelectionScreen} />
      <SettingsStack.Screen name={Routes.Pools} component={PoolsScreen} />
      <SettingsStack.Screen name={Routes.PoolDetails} component={PoolDetailsScreen} />
      <SettingsStack.Screen name={Routes.JoinRequests} component={JoinRequestsScreen} />
      <SettingsStack.Screen name={Routes.About} component={AboutScreen} />
      <SettingsStack.Screen name={Routes.BloxLogs} component={BloxLogsScreen} />
      <SettingsStack.Screen
        name={Routes.BluetoothCommands}
        component={BluetoothCommandsScreen}
      />

      <SettingsStack.Screen
        options={() => ({
          headerShown: false,
        })}
        name={Routes.ComponentGallery}
        component={ComponentGalleryNavigator}
      />
    </SettingsStack.Navigator>
  );
};
