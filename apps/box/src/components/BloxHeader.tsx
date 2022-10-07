import React from 'react';
import {
  FxBox,
  FxAvatar,
  FxText,
  FxPressableOpacity,
  FxChevronDownIcon,
  useFxTheme,
} from '@functionland/component-library';
import { EBloxInteractionType } from '../models';

type TBloxHeader = {
  selectedMode: EBloxInteractionType;
  onChangeMode: VoidFunction;
};

export const BloxHeader = ({ selectedMode, onChangeMode }: TBloxHeader) => {
  const { colors } = useFxTheme();

  return (
    <FxBox
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingHorizontal="20"
      paddingVertical="12"
    >
      <FxPressableOpacity
        flexDirection="row"
        alignItems="center"
        onPress={onChangeMode}
      >
        <FxText variant="h300">
          {selectedMode === EBloxInteractionType.HomeBloxSetup
            ? 'Home Blox Setup'
            : 'Office Blox Unit'}
        </FxText>
        <FxChevronDownIcon
          width={16}
          height={16}
          marginLeft="4"
          fill={colors.content1}
        />
      </FxPressableOpacity>

      <FxAvatar source={require('../api/mockAssets/sample.png')} size="small" />
    </FxBox>
  );
};
