import { useTheme } from '@shopify/restyle';
import React from 'react';
import { FxBox } from '../box/box';
import { GridIcon, ListIcon } from '../Icons';
import { FxPressableOpacity } from '../pressable-opacity/pressableOpacity';
import { FxSpacer } from '../spacer/spacer';
import { FxTheme } from '../theme/theme';

export type FxGridSelectorProps = {
  isList: boolean;
  setIsList: React.Dispatch<React.SetStateAction<boolean>>;
} & React.ComponentProps<typeof FxBox>;

export const FxGridSelector = ({
  isList,
  setIsList,
  ...rest
}: FxGridSelectorProps) => {
  const { colors } = useTheme<FxTheme>();
  return (
    <FxBox alignItems={'center'} flexDirection="row" {...rest}>
      <FxPressableOpacity onPress={() => setIsList(true)}>
        <ListIcon fill={isList ? colors.greenBase : colors.content3} />
      </FxPressableOpacity>
      <FxSpacer width={12} />
      <FxPressableOpacity onPress={() => setIsList(false)}>
        <GridIcon fill={isList ? colors.content3 : colors.greenBase} />
      </FxPressableOpacity>
    </FxBox>
  );
};
