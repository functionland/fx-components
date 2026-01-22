import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FxBox,
  FxButton,
  FxSafeAreaBox,
  FxSpacer,
  FxBottomSheetModalMethods,
  useToast,
} from '@functionland/component-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, ScrollView } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import {
  BloxInfoBottomSheet,
  ColorSettingsCard,
  ConnectedDevicesCard,
  DeviceCard,
  UsageBar,
} from '../../components';
import { TasksCard } from '../../components/Cards/TasksCard';
import { EarningCard } from '../../components/Cards/EarningCard';

import { BloxHeader } from './components/BloxHeader';
import { BloxInteractionImproved } from './components/BloxInteractionImproved';
import { BloxInteractionModal } from './modals/BloxInteractionModal';
import { EDeviceStatus } from '../../api/hub';
import { EBloxInteractionType, TBloxInteraction } from '../../models';
import { ProfileBottomSheet } from '../../components/ProfileBottomSheet';
import {
  ConnectionOptionsSheet,
  ConnectionOptionsType,
} from '../../components/ConnectionOptionsSheet';
import { useLogger } from '../../hooks';
import { Routes } from '../../navigation/navigationConfig';
import { useNavigation } from '@react-navigation/native';
import {
  useBloxsStore,
  usePoolsStore,
  useUserProfileStore,
} from '../../stores';
import { useSDK } from '@metamask/sdk-react';
import { useWalletNetwork } from '../../hooks/useWalletNetwork';
import { WalletNotification } from '../../components/WalletNotification';
import { blockchain, fxblox } from '@functionland/react-native-fula';
import { Helper } from '../../utils';
import axios from 'axios';
import { useContractIntegration } from '../../hooks/useContractIntegration';

const DEFAULT_DIVISION = 30;

