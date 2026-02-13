import React from 'react';
import {
  FxBox,
  FxAvatar,
  FxText,
  FxPressableOpacity,
  FxChevronDownIcon,
  FxGridIcon,
  useFxTheme,
  FxSvg,
  FxSvgProps,
} from '@functionland/component-library';
import { useNavigation } from '@react-navigation/native';
import { Routes } from '../../../navigation/navigationConfig';
import { DynamicIcon } from '../../../components/Icons';

const PLUS_ICON_PATH = "M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z";

type TBloxHeader = {
  selectedMode: EBloxInteractionType;
  onChangeMode: VoidFunction;
  onAvatarPress?: VoidFunction;
};

export const BloxHeader = ({ selectedMode, onChangeMode, onAvatarPress }: TBloxHeader) => {
  const { colors } = useFxTheme();
  const navigation = useNavigation();

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
      </FxPressableOpacity>

      <FxBox flexDirection="row" alignItems="center">
        <FxPressableOpacity
          onPress={() => navigation.navigate(Routes.BloxManager as never)}
          marginRight="12"
        >
          <FxGridIcon
            width={24}
            height={24}
            fill={colors.content1}
          />
        </FxPressableOpacity>
        <FxPressableOpacity
          onPress={() => navigation.navigate(Routes.InitialSetup, {
            screen: Routes.LinkPassword,
          })}
          marginRight="12"
        >
          <DynamicIcon 
            iconPath={PLUS_ICON_PATH}
            fill={colors.content1}
            width={24}
            height={24}
          />
        </FxPressableOpacity>
        <FxAvatar
          source={require('../../../api/mockAssets/sample.png')}
          size="small"
          onPress={onAvatarPress}
        />
      </FxBox>
    </FxBox>
  );
};
