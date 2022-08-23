import React from 'react';
import { FxBox } from '../box/box';
import { GridIcon, ListIcon } from '../Icons';
import { FxPressableOpacity } from '../pressable-opacity/pressableOpacity';
import { FxSpacer } from '../spacer/spacer';
import { useFxTheme } from '../theme/useFxTheme';
import { configureEaseInOutLayoutAnimation } from '../utils/animations';

export type FxGridSelectorProps = {
  isList: boolean;
  disabled?: boolean;
  animated?: boolean;
  setIsList: React.Dispatch<React.SetStateAction<boolean>>;
} & React.ComponentProps<typeof FxBox>;

export const FxGridSelector = ({
  isList,
  setIsList,
  disabled,
  animated = true,
  ...rest
}: FxGridSelectorProps) => {
  const { colors } = useFxTheme();
  const disabledColor = disabled ? colors.backgroundPrimary : undefined;

  const setIsListWithAnimation = (bool: boolean) => () => {
    setIsList(bool);
    animated && configureEaseInOutLayoutAnimation();
  };
  return (
    <FxBox alignItems={'center'} flexDirection="row" {...rest}>
      <FxPressableOpacity
        disabled={disabled}
        onPress={setIsListWithAnimation(true)}
      >
        <ListIcon fill={isList ? colors.greenBase : colors.content3} />
      </FxPressableOpacity>
      <FxSpacer width={12} />
      <FxPressableOpacity
        disabled={disabled}
        onPress={setIsListWithAnimation(false)}
      >
        <GridIcon
          fill={disabledColor || (isList ? colors.content3 : colors.greenBase)}
        />
      </FxPressableOpacity>
    </FxBox>
  );
};
