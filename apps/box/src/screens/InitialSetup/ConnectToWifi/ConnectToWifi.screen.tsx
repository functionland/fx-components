import React, { useRef, useState } from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
  FxBottomSheetModalMethods,
} from '@functionland/component-library';
import { FlatList } from 'react-native';
import * as RNLocalize from 'react-native-localize';
import { WifiDeviceItem } from './components/WifiDeviceItem';
import { InputWifiPasswordModal } from './modals/InputWifiPasswordModal';
import { useInitialSetupNavigation, useFetch } from '../../../hooks';
import { getWifiList, postWifiConnect } from '../../../api/wifi';
import { Routes } from '../../../navigation/navigationConfig';
import BloxWifiDevice from '../../../app/icons/blox-wifi-device.svg';

const ItemSeparatorComponent = () => {
  return <FxBox height={1} backgroundColor="backgroundSecondary" />;
};

export const ConnectToWifiScreen = () => {
  const navigation = useInitialSetupNavigation();
  const inputWifiPasswordModalRef = useRef<FxBottomSheetModalMethods>(null);
  const [selectedSsid, setSelectedSsid] = useState<string>(null);
  const {
    loading,
    // error,
    data: networks,
  } = useFetch({ apiMethod: getWifiList });
  const ssids = networks?.data.map(({ ssid: network }) => network);
  const uniqueSsids = [...new Set(ssids)];

  const connectWifi = async (ssid: string, password: string) => {
    try {
      await postWifiConnect({
        ssid: ssid ?? uniqueSsids[0],
        password,
        countryCode: RNLocalize.getCountry(),
      });
    } catch (err) {}

    navigation.navigate(Routes.CheckConnection, {
      ssid: ssid ?? uniqueSsids[0],
    });
  };

  const goBack = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    inputWifiPasswordModalRef.current.present();
  };

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={200 / 3} />
      <FxBox flex={1} justifyContent="center" alignItems="center">
        <BloxWifiDevice />
      </FxBox>
      <FxBox>
        <FxText variant="h300" marginBottom="12">
          Connect to Wi-Fi
        </FxText>
        <FxText variant="bodySmallRegular" marginBottom="8">
          {loading ? 'Searching Wi-Fi Network' : 'Select Wi-Fi Network'}
        </FxText>
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
                selected={item === selectedSsid}
                setSelectedWifiDevice={setSelectedSsid}
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
            onPress={goBack}
          >
            Back
          </FxButton>
          <FxButton paddingHorizontal="40" onPress={handleNext}>
            Next
          </FxButton>
        </FxBox>
      </FxBox>
      <InputWifiPasswordModal
        ssid={selectedSsid}
        ref={inputWifiPasswordModalRef}
        onConnect={connectWifi}
      />
    </FxSafeAreaBox>
  );
};
