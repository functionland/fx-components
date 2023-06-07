import React, { useRef, useState } from 'react';
import { FxBox } from '@functionland/component-library';

import { SettingMenuItem } from './SettingMenuItem';

export type BleCommandsMenuProps = {
  onPress?: (cmd: string) => void;
  disableAll?: boolean;
};
export const BleCommandsMenu = ({
  disableAll,
  onPress,
}: BleCommandsMenuProps) => {
  const [waitingForReset, setWaitingForReset] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  const handleResetCommandPress = () => {
    onPress?.('reset');
    setWaitingForReset(true);
    timerRef.current = setTimeout(() => {
      setWaitingForReset(false);
    }, 20 * 1000);
  };
  const handleCancelCommandPress = () => {
    onPress?.('cancel');
    clearTimeout(timerRef.current);
    setTimeout(() => {
      setWaitingForReset(false);
    }, 500);
  };
  const menuItems = [
    !waitingForReset
      ? {
          name: 'Reset',
          detail: null,
          onPress: handleResetCommandPress,
          disable: disableAll,
        }
      : {
          name: 'Cancel reset',
          detail: `After reset command you can cancel it in 20 seconds`,
          onPress: handleCancelCommandPress,
        }, // TODO: pull in mode from store when store is implemented
    {
      name: 'Connect to WiFi',
      detail: null,
      onPress: () => onPress?.('connect'),
      disable: waitingForReset || disableAll,
    },
    {
      name: 'Auto-update',
      detail: 'Force enable auto-update after a manual update',
      onPress: () => onPress?.('removedockercpblock'),
      disable: waitingForReset || disableAll,
    },
    {
      name: 'Turn off leds',
      detail: 'Force turn off all leds on the blox',
      onPress: () => onPress?.('stopleds'),
      disable: waitingForReset || disableAll,
    },
  ];

  return (
    <FxBox marginTop="16">
      {menuItems.map(({ name, detail, disable, onPress }) => (
        <SettingMenuItem
          key={name}
          name={name}
          detail={detail}
          onPress={onPress}
          disable={disable}
        />
      ))}
    </FxBox>
  );
};
