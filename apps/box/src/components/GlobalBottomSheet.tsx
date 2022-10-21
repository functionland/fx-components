import React from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxPressableOpacity,
  FxText,
  useFxTheme,
  APP_HORIZONTAL_PADDING,
} from '@functionland/component-library';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants/layout';
import { HubIcon } from '../components';
import { useRootNavigation } from '../hooks';
import { Routes } from '../navigation/navigationConfig';

const MENUS = [
  {
    id: 'Hub',
    label: 'Hub',
    icon: HubIcon,
    route: Routes.Hub,
  },
];

type GlobalBottomSheetProps = {
  closeBottomSheet: VoidFunction;
};

export const GlobalBottomSheet = React.forwardRef<
  FxBottomSheetModalMethods,
  GlobalBottomSheetProps
>((_, ref) => {
  const navigation = useRootNavigation();
  const theme = useFxTheme();
  const itemWidth = (SCREEN_WIDTH - APP_HORIZONTAL_PADDING * 2) / 4;

  return (
    <FxBottomSheetModal ref={ref}>
      <FxBox height={SCREEN_HEIGHT * 0.75}>
        <FxText variant="bodyMediumRegular">Modules</FxText>
        <FxBox paddingVertical="20">
          {MENUS.map((item) => {
            const Icon = item.icon;
            return (
              <FxPressableOpacity
                key={item.id}
                width={itemWidth}
                alignItems="center"
                marginVertical="4"
                paddingVertical="4"
                onPress={() => {
                  _.closeBottomSheet();
                  navigation.navigate(Routes.Hub);
                }}
              >
                <Icon fill={theme.colors.primary} />
                <FxText marginTop="4">{item.label}</FxText>
              </FxPressableOpacity>
            );
          })}
        </FxBox>
      </FxBox>
    </FxBottomSheetModal>
  );
});
