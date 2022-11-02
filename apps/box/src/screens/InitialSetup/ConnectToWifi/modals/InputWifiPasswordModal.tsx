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
  ssid: string;
  onConnect: (ssid: string, password: string) => void;
};

export const InputWifiPasswordModal = React.forwardRef<
  FxBottomSheetModalMethods,
  TInputWifiPasswordModalProps
>((_, ref) => {
  const [password, setPassword] = useState<string>('');

  const handleConnect = () => {
    _.onConnect(_.ssid, password);
  };

  return (
    <FxBottomSheetModal ref={ref}>
      <FxBox paddingTop="48" paddingBottom="20">
        <FxText variant="h200">{`Enter password for "${_.ssid}"`}</FxText>
        <FxSpacer height={40} />
        <FxTextInput
          caption="Password"
          autoFocus
          secureTextEntry
          isBottomSheetInput
          value={password}
          onChangeText={setPassword}
        />
        <FxSpacer height={40} />
        <FxButton
          size="large"
          disabled={password.length ? false : true}
          onPress={handleConnect}
        >
          Connect
        </FxButton>
      </FxBox>
    </FxBottomSheetModal>
  );
});
