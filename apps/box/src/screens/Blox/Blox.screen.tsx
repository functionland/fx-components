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
import { BloxInteraction } from './components/BloxInteraction';
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
import { blockchain, fxblox } from '@functionland/react-native-fula';
import { Helper } from '../../utils';

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
  const [resettingChain, setResettingChain] = useState(false);
  const [loadingBloxSpace, setLoadingBloxSpace] = useState(false);
  const [loadingFulaEarnings, setLoadingFulaEarnings] = useState(false);
  const [bloxAccountId, setBloxAccountId] = useState('');

  const [selectedMode, setSelectedMode] = useState<EBloxInteractionType>(
    EBloxInteractionType.OfficeBloxUnit
  );
  const navigation = useNavigation();
  const logger = useLogger();
  const [earnings, getEarnings, fulaIsReady] = useUserProfileStore((state) => [
    state.earnings,
    state.getEarnings,
    state.fulaIsReady,
  ]);

  const [
    bloxs,
    bloxsSpaceInfo,
    folderSizeInfo,
    currentBloxPeerId,
    bloxsConnectionStatus,
    checkBloxConnection,
    getBloxSpace,
    getFolderSize,
    removeBlox,
    updateBloxsStore,
  ] = useBloxsStore((state) => [
    state.bloxs,
    state.bloxsSpaceInfo,
    state.folderSizeInfo,
    state.currentBloxPeerId,
    state.bloxsConnectionStatus,
    state.checkBloxConnection,
    state.getBloxSpace,
    state.getFolderSize,
    state.removeBlox,
    state.update,
  ]);

  const [pools, getPools] = usePoolsStore((state) => [
    state.pools,
    state.getPools,
  ]);

  const updateBloxAccount = async () => {
    try {
      if (fulaIsReady) {
        const connectionStatus = await checkBloxConnection();
        if (connectionStatus) {
          const bloxAccount = await blockchain.getAccount();
          setBloxAccountId(bloxAccount.account);
        } else {
          setBloxAccountId('Not Connected to blox');
        }
      } else {
        setBloxAccountId('Fula is not ready');
      }
    } catch (e) {
      console.error('Error updating blox account:', e);
      const err = e.message || e.toString();
      if (err.includes('failed to dial')) {
        setBloxAccountId('Connection to Blox not established');
      } else if (err.includes('blockchain call error')) {
        setBloxAccountId('Error with blockchain.');
      } else {
        setBloxAccountId(e.message || e.toString());
      }
    }
  };

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
  divisionSplit.value =
    bloxsSpaceInfo?.[currentBloxPeerId]?.used_percentage || 0;
  useEffect(() => {
    if (fulaIsReady && !screenIsLoaded) {
      setScreenIsLoaded(true);
      updateBloxSpace();
      updateFulaEarnings();
      checkBloxConnection();
      updateBloxAccount();
    } else if (fulaIsReady && !bloxsConnectionStatus[currentBloxPeerId]) {
      checkBloxConnection();
    }
  }, [fulaIsReady]);

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
      if (fulaIsReady) {
        const space = await getEarnings();
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
  const handleOnBloxChanged = (index: number) => {
    try {
      const blox = bloxInteractions[index];
      updateBloxsStore({
        currentBloxPeerId: blox.peerId,
      });
    } catch (error) {
      logger.logError('handleOnBloxChanged', error);
    }
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
            checkBloxConnection();
          } catch (error) {
            logger.logError(
              'handleOnConnectionOptionSelect:checkBloxConnection',
              error
            );
          }
        } else {
          console.log('fula is not ready');
        }
        break;
      case 'RESET-CHAIN':
        if (fulaIsReady) {
          try {
            console.log('checking blox connection');
            const connection = await checkBloxConnection();
            if (connection) {
              const eraseRes = await fxblox.eraseBlData();
              console.log(eraseRes.msg);
              queueToast({
                type: 'info',
                title: 'Reset chain Data',
                message:
                  eraseRes.msg || 'Your Blox does not support this command!',
              });
            }
          } catch (error) {
            logger.logError(
              'handleOnConnectionOptionSelect:checkBloxConnection',
              error
            );
          }
        } else {
          console.log('fula is not ready');
        }
        break;
      case 'CONNECT-TO-WIFI':
        navigation.navigate(Routes.InitialSetup, {
          screen: Routes.ConnectToBlox,
        });
        break;
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
  const handleOnResetChainPress = (peerId: string) => {
    Alert.alert(
      'Reset Chain Data!',
      `Are you sure want to erase chain data from '${bloxs[peerId]?.name}'? This operation is safe but takes time.`,
      [
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setResettingChain(true);
              const result = await fxblox.eraseBlData();
              if (result.status) {
                bloxInfoBottomSheetRef.current.close();
                queueToast({
                  type: 'success',
                  title: 'Chain Data erased successfully! Rebooting now...',
                });
                const result = await fxblox.reboot();
                if (result.status) {
                  queueToast({
                    type: 'success',
                    title: 'The Blox will reboot in 10 seconds!',
                  });
                } else {
                  queueToast({
                    type: 'error',
                    title: 'Failed',
                    message:
                      result.msg ||
                      'Your Blox does not support this command! Please reboot manually',
                  });
                }
              } else {
                queueToast({
                  type: 'error',
                  title: 'Failed',
                  message:
                    (result.msg || 'Your Blox does not support this command!') +
                    '; Format Manually.',
                });
              }
            } catch (error) {
              queueToast({
                type: 'error',
                title: error,
              });
            } finally {
              setResettingChain(false);
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
          <BloxInteraction
            bloxs={bloxInteractions}
            selectedMode={selectedMode}
            //setSelectedMode={setSelectedMode}
            onBloxChange={handleOnBloxChanged}
            onConnectionPress={() =>
              connectionOptionsSheetRef.current.present()
            }
            onBloxPress={() => bloxInfoBottomSheetRef.current.present()}
          />
          <FxSpacer height={24} />
          {currentBloxSpaceInfo?.size != undefined && (
            <UsageBar
              divisionPercent={divisionSplit}
              totalCapacity={currentBloxSpaceInfo?.size || 1000}
            />
          )}
          {bloxAccountId && bloxAccountId.startsWith('5') && (
            <TasksCard
              pools={pools}
              getPools={getPools}
              currentBloxPeerId={currentBloxPeerId}
              accountId={bloxAccountId} // Replace with actual account ID
              routes={Routes}
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
          {/* <FxSpacer height={8} />
          <QuoteStat divisionPercentage={divisionPercentage} />
          <FxSpacer height={24} />
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
        onRestToHotspotPress={handleOnResetToHotspotPress}
        onRebootBloxPress={handleOnRebootBloxPress}
        onResetChainPress={handleOnResetChainPress}
        onClearCachePress={handleOnClearCachePress}
        resetingBloxHotspot={resetingBloxHotspot}
        rebootingBlox={rebootingBlox}
        resettingChain={resettingChain}
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
