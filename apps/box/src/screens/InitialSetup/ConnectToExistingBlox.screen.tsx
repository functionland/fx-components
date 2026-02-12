import React, { useEffect, useRef, useState } from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxText,
  FxSafeAreaBox,
  useToast,
  FxSpacer,
  FxCard,
  FxRadioButton,
  FxRadioButtonWithLabel,
  FxRefreshIcon,
  FxTag,
  FxExclamationIcon,
  FxPressableOpacity,
  FxArrowLeftIcon,
  FxCopyIcon,
  FxInfoIcon,
  useFxTheme,
} from '@functionland/component-library';
import { ActivityIndicator, Alert, FlatList, ListRenderItem, StyleSheet } from 'react-native';
import { SmallHeaderText, SubHeaderText } from '../../components/Text';
import Zeroconf from 'react-native-zeroconf';
import { NativeModules } from 'react-native';
import { MDNSBloxService, TBloxProperty } from '../../models';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { Helper } from '../../utils';
import { useLogger, useRootNavigation, useInitialSetupNavigation } from '../../hooks';
import { copyToClipboard } from '../../utils/clipboard';
import { useBloxsStore } from '../../stores';
import { Routes } from '../../navigation/navigationConfig';
import { useTranslation } from 'react-i18next'; // Import for translations
import { generateUniqueBloxName } from '../../utils/bloxName';

type DicoveryDeviceType = {
  ipAddress: string;
  peerId: string;
  authorizer: string;
  hardwareId: string;
};

// Check if native module is available
const isZeroconfAvailable = !!NativeModules.RNZeroconf;
console.log('[Zeroconf] Native module available:', isZeroconfAvailable);
if (!isZeroconfAvailable) {
  console.error('[Zeroconf] RNZeroconf native module is not available. Make sure the library is properly linked.');
}

