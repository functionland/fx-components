import React, { useRef, useState } from 'react';
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
import { FlatList } from 'react-native';
import { WifiDeviceItem } from './components/WifiDeviceItem';
import { InputWifiPasswordModal } from './modals/InputWifiPasswordModal';
import {
  useInitialSetupNavigation,
  useFetch,
  useRootNavigation,
} from '../../../hooks';
import { getWifiList } from '../../../api/wifi';
import { Routes } from '../../../navigation/navigationConfig';
import BloxWifiDevice from '../../../app/icons/blox-wifi-device.svg';
import { useUserProfileStore } from '../../../stores/useUserProfileStore';

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
  const {
    loading,
    error,
    data: networks,
    refetch,
  } = useFetch({ apiMethod: getWifiList });

  const ssids = networks?.data
    ? Array.isArray(networks.data)
      ? networks.data
          .map(({ essid: network }) => network.replaceAll('"', ''))
          .filter((ssid) => ssid)
          .sort()
      : []
    : [];
  const uniqueSsids = [...new Set(ssids)];
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
          <FxRadioButton.Group
            value={enabledHiddenNetwork ? [1] : []}
            onValueChange={(val) => setEnableHiddenNetwork(val && val[0] === 1)}
          >
            <FxRadioButtonWithLabel
              paddingVertical="8"
              label="I want to connect to a hidden network"
              value={1}
            />
          </FxRadioButton.Group>
          {enabledHiddenNetwork && (
            <FxBox>
              <FxTextInput
                marginVertical="16"
                value={selectedSsid}
                onChange={(e) => setSelectedSsid(e.nativeEvent.text)}
                onSubmitEditing={() => handleSelectedWifiDevice(selectedSsid)}
              />
              <FxButton
                onPress={() => {
                  handleSelectedWifiDevice(selectedSsid);
                }}
              >
                Connect
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
