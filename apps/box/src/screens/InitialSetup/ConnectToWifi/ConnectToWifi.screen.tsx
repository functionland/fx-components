import React, { useRef, useState, useEffect } from 'react';
import {
  FxBox,
  FxButton,
  FxLoadingSpinner,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
  FxBottomSheetModalMethods,
  FxRefreshIcon,
  FxRadioButtonWithLabel,
  FxRadioButton,
  FxTextInput,
  FxKeyboardAwareScrollView,
} from '@functionland/component-library';
import { FlatList, PermissionsAndroid, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { WifiDeviceItem } from './components/WifiDeviceItem';
import { InputWifiPasswordModal } from './modals/InputWifiPasswordModal';
import {
  useInitialSetupNavigation,
  useFetch,
  useRootNavigation,
} from '../../../hooks';
import { Routes } from '../../../navigation/navigationConfig';
import BloxWifiDevice from '../../../app/icons/blox-wifi-device.svg';
import { useUserProfileStore } from '../../../stores/useUserProfileStore';
import WifiManager from 'react-native-wifi-reborn';

const ItemSeparatorComponent = () => {
  return <FxBox height={1} backgroundColor="backgroundSecondary" />;
};

export const ConnectToWifiScreen = () => {
  const navigation = useInitialSetupNavigation();
  const rootNavigation = useRootNavigation();
  const inputWifiPasswordModalRef = useRef<FxBottomSheetModalMethods>(null);
  const [selectedSsid, setSelectedSsid] = useState<string>(null);
  const [connectedSsid, setConnectedSsid] = useState<string>(null);
  const [enabledHiddenNetwork, setEnableHiddenNetwork] =
    React.useState<boolean>(false);
  const [appPeerId] = useUserProfileStore((state) => [state.appPeerId]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [networks, setNetworks] = useState({ data: [] });

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      return result === RESULTS.GRANTED;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location permission is required for WiFi connections',
          message:
            'This app needs location permission to scan for wifi networks.',
          buttonNegative: 'DENY',
          buttonPositive: 'ALLOW',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const scanWifiNetworks = async () => {
    try {
      console.log('scan wifi called');
      setLoading(true);
      const permissionGranted = await requestLocationPermission();
      if (!permissionGranted) {
        throw new Error('Location permission denied');
      }
      console.log(permissionGranted);

      const wifiList = await WifiManager.loadWifiList();
      console.log({ wifiList });
      const ssids = wifiList
        .map((network) => network.SSID.replaceAll('"', ''))
        .filter((ssid) => ssid)
        .sort();
      const uniqueSsids = [...new Set(ssids)];
      console.log({ uniqueSsids });
      setNetworks({ data: uniqueSsids });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    scanWifiNetworks();
  }, []);

  // Replace refetch with scanWifiNetworks
  const refetch = async ({ withLoading = true } = {}) => {
    await scanWifiNetworks();
  };
  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    navigation.navigate(Routes.SetupComplete);
  };

  const handleSelectedWifiDevice = (ssid: string) => {
    setSelectedSsid(ssid);
    setTimeout(() => {
      inputWifiPasswordModalRef?.current?.present();
    }, 100);
  };

  const handleOnConnectWifi = (ssid: string) => {
    inputWifiPasswordModalRef?.current?.close();
    setConnectedSsid(ssid);
    handleNext();
  };
  const Container = enabledHiddenNetwork ? FxKeyboardAwareScrollView : FxBox;
  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <Container
        showsVerticalScrollIndicator={false}
        flex={1}
        contentContainerStyle={{
          flexGrow: 1,
        }}
        scrollEnabled={enabledHiddenNetwork}
      >
        <FxProgressBar progress={80} />
        <FxBox flex={1} justifyContent="center" alignItems="center">
          <BloxWifiDevice />
        </FxBox>
        <FxBox flex={1}>
          <FxText variant="h300" marginBottom="12">
            Connect to Wi-Fi
          </FxText>
          <FxButton
            variant={enabledHiddenNetwork ? 'inverted' : undefined}
            paddingVertical="8"
            onPress={() => setEnableHiddenNetwork(!enabledHiddenNetwork)}
          >
            {enabledHiddenNetwork ? "Show Network Names" : "Manually Enter Wifi Name"}
          </FxButton>
          {enabledHiddenNetwork && (
            <FxBox>
              <FxTextInput
                marginVertical="16"
                value={selectedSsid}
                onChange={(e) => setSelectedSsid(e.nativeEvent.text)}
                onSubmitEditing={() => handleSelectedWifiDevice(selectedSsid)}
                placeholder='Enter Wifi Name'
              />
              <FxButton
                onPress={() => {
                  handleSelectedWifiDevice(selectedSsid);
                }}
              >
                Enter Password {selectedSsid ? 'for': ''} {selectedSsid}
              </FxButton>
            </FxBox>
          )}
          {!enabledHiddenNetwork && (
            <>
              {loading ? (
                <FxBox flexDirection="row" alignItems="center" marginBottom="8">
                  <FxLoadingSpinner />
                  <FxText variant="bodySmallRegular" marginLeft="4">
                    Searching Wi-Fi Network
                  </FxText>
                </FxBox>
              ) : (
                <FxBox flexDirection="row">
                  <FxText
                    variant="bodySmallRegular"
                    marginBottom="8"
                    paddingEnd="8"
                  >
                    Select Wi-Fi Network
                  </FxText>
                  <FxRefreshIcon
                    color="white"
                    onPress={() => refetch({ withLoading: true })}
                  />
                </FxBox>
              )}
              <FxBox
                height={180}
                borderColor="border"
                borderWidth={1}
                borderRadius="s"
                paddingHorizontal="16"
              >
                <FlatList
                  data={networks?.data}
                  keyExtractor={(item) => item}
                  ItemSeparatorComponent={() => <ItemSeparatorComponent />}
                  renderItem={({ item }) => (
                    <WifiDeviceItem
                      ssid={item}
                      connected={item === connectedSsid}
                      setSelectedWifiDevice={handleSelectedWifiDevice}
                    />
                  )}
                />
              </FxBox>
            </>
          )}
        </FxBox>
        <FxBox
          flexDirection="row"
          justifyContent="flex-end"
          alignItems="center"
          marginTop="16"
        >
          <FxButton
            variant="inverted"
            paddingHorizontal="20"
            marginRight="12"
            onPress={handleBack}
          >
            Back
          </FxButton>
          <FxButton
            paddingHorizontal="40"
            onPress={handleNext}
            disabled={!connectedSsid}
          >
            Next
          </FxButton>
        </FxBox>
      </Container>
      <InputWifiPasswordModal
        ssid={selectedSsid}
        ref={inputWifiPasswordModalRef}
        onConnect={handleOnConnectWifi}
      />
    </FxSafeAreaBox>
  );
};