export const BloxScreen = () => {
  const bloxInteractionModalRef = useRef<FxBottomSheetModalMethods>(null);
  const profileBottomSheetRef = useRef<FxBottomSheetModalMethods>(null);
  const connectionOptionsSheetRef = useRef<FxBottomSheetModalMethods>(null);
  const bloxInfoBottomSheetRef = useRef<FxBottomSheetModalMethods>(null);
  const { queueToast } = useToast();

  const divisionSplit = useSharedValue(DEFAULT_DIVISION);
  const [screenIsLoaded, setScreenIsLoaded] = useState(false);
  const [resetingBloxHotspot, setResetingBloxHotspot] = useState(false);
  const [rebootingBlox, setRebootingBlox] = useState(false);
  const [loadingBloxSpace, setLoadingBloxSpace] = useState(false);
  const [loadingFulaEarnings, setLoadingFulaEarnings] = useState(false);

  const [selectedMode, setSelectedMode] = useState<EBloxInteractionType>(
    EBloxInteractionType.OfficeBloxUnit
  );
  const navigation = useNavigation();
  const logger = useLogger();
  const earnings = useUserProfileStore((state) => state.earnings);
  const getEarnings = useUserProfileStore((state) => state.getEarnings);
  const fulaIsReady = useUserProfileStore((state) => state.fulaIsReady);
  const checkFulaReadiness = useUserProfileStore((state) => state.checkFulaReadiness);
  const password = useUserProfileStore((state) => state.password);
  const signiture = useUserProfileStore((state) => state.signiture);

  // Get wallet address from MetaMask SDK
  const { account } = useSDK();

  // Initialize contract integration with notification enabled (only for Blox screen)
  useContractIntegration({ showConnectedNotification: true });

  const bloxs = useBloxsStore((state) => state.bloxs);
  const bloxsSpaceInfo = useBloxsStore((state) => state.bloxsSpaceInfo);
  const folderSizeInfo = useBloxsStore((state) => state.folderSizeInfo);
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);
  const bloxsConnectionStatus = useBloxsStore((state) => state.bloxsConnectionStatus);
  const checkBloxConnection = useBloxsStore((state) => state.checkBloxConnection);
  const getBloxSpace = useBloxsStore((state) => state.getBloxSpace);
  const getFolderSize = useBloxsStore((state) => state.getFolderSize);
  const removeBlox = useBloxsStore((state) => state.removeBlox);
  const updateBloxsStore = useBloxsStore((state) => state.update);

  const pools = usePoolsStore((state) => state.pools);
  const getPools = usePoolsStore((state) => state.getPools);

  const bloxInteractions = Object.values(bloxs || {}).map<TBloxInteraction>(
    (blox) => ({
      peerId: blox.peerId,
      title: blox.name,
    })
  );
  const currentBlox = useMemo(
    () => bloxs[currentBloxPeerId],
    [bloxs, currentBloxPeerId]
  );
  const currentBloxSpaceInfo = useMemo(
    () => bloxsSpaceInfo?.[currentBloxPeerId],
    [bloxsSpaceInfo, currentBloxPeerId]
  );
  const currentFolderSizeInfo = useMemo(
    () => folderSizeInfo?.[currentBloxPeerId],
    [folderSizeInfo, currentBloxPeerId]
  );

  // Update divisionSplit shared value when bloxsSpaceInfo changes
  // Must be in useEffect to avoid writing to shared value during render
  useEffect(() => {
    divisionSplit.value =
      bloxsSpaceInfo?.[currentBloxPeerId]?.used_percentage || 0;
  }, [bloxsSpaceInfo, currentBloxPeerId, divisionSplit]);

  useEffect(() => {
    if (fulaIsReady && !screenIsLoaded) {
      setScreenIsLoaded(true);
      updateBloxSpace();
      updateFulaEarnings();
      checkBloxConnection();
    } else if (fulaIsReady && !bloxsConnectionStatus[currentBloxPeerId]) {
      checkBloxConnection();
    }
  }, [fulaIsReady, screenIsLoaded, currentBloxPeerId, bloxsConnectionStatus, updateBloxSpace, updateFulaEarnings, checkBloxConnection]);

  const updateBloxSpace = async () => {
    try {
      setLoadingBloxSpace(true);
      if (fulaIsReady) {
        const space = await getBloxSpace();
        const folderSize = await getFolderSize();
        logger.log('updateBloxSpace', space);
      }
    } catch (error) {
      logger.logError('GetBloxSpace Error', error);
    } finally {
      setLoadingBloxSpace(false);
    }
  };

  const updateFulaEarnings = async () => {
    try {
      setLoadingFulaEarnings(true);
      if (fulaIsReady && account) {
        // Pass MetaMask account address to getEarnings to avoid MetaMask popup
        const space = await getEarnings(account);
        logger.log('updateFulaEarnings', space);
      }
    } catch (error) {
      logger.logError('updateFulaEarnings Error', error);
    } finally {
      setLoadingFulaEarnings(false);
    }
  };


  const showInteractionModal = () => {
    bloxInteractionModalRef.current.present();
  };

  const handleSelectMode = (mode: EBloxInteractionType) => {
    setSelectedMode(mode);
    bloxInteractionModalRef.current.close();
  };

  const showProfileModal = () => {
    profileBottomSheetRef.current.present();
  };
  const handleOnConnectionOptionSelect = async (
    type: ConnectionOptionsType
  ) => {
    connectionOptionsSheetRef?.current?.close();
    switch (type) {
      case 'RETRY':
        if (fulaIsReady) {
          try {
            console.log('checking blox connection');
            // Use more retries when user explicitly clicks Retry
            checkBloxConnection(5, 10);
          } catch (error) {
            logger.logError(
              'handleOnConnectionOptionSelect:checkBloxConnection',
              error
            );
          }
        } else {
          if (password && signiture && currentBloxPeerId) {
            await Helper.initFula({
              password: password,
              signiture: signiture,
              bloxPeerId: currentBloxPeerId,
            });
            checkBloxConnection();
          }
          console.log('fula is not ready');
        }
        break;
      case 'CONNECT-TO-WIFI': {
        try {
          const localResponse = await axios.head(
            'http://10.42.0.1:3500/properties',
            {
              timeout: 5000, // 5 seconds timeout
            }
          );
          if (localResponse.status === 200) {
            navigation.navigate(Routes.InitialSetup, {
              screen: Routes.ConnectToBlox,
            });
          } else {
            console.log('not connected to FxBlox hotspot');
            queueToast({
              type: 'info',
              title: 'Connect Blox to Wifi',
              message: 'You are not connected to FxBlox hotspot!',
            });
            navigation.navigate(Routes.InitialSetup, {
              screen: Routes.ConnectToBlox,
            });
          }
        } catch (error) {
          console.log('Failed to connect to FxBlox hotspot:', error);
          queueToast({
            type: 'error',
            title: 'Connection Failed',
            message: 'Not connected to FxBlox hotspot',
          });
          navigation.navigate(Routes.InitialSetup, {
            screen: Routes.ConnectToBlox,
          });
        }
        break;
      }
      default:
        break;
    }
  };
  const handleOnBloxDiscovery = () => {
    profileBottomSheetRef.current.close();
    navigation.navigate(Routes.InitialSetup, {
      screen: Routes.ConnectToExistingBlox,
    });
  };
  const handleOnBloxRemovePress = (peerId: string) => {
    if (Object.values(bloxs)?.length <= 1) {
      Alert.alert(
        'Warning',
        'You cannot remove the last Blox! Please first add new Blox, then remove this one from the list.'
      );
      return;
    }
    Alert.alert(
      'Remove Blox!',
      `Are you sure want to remove '${bloxs[peerId]?.name}' from the list?`,
      [
        {
          text: 'Yes',
          onPress: () => {
            bloxInfoBottomSheetRef.current.close();
            removeBlox(peerId);
          },
          style: 'destructive',
        },
        {
          text: 'No',
          style: 'cancel',
        },
      ]
    );
  };
  const handleOnClearCachePress = () => {
    Alert.alert(
      'Clear Cahce!',
      `Are you sure want to reset Application cache ?`,
      [
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              bloxInfoBottomSheetRef.current.close();
              queueToast({
                type: 'success',
                title: 'Cache Cleared',
                message: 'The cache has been successfully cleared.',
              });
            } catch (error) {
              queueToast({
                type: 'error',
                title: 'Error Clearing Cache',
                message: error.message || 'Failed to clear cache.', // Correctly extracting the error message
              });
            }
          },
          style: 'destructive',
        },
        {
          text: 'No',
          style: 'cancel',
        },
      ]
    );
  };
  const handleOnResetToHotspotPress = (peerId: string) => {
    Alert.alert(
      'Hotspot mode!',
      `Are you sure want to reset Blox '${bloxs[peerId]?.name}' to hotspot mode? Your blox will reboot!`,
      [
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setResetingBloxHotspot(true);
              const result = await fxblox.wifiRemoveall();
              if (result.status) {
                bloxInfoBottomSheetRef.current.close();
                queueToast({
                  type: 'success',
                  title: 'Reset to hotspot mode successfully!',
                });
              } else {
                queueToast({
                  type: 'error',
                  title: 'Failed',
                  message:
                    result.msg || 'Your Blox does not support this command!',
                });
              }
            } catch (error) {
              queueToast({
                type: 'success',
                title: 'Blox has been reset to hotspot mode!',
              });
            } finally {
              setResetingBloxHotspot(false);
            }
          },
          style: 'destructive',
        },
        {
          text: 'No',
          style: 'cancel',
        },
      ]
    );
  };
  const handleOnRebootBloxPress = (peerId: string) => {
    Alert.alert(
      'Reboot blox!',
      `Are you sure want to reboot Blox '${bloxs[peerId]?.name}', your Blox reboots in 5 seconds!`,
      [
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setRebootingBlox(true);
              const result = await fxblox.reboot();
              if (result.status) {
                bloxInfoBottomSheetRef.current.close();
                queueToast({
                  type: 'success',
                  title: 'The Blox rebooted successfully!',
                });
              } else {
                queueToast({
                  type: 'error',
                  title: 'Failed',
                  message:
                    result.msg || 'Your Blox does not support this command!',
                });
              }
            } catch (error) {
              queueToast({
                type: 'error',
                title: error,
              });
            } finally {
              setRebootingBlox(false);
            }
          },
          style: 'destructive',
        },
        {
          text: 'No',
          style: 'cancel',
        },
      ]
    );
  };
  return (
    <FxSafeAreaBox flex={1} edges={['top']}>
      <BloxHeader
        selectedMode={selectedMode}
        onChangeMode={showInteractionModal}
        onAvatarPress={showProfileModal}
      />
      <ScrollView>
        <FxBox paddingVertical="20" paddingHorizontal="20">
          <BloxInteractionImproved
            bloxs={bloxInteractions}
            selectedMode={selectedMode}
            onConnectionPress={() =>
              connectionOptionsSheetRef.current?.present()
            }
            onBloxPress={() => bloxInfoBottomSheetRef.current?.present()}
          />
          <FxSpacer height={16} />
          
          {/* Wallet Connection and Network Notification */}
          <WalletNotification compact={true} />
          
          <FxSpacer height={24} />
          {currentBloxSpaceInfo?.size != undefined && (
            <UsageBar
              divisionPercent={divisionSplit}
              totalCapacity={currentBloxSpaceInfo?.size || 1000}
            />
          )}

          <FxSpacer height={24} />
          <DeviceCard
            onRefreshPress={updateBloxSpace}
            loading={loadingBloxSpace}
            data={{
              capacity: currentBloxSpaceInfo?.size || 0,
              folderInfo: currentFolderSizeInfo || {},
              name: 'Hard Disks',
              status: currentBloxSpaceInfo
                ? EDeviceStatus.InUse
                : EDeviceStatus.NotAvailable,
              associatedDevices: ['Blox Set Up'],
            }}
          />
          <EarningCard
            marginTop="8"
            onRefreshPress={updateFulaEarnings}
            loading={loadingFulaEarnings}
            data={{
              totalFula: earnings,
            }}
          />

          <FxSpacer height={24} />
          <TasksCard />
          {/*<FxSpacer height={8} />
          <QuoteStat divisionPercentage={divisionPercentage} />
          <FxSpacer height={16} />
          <ColorSettingsCard />
          <FxSpacer height={16} />
          <EarningCard totalFula={4.2931} />
          <FxSpacer height={16} />
          <ConnectedDevicesCard data={mockHub} />
          <FxSpacer height={16} />
          <UsersCard data={mockFriendData} />
          <FxSpacer height={16} />
          <Pool pool={mockPoolData[0]} />
          <FxSpacer height={36} />
          <FxButton size="large">Restart</FxButton> */}
        </FxBox>
      </ScrollView>
      <BloxInteractionModal
        ref={bloxInteractionModalRef}
        selectedMode={selectedMode}
        onSelectMode={handleSelectMode}
      />
      <BloxInfoBottomSheet
        ref={bloxInfoBottomSheetRef}
        bloxInfo={bloxs[currentBloxPeerId]}
        onBloxRemovePress={handleOnBloxRemovePress}
        onResetToHotspotPress={handleOnResetToHotspotPress}
        onRebootBloxPress={handleOnRebootBloxPress}
        onClearCachePress={handleOnClearCachePress}
        resetingBloxHotspot={resetingBloxHotspot}
        rebootingBlox={rebootingBlox}
      />
      <ProfileBottomSheet
        ref={profileBottomSheetRef}
        onBloxDiscovery={handleOnBloxDiscovery}
      />
      <ConnectionOptionsSheet
        ref={connectionOptionsSheetRef}
        onSelected={handleOnConnectionOptionSelect}
      />
    </FxSafeAreaBox>
  );
};
