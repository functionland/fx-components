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

const MENUS = [
  {
    id: 'Hub',
    label: 'Hub',
    icon: HubIcon,
  },
];

export const GlobalBottomSheet = React.forwardRef<FxBottomSheetModalMethods>(
  (_, ref) => {
    const theme = useFxTheme();
    const itemWidth = (SCREEN_WIDTH - APP_HORIZONTAL_PADDING * 2) / 4;

    return (
      <FxBottomSheetModal ref={ref}>
        <FxBox height={SCREEN_HEIGHT * 0.75}>
          <FxText variant="bodyMediumRegular">Menu</FxText>
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
  }
);
