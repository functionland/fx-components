import React, { useEffect, useRef, useState } from 'react';
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel';
import {
  FxBox,
  FxPressableOpacity,
  FxText,
  FxChevronLeftIcon,
  FxChevronRightIcon,
  APP_HORIZONTAL_PADDING,
  WINDOW_WIDTH,
  useFxTheme,
} from '@functionland/component-library';
import { useSettingsStore } from '../stores';
import { EHomeInteractionType } from '../models';
import HomeBoxSetupDark from '../app/icons/home-blox-setup-dark.svg';
import HomeBoxSetupLight from '../app/icons/home-blox-setup-light.svg';
import OfficeBloxUnitDark from '../app/icons/office-blox-unit-dark.svg';
import OfficeBloxUnitLight from '../app/icons/office-blox-unit-light.svg';

const DATA = [
  {
    mode: EHomeInteractionType.HomeBloxSetup,
    title: 'Home Blox Setup',
    darkIcon: HomeBoxSetupDark,
    lightIcon: HomeBoxSetupLight,
  },
  {
    mode: EHomeInteractionType.OfficeBloxUnit,
    title: 'Office Blox Unit',
    darkIcon: OfficeBloxUnitDark,
    lightIcon: OfficeBloxUnitLight,
  },
];

type TBloxInteraction = {
  onModeChange: (mode: EHomeInteractionType) => void;
};

export const BloxInteraction = ({ onModeChange }: TBloxInteraction) => {
  const carouselRef = useRef<ICarouselInstance>(null);
  const { colorScheme } = useSettingsStore((store) => ({
    colorScheme: store.colorScheme,
  }));
  const { colors } = useFxTheme();
  const [selectedMode, setSelectedMode] = useState(0);

  const swipePrevious = () => {
    carouselRef?.current?.prev();
  };

  const swipeNext = () => {
    carouselRef?.current?.next();
  };

  useEffect(() => {
    onModeChange(DATA[selectedMode].mode);
  }, [onModeChange, selectedMode]);

  return (
    <FxBox position="relative">
      <Carousel
        ref={carouselRef}
        defaultIndex={0}
        loop={false}
        width={WINDOW_WIDTH - APP_HORIZONTAL_PADDING * 2}
        height={200}
        panGestureHandlerProps={{
          activeOffsetX: [-10, 10],
        }}
        data={DATA}
        renderItem={({ item }) => {
          const Icon = colorScheme === 'dark' ? item.darkIcon : item.lightIcon;
          return (
            <FxBox height="100%" flexDirection="column" alignItems="center">
              <Icon />
              <FxText variant="bodyLargeRegular" marginTop="12">
                {item.title}
              </FxText>
            </FxBox>
          );
        }}
        onSnapToItem={(index) => setSelectedMode(index)}
      />
      <FxPressableOpacity position="absolute" top={48} onPress={swipePrevious}>
        <FxChevronLeftIcon
          fill={
            selectedMode === 0 ? colors.backgroundSecondary : colors.content1
          }
          width={24}
          height={24}
        />
      </FxPressableOpacity>
      <FxPressableOpacity
        position="absolute"
        right={0}
        top={48}
        onPress={swipeNext}
      >
        <FxChevronRightIcon
          fill={
            selectedMode === DATA.length - 1
              ? colors.backgroundSecondary
              : colors.content1
          }
          width={24}
          height={24}
        />
      </FxPressableOpacity>
    </FxBox>
  );
};