const zeroconf = new Zeroconf();
export const ConnectToExistingBloxScreen = () => {
  const { t, i18n } = useTranslation(); // Add translation hook
  const { colors } = useFxTheme();
  const [data, setData] = useState<MDNSBloxService[]>([]);
  const [scanning, setScanning] = useState(false);
  const [addingBloxs, setAddingBloxs] = useState(false);

  const mDnsTimer = useRef<NodeJS.Timeout>();
  const logger = useLogger();
  const rootNavigation = useRootNavigation();
  const navigation = useInitialSetupNavigation();

  const appPeerId = useUserProfileStore((state) => state.appPeerId);
  const setAppPeerId = useUserProfileStore((state) => state.setAppPeerId);
  const signiture = useUserProfileStore((state) => state.signiture);
  const password = useUserProfileStore((state) => state.password);
  const bloxs = useBloxsStore((state) => state.bloxs) ?? {};
  const bloxsPropertyInfo = useBloxsStore((state) => state.bloxsPropertyInfo) ?? {};
  const addBlox = useBloxsStore((state) => state.addBlox);
  const removeBlox = useBloxsStore((state) => state.removeBlox);
  const updateBloxStore = useBloxsStore((state) => state.update);
  
  // Fixed this line - the correct useState syntax with type
  const [checkboxState, setCheckboxState] = React.useState<Record<string, boolean>>({});

  // Use useRef to persist uniqueDevices across renders
  const uniqueDevicesRef = useRef(new Map());

  useEffect(() => {
    console.log('[Zeroconf] Setting up event listeners...');

    zeroconf.on('start', () => {
      console.log('[Zeroconf] Scan started');
      setScanning(true);
      setData([]);
      uniqueDevicesRef.current = new Map();
      clearTimeout(mDnsTimer.current);
      // Increase timeout to 15 seconds to allow more time for device discovery
      mDnsTimer.current = setTimeout(() => {
        console.log('[Zeroconf] Scan timeout - stopping');
        zeroconf.stop();
        // Don't set scanning to false here - let the stop event handle it
        // This allows late-arriving resolved events to still be processed
      }, 15000);
    });

    zeroconf.on('stop', () => {
      console.log('[Zeroconf] Scan stopped');
      // Add a small delay before setting scanning to false
      // to allow any pending resolved events to be processed
      setTimeout(() => {
        setScanning(false);
      }, 1000);
    });

    zeroconf.on('found', (name: string) => {
      console.log('[Zeroconf] Service found:', name);
    });

    zeroconf.on('resolved', (resolved: MDNSBloxService) => {
      console.log('[Zeroconf] Service resolved:', resolved);
      // Check if the hardwareId has already been seen
      if (!uniqueDevicesRef.current.has(resolved.txt?.hardwareID)) {
        // If it's a new hardwareId, add to the Map and update state
        uniqueDevicesRef.current.set(resolved.txt?.hardwareID, true);
        setData((prev) => [
          resolved,
          ...prev.filter(
            (device) => device.txt?.hardwareID !== resolved.txt?.hardwareID
          ),
        ]); // This also ensures to remove any previously added duplicate
      }
    });

    zeroconf.on('error', (error: Error) => {
      console.log('[Zeroconf] Error:', error);
      logger.logError('Zeroconf error', error);
      setScanning(false);
    });

    if (!appPeerId) {
      generateAppPeerId();
    }
    scanMDNS();

    // Cleanup function to remove event listeners
    return () => {
      console.log('[Zeroconf] Cleaning up listeners');
      zeroconf.removeAllListeners?.('start');
      zeroconf.removeAllListeners?.('stop');
      zeroconf.removeAllListeners?.('found');
      zeroconf.removeAllListeners?.('resolved');
      zeroconf.removeAllListeners?.('error');
    };
  }, []);

  const errorToString = (error: unknown): string => {
    if (error instanceof Error) {
      // If it's an instance of the Error class, use its message
      return error.message;
    } else if (typeof error === 'string') {
      // If it's already a string, return it as-is
      return error;
    } else {
      // For other types (e.g., objects), stringify it
      return JSON.stringify(error);
    }
  };

  const queueToast = useToast();
  const generateAppPeerId = async () => {
    try {
      const peerId = await Helper.initFula({
        password,
        signiture,
      });
      setAppPeerId(peerId);
    } catch (error) {
      const errorMessage = errorToString(error);
      queueToast.showToast({
        type: 'error',
        message:
          t('connectToExistingBlox.generateAppPeerIdError') + errorMessage,
      });
      logger.logError('ConnectToExistingBloxScreen:generateAppPeerId', error);
    }
  };

  const handleOnItemPress = (id: string) => {
    if (checkboxState[id]) delete checkboxState[id];
    else checkboxState[id] = true;
    setCheckboxState({ ...checkboxState });
  };

  const scanMDNS = () => {
    console.log('[Zeroconf] Starting mDNS scan for _fulatower._tcp.local.');
    try {
      zeroconf.stop();
      zeroconf.scan('fulatower', 'tcp', 'local.');
    } catch (error) {
      console.log('[Zeroconf] Error starting scan:', error);
      logger.logError('Zeroconf scan error', error);
    }
  };

  const addBloxs = () => {
    const bloxsCount = Object.values(bloxs).length;
    let firstBlox = true;
    setAddingBloxs(true);

    const bloxsProperties: Record<string, string> = Object.keys(
      bloxsPropertyInfo
    ).reduce((obj, peerId) => {
      if (bloxsPropertyInfo[peerId]?.hardwareID)
        obj[bloxsPropertyInfo[peerId]?.hardwareID] = peerId;
      return obj;
    }, {});

    setTimeout(() => {
      try {
        data.forEach((device, index) => {
          if (
            device?.txt?.bloxPeerIdString &&
            checkboxState[device?.txt?.bloxPeerIdString]
          ) {
            // Remove bloxes with same hardware Id and defferent peerId
            if (
              bloxsProperties[device?.txt.hardwareID] &&
              bloxsProperties[device?.txt.hardwareID] !=
                device?.txt?.bloxPeerIdString
            ) {
              removeBlox(bloxsProperties[device?.txt.hardwareID]);
            }
            // Ensure unique name for each new Blox
            const existingNames = Object.values(bloxs as Record<string, { name: string }> ).map((b) => b.name);
            const baseName =
              bloxs[device?.txt?.bloxPeerIdString]?.name ??
              `${t('connectToExistingBlox.bloxUnitPrefix')} #${bloxsCount + index + 1}`;
            const uniqueName = generateUniqueBloxName(baseName, existingNames);
            addBlox({
              peerId: device?.txt?.bloxPeerIdString,
              name: uniqueName,
            });
            if (firstBlox) {
              firstBlox = false;
              updateBloxStore({
                currentBloxPeerId: device?.txt?.bloxPeerIdString,
              });
            }
          }
          rootNavigation.reset({
            index: 0,
            routes: [{ name: Routes.MainTabs }],
          });
        });
      } catch (error) {
        setAddingBloxs(false);
        console.log(error);
        logger.logError('ConnectToExistingBloxScreen:addBloxs', error);
      }
    }, 0);
  };

  const renderItem = React.useCallback<ListRenderItem<MDNSBloxService>>(
    ({ item }) => {
      const authorized = item.txt?.authorizer === appPeerId;
      const alreadyExist = !!bloxs[item.txt?.bloxPeerIdString];
      return (
        <FxCard
          disabled={!authorized || !appPeerId || alreadyExist}
          onPress={() => handleOnItemPress(item.txt?.bloxPeerIdString)}
        >
          <FxCard.Row>
            <FxBox flexDirection="row" alignItems="center">
              <FxRadioButton
                value={item.txt?.bloxPeerIdString}
                disabled={!authorized || !appPeerId || alreadyExist}
              />
              <FxText variant="bodyMediumRegular" paddingStart="16">
                {item.host}
              </FxText>
            </FxBox>
          </FxCard.Row>
          <FxText variant="bodySmallLight">
            <FxText variant="bodySmallSemibold">{t('connectToExistingBlox.ip')}: </FxText>
            {item?.addresses?.map(
              (ip, index) =>
                `${ip}${item.addresses.length - 1 != index ? ',' : ''}`
            )}
          </FxText>
          <FxText variant="bodySmallSemibold">{t('connectToExistingBlox.peerId')}:</FxText>
          <FxBox flexDirection="row" alignItems="center">
            <FxText variant="bodySmallLight" flex={1}>{item.txt?.bloxPeerIdString}</FxText>
            {item.txt?.bloxPeerIdString && item.txt?.bloxPeerIdString !== 'NA' && (
              <FxPressableOpacity onPress={() => {
                copyToClipboard(item.txt?.bloxPeerIdString);
                queueToast.showToast({ type: 'success', message: t('connectToExistingBlox.peerIdCopied') });
              }}>
                <FxCopyIcon width={16} height={16} fill={colors.content3} />
              </FxPressableOpacity>
            )}
          </FxBox>
          <FxText variant="bodySmallSemibold">{t('connectToExistingBlox.hardwareId')}:</FxText>
          <FxText variant="bodySmallLight">{item.txt?.hardwareID}</FxText>
          <FxBox flexDirection="row">
            {item.txt?.bloxPeerIdString === item.txt?.authorizer && (
              <FxExclamationIcon
                color="warningBase"
                width={22}
                height={22}
                marginEnd="8"
              />
            )}
            <FxTag
              key={item.txt?.hardwareID}
              alignSelf="flex-start"
              marginRight="8"
              backgroundColor={
                appPeerId && authorized
                  ? 'successBase'
                  : appPeerId
                    ? 'errorBase'
                    : 'warningBase'
              }
            >
              {appPeerId && authorized
                ? t('connectToExistingBlox.authorized')
                : appPeerId
                  ? t('connectToExistingBlox.notAuthorized')
                  : t('connectToExistingBlox.checking')}
            </FxTag>
            {alreadyExist && (
              <FxTag alignSelf="flex-start" marginStart="0">
                {t('connectToExistingBlox.alreadyExist')}
              </FxTag>
            )}
          </FxBox>
          {appPeerId && !authorized && item.txt?.authorizer && item.txt?.authorizer !== '' && (
            <FxBox marginTop="8">
              <FxBox flexDirection="row" alignItems="center" marginBottom="8">
                <FxPressableOpacity onPress={() => {
                  Alert.alert(
                    t('connectToExistingBlox.peerIdMismatchTitle'),
                    t('connectToExistingBlox.peerIdMismatchHelp')
                  );
                }}>
                  <FxInfoIcon width={20} height={20} color="warningBase" />
                </FxPressableOpacity>
                <FxText variant="bodySmallLight" color="content2" marginStart="8" flex={1}>
                  {t('connectToExistingBlox.peerIdMismatchBrief')}
                </FxText>
              </FxBox>
              <FxButton
                size="defaults"
                variant="inverted"
                onPress={() => navigation.navigate(Routes.BluetoothCommands)}
              >
                {t('connectToExistingBlox.goToBluetoothCommands')}
              </FxButton>
            </FxBox>
          )}
        </FxCard>
      );
    },
    [bloxs, appPeerId, t, colors, navigation]
  );
  
  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxPressableOpacity onPress={() => rootNavigation.pop()}>
        <FxArrowLeftIcon fill={colors.content1} />
      </FxPressableOpacity>
      <FxBox
        marginTop="16"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <SmallHeaderText>{t('connectToExistingBlox.title')}</SmallHeaderText>
        {scanning ? (
          <ActivityIndicator />
        ) : (
          <FxRefreshIcon onPress={scanMDNS} fill={colors.content1} />
        )}
      </FxBox>
      <SubHeaderText marginTop="4" variant="bodySmallLight">
        {t('connectToExistingBlox.selectBloxs')}
      </SubHeaderText>
      {!isZeroconfAvailable && (
        <FxBox marginTop="8" padding="12" backgroundColor="errorBase" borderRadius="s">
          <FxText color="white">Network discovery module not available</FxText>
        </FxBox>
      )}
      {scanning && (
        <FxBox marginTop="8">
          <FxText variant="bodySmallRegular" color="content2">
            Scanning network for Blox devices...
          </FxText>
        </FxBox>
      )}
      {!scanning && data.length === 0 && (
        <FxBox marginTop="8">
          <FxText variant="bodySmallRegular" color="content2">
            No devices found. Make sure your Blox is powered on and connected to the same network.
          </FxText>
        </FxBox>
      )}
      <FxSpacer height={16} />
      <FxRadioButton.Group
        value={Object.keys(checkboxState)}
        onValueChange={() => null}
      >
        <FlatList
          data={data}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparatorComponent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 180,
          }}
        />
      </FxRadioButton.Group>
      <FxBox
        position="absolute"
        justifyContent="center"
        bottom={0}
        right={0}
        left={0}
        paddingVertical="20"
        paddingHorizontal="20"
      >
        <FxButton
          size="large"
          disabled={!appPeerId || !(Object.values(checkboxState).length > 0)}
          onPress={!addingBloxs ? addBloxs : null}
        >
          {addingBloxs ? <ActivityIndicator /> : t('connectToExistingBlox.addSelectedBloxs')}
        </FxButton>
      </FxBox>
    </FxSafeAreaBox>
  );
};

const ItemSeparatorComponent = () => {
  return <FxSpacer marginTop="4" />;
};

const styles = StyleSheet.create({
  languageSelectorContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    width: 120,
  }
});

const MockData: DicoveryDeviceType[] = [
  {
    ipAddress: '192.168.1.100',
    peerId: '2342342-234234-sdf234234',
    hardwareId: '2sdsfsf-asfasff-asfafsasf-zvzxa-asqwqwr-afasfsdf-asafafa',
    authorizer: '12sd1-123123as-asdas-12123',
  },
  {
    ipAddress: '192.168.1.102',
    peerId: '2342342-234234-sdf234234-1231',
    hardwareId:
      '2sdsfsf-asfasff-asfafsasf-zvzxa-asqwqwr-afasfsdf-asafafa-123123-asd',
    authorizer: '12sd1-123123as-asdas-12123-asdasd',
  },
];