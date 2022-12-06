import React, { useRef, useState } from 'react';
import {
  FxBox,
  FxButton,
  FxLoadingSpinner,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
  FxBottomSheetModalMethods,
} from '@functionland/component-library';
import { FlatList } from 'react-native';
import { WifiDeviceItem } from './components/WifiDeviceItem';
import { InputWifiPasswordModal } from './modals/InputWifiPasswordModal';
import { useInitialSetupNavigation, useFetch } from '../../../hooks';
import { getWifiList } from '../../../api/wifi';
import { Routes } from '../../../navigation/navigationConfig';
import BloxWifiDevice from '../../../app/icons/blox-wifi-device.svg';

const ItemSeparatorComponent = () => {
  return <FxBox height={1} backgroundColor="backgroundSecondary" />;
};

export const ConnectToWifiScreen = () => {
  const navigation = useInitialSetupNavigation();
  const inputWifiPasswordModalRef = useRef<FxBottomSheetModalMethods>(null);
  const [selectedSsid, setSelectedSsid] = useState<string>(null);
  const [connectedSsid, setConnectedSsid] = useState<string>(null);
  const {
    loading,
    // error,
    data: networks,
  } = useFetch({ apiMethod: getWifiList });
  const ssids = networks?.data
    .map(({ ssid: network }) => network)
    .filter((ssid) => ssid)
    .sort();
  const uniqueSsids = [...new Set(ssids)];

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    navigation.navigate(Routes.SetupComplete);
  };

  const handleSelectedWifiDevice = (ssid: string) => {
    inputWifiPasswordModalRef.current.present();
    setSelectedSsid(ssid);
  };

  const handleOnConnectWifi = (ssid: string) => {
    inputWifiPasswordModalRef.current.close();
    setConnectedSsid(ssid);
    handleNext();
  };

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={80} />
      <FxBox flex={1} justifyContent="center" alignItems="center">
        <BloxWifiDevice />
      </FxBox>
      <FxBox>
        <FxText variant="h300" marginBottom="12">
          Connect to Wi-Fi
        </FxText>
        {loading ? (
          <FxBox flexDirection="row" alignItems="center" marginBottom="8">
            <FxLoadingSpinner />
            <FxText variant="bodySmallRegular" marginLeft="4">
              Searching Wi-Fi Network
            </FxText>
          </FxBox>
        ) : (
          <FxText variant="bodySmallRegular" marginBottom="8">
            Select Wi-Fi Network
          </FxText>
        )}
        <FxBox
          height={180}
          borderColor="border"
          borderWidth={1}
          borderRadius="s"
          paddingHorizontal="16"
        >
          <FlatList
            data={uniqueSsids}
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
      </FxBox>
      <InputWifiPasswordModal
        ssid={selectedSsid}
        ref={inputWifiPasswordModalRef}
        onConnect={handleOnConnectWifi}
      />
    </FxSafeAreaBox>
  );
};
