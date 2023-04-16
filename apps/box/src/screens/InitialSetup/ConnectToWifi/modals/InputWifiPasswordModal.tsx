import React, { useState } from 'react';
import * as RNLocalize from 'react-native-localize';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxButton,
  FxSpacer,
  FxText,
  FxTextInput,
  useToast,
} from '@functionland/component-library';
import { EConnectionStatus } from '../../../../models';
import { postWifiConnect } from '../../../../api/wifi';

type TInputWifiPasswordModalProps = {
  ssid: string;
  onConnect: (ssid: string) => void;
};

export const InputWifiPasswordModal = React.forwardRef<
  FxBottomSheetModalMethods,
  TInputWifiPasswordModalProps
>((_, ref) => {
  const { queueToast } = useToast();
  const [connectionStatus, setConnectionStatus] =
    useState<EConnectionStatus>(null);
  const [password, setPassword] = useState<string>('');

  const connectWifi = async () => {
    try {
      setConnectionStatus(EConnectionStatus.connecting);
     const result= await postWifiConnect({
        ssid: _.ssid,
        password,
        countryCode: RNLocalize.getCountry(),
      });
      console.log('postWifiConnect',result)
      queueToast({
        title: 'Unable to connect to wifi',
        message:result.statusText,
        type: 'error',
        autoHideDuration: 5000,
      });
     
    } catch (err) {
      console.log('connectWifi',err)
      setConnectionStatus(EConnectionStatus.connected);
      _.onConnect?.(_?.ssid);
    }
  };

  return (
    <FxBottomSheetModal ref={ref} keyboardShouldPersistTaps="handled">
      <FxBox paddingTop="48" paddingBottom="20">
        <FxText variant="h200">{`Enter password for "${_.ssid}"`}</FxText>
        <FxSpacer height={40} />
        <FxTextInput
          caption="Password"
          secureTextEntry
          isBottomSheetInput
          value={password}
          onChangeText={setPassword}
        />
        <FxSpacer height={40} />
        <FxButton
          size="large"
          disabled={
            connectionStatus === EConnectionStatus.connecting ||
            (password.length ? false : true)
          }
          onPress={connectWifi}
        >
          {connectionStatus === EConnectionStatus.connecting
            ? 'Connecting'
            : 'Connect'}
        </FxButton>
      </FxBox>
    </FxBottomSheetModal>
  );
});
