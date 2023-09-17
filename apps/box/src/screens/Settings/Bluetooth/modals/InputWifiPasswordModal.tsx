import React, { useState } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxButton,
  FxSpacer,
  FxText,
  FxTextInput,
} from '@functionland/component-library';

type TInputWifiPasswordModalProps = {
  connect: (ssid: string, password: string) => void;
};

export const InputWifiPasswordModal = React.forwardRef<
  FxBottomSheetModalMethods,
  TInputWifiPasswordModalProps
>(({ connect }, ref) => {
  const [ssid, setSSID] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const connectWifi = async () => {
    connect?.(ssid, password);
  };

  return (
    <FxBottomSheetModal ref={ref} keyboardShouldPersistTaps="handled">
      <FxBox paddingTop="48" paddingBottom="20">
        <FxText variant="h200">{`Enter SSID and password`}</FxText>
        <FxSpacer height={40} />
        <FxTextInput
          caption="SSID"
          isBottomSheetInput
          value={ssid}
          onChangeText={setSSID}
        />
        <FxSpacer height={16} />
        <FxTextInput
          caption="Password"
          secureTextEntry
          isBottomSheetInput
          value={password}
          onChangeText={setPassword}
        />

        <FxSpacer height={40} />
        <FxButton size="large" onPress={connectWifi} disabled={!ssid || !password}>
          Send command
        </FxButton>
      </FxBox>
    </FxBottomSheetModal>
  );
});
