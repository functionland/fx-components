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
  useFxTheme,
} from '@functionland/component-library';
import { ActivityIndicator, FlatList, ListRenderItem, StyleSheet } from 'react-native';
import { SmallHeaderText, SubHeaderText } from '../../components/Text';
import Zeroconf from 'react-native-zeroconf';
import { MDNSBloxService, TBloxProperty } from '../../models';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { Helper } from '../../utils';
import { useLogger, useRootNavigation } from '../../hooks';
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

  const [appPeerId, setAppPeerId, signiture, password] = useUserProfileStore(
    (state) => [
      state.appPeerId,
      state.setAppPeerId,
      state.signiture,
      state.password,
    ]
  );
  const [
    bloxs = {},
    bloxsPropertyInfo = {},
    addBlox,
    removeBlox,
    updateBloxStore,
  ] = useBloxsStore((state) => [
    state.bloxs,
    state.bloxsPropertyInfo,
    state.addBlox,
    state.removeBlox,
    state.update,
  ]);
  
  // Fixed this line - the correct useState syntax with type
  const [checkboxState, setCheckboxState] = React.useState<Record<string, boolean>>({});

  let uniqueDevices = new Map();
  useEffect(() => {
    zeroconf.on('start', () => {
      setScanning(true);
      setData([]);
      uniqueDevices = new Map();
      clearTimeout(mDnsTimer.current);
      mDnsTimer.current = setTimeout(() => {
        zeroconf.stop();
        setScanning(false);
      }, 6000);
      console.log('The scan has started.\n\r');
    });
    zeroconf.on('resolved', (resolved: MDNSBloxService) => {
      // Check if the hardwareId has already been seen
      if (!uniqueDevices.has(resolved.txt?.hardwareID)) {
        // If it's a new hardwareId, add to the Map and update state
        uniqueDevices.set(resolved.txt?.hardwareID, true);
        setData((prev) => [
          resolved,
          ...prev.filter(
            (device) => device.txt?.hardwareID !== resolved.txt?.hardwareID
          ),
        ]); // This also ensures to remove any previously added duplicate
      }
      console.log('The scan has resolved.\n\r', resolved);
    });
    if (!appPeerId) {
      generateAppPeerId();
    }
    scanMDNS();

    // Cleanup function to remove event listeners
    return () => {
      zeroconf.removeAllListeners('start');
      zeroconf.removeAllListeners('resolved');
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
    zeroconf.stop();
    zeroconf.scan('fulatower', 'tcp', 'local.');
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
          <FxText variant="bodySmallLight">{item.txt?.bloxPeerIdString}</FxText>
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
        </FxCard>
      );
    },
    [bloxs, appPeerId, t]
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