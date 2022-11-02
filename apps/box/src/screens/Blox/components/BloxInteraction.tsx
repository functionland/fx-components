import React, { Dispatch, SetStateAction, useRef } from 'react';
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
import { useSettingsStore } from '../../../stores';
import { EBloxInteractionType } from '../../../models';
import { bloxInteractions } from '../../../api/blox';

type TBloxInteraction = {
  selectedMode: EBloxInteractionType;
  setSelectedMode: Dispatch<SetStateAction<EBloxInteractionType>>;
};

export const BloxInteraction = ({
  selectedMode,
  setSelectedMode,
}: TBloxInteraction) => {
  const carouselRef = useRef<ICarouselInstance>(null);
  const { colorScheme } = useSettingsStore((store) => ({
    colorScheme: store.colorScheme,
  }));
  const { colors } = useFxTheme();
  const selectedIndex = bloxInteractions.findIndex(
    (interaction) => interaction.mode === selectedMode
  );

  const swipePrevious = () => {
    carouselRef?.current?.prev();
  };

  const swipeNext = () => {
    carouselRef?.current?.next();
  };

  return (
    <FxBox position="relative">
      <Carousel
        ref={carouselRef}
        defaultIndex={selectedIndex}
        loop={false}
        width={WINDOW_WIDTH - APP_HORIZONTAL_PADDING * 2}
        height={200}
        panGestureHandlerProps={{
          activeOffsetX: [-10, 10],
        }}
        data={bloxInteractions}
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
        onSnapToItem={(index) => setSelectedMode(bloxInteractions[index].mode)}
      />
      <FxPressableOpacity position="absolute" top={48} onPress={swipePrevious}>
        <FxChevronLeftIcon
          fill={
            selectedIndex === 0 ? colors.backgroundSecondary : colors.content1
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
            selectedIndex === bloxInteractions.length - 1
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
