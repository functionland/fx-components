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
  onPress: VoidFunction;
};

export const SettingMenuItem = ({
  name,
  detail,
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
    >
      <FxText variant="bodyMediumRegular">{name}</FxText>
      <FxBox flexDirection="row" alignItems="center">
        <FxText variant="bodyXXSRegular" marginRight="8">
          {detail}
        </FxText>
        <FxChevronRightIcon color="content1" />
      </FxBox>
    </FxCard>
  );
};
