import React, { Dispatch, SetStateAction } from 'react';
import {
  FxPressableOpacity,
  FxText,
  FxInvertedCheckIcon,
  useFxTheme,
} from '@functionland/component-library';

type TWifiDeviceItem = {
  ssid: string;
  selected: boolean;
  setSelectedWifiDevice: Dispatch<SetStateAction<string>>;
};

export const WifiDeviceItem = ({
  ssid,
  selected,
  setSelectedWifiDevice,
}: TWifiDeviceItem) => {
  const theme = useFxTheme();

  const handlePress = () => {
    setSelectedWifiDevice(ssid);
  };

  return (
    <FxPressableOpacity
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      onPress={handlePress}
    >
      <FxText variant="bodyMediumRegular" paddingVertical="16">
        {ssid}
      </FxText>
      {selected && (
        <FxInvertedCheckIcon
          width={20}
          height={20}
          fill={theme.colors.primary}
        />
      )}
    </FxPressableOpacity>
  );
};
