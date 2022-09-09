import React from 'react';
import { GestureResponderEvent } from 'react-native';
import { FxBox } from '../box/box';
import { FxButton } from '../button/button';
import {
  FxGridSelectorProps,
  FxGridSelector,
} from '../grid-selector/gridSelector';
import { PlusIcon } from '../Icons';
import {
  FxChevronDownIcon,
  FxChevronUpIcon,
  FxSelectIcon,
} from '../icons/icons';
import { FxPressableOpacity } from '../pressable-opacity/pressableOpacity';
import { FxSpacer } from '../spacer/spacer';
import { FxText, FxTextProps } from '../text/text';
import { useFxTheme } from '../theme/useFxTheme';

export type FxHeaderProps = {
  title?: string;
  orderBy?: FxTextProps['children'];
  isOrderAscending?: boolean;
  setIsOrderByAscending?: React.Dispatch<React.SetStateAction<boolean>>;
  onAddPress?: (event: GestureResponderEvent) => void;
} & Partial<FxGridSelectorProps>;

export const FxHeader = ({
  isList,
  setIsList,
  onAddPress,
  title,
  isOrderAscending,
  setIsOrderByAscending,
  orderBy,
  ...rest
}: FxHeaderProps) => {
  const { colors } = useFxTheme();

  return (
    <FxBox
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      {...rest}
    >
      {title ? (
        <FxText color="content1" variant="h200">
          {title}
        </FxText>
      ) : (
        orderBy && (
          <FxPressableOpacity
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            onPress={() => setIsOrderByAscending?.(!isOrderAscending)}
          >
            <FxText color="content1" variant="bodySmallRegular">
              {orderBy}
            </FxText>
            <FxSpacer width={4} />
            {isOrderAscending ? (
              <FxChevronUpIcon fill={colors.content1} width={16} height={16} />
            ) : (
              <FxChevronDownIcon
                marginTop="4"
                fill={colors.content1}
                width={16}
                height={16}
              />
            )}
          </FxPressableOpacity>
        )
      )}
      <FxBox alignItems={'center'} flexDirection="row">
        <FxSelectIcon fill={colors.content3} />
        <FxSpacer width={12} />
        {setIsList && typeof isList === 'boolean' && (
          <FxGridSelector isList={isList} setIsList={setIsList} />
        )}
        <FxSpacer width={12} />
        {onAddPress && (
          <FxButton
            onPress={onAddPress}
            width={40}
            icon={<PlusIcon fill={'white'} />}
          />
        )}
      </FxBox>
    </FxBox>
  );
};
