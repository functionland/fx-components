import React from 'react';
import {
  FxChevronRightIcon,
  FxBox,
  FxCard,
  FxText,
} from '@functionland/component-library';

type TSettingMenuItemProps = {
  name: string;
  detail: string;
  disable?: boolean;
  onPress: VoidFunction;
};

export const SettingMenuItem = ({
  name,
  detail,
  disable,
  onPress,
}: TSettingMenuItemProps) => {
  return (
    <FxCard
      flexDirection="row"
      justifyContent="space-between"
      marginTop="8"
      paddingHorizontal="16"
      paddingVertical="16"
      onPress={onPress}
      disabled={disable}
    >
      <FxBox>
        <FxText variant="bodyMediumRegular">{name}</FxText>
        {detail &&<FxText variant="bodyXSRegular" marginEnd='8'>
          {detail}
        </FxText>}
      </FxBox>
      <FxBox flexDirection="row" alignItems="center">
        <FxChevronRightIcon color="content1" />
      </FxBox>
    </FxCard>
  );
};
