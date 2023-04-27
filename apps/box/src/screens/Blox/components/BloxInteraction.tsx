import React, { Dispatch, SetStateAction, useEffect, useRef } from 'react';
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
  FxChevronDownIcon,
} from '@functionland/component-library';
import { useSettingsStore } from '../../../stores';
import { EBloxInteractionType } from '../../../models';
import { bloxInteractions } from '../../../api/blox';
import { useUserProfileStore } from 'apps/box/src/stores/useUserProfileStore';
import { CircleFilledIcon, HubIcon } from 'apps/box/src/components';

type TBloxInteraction = {
  selectedMode: EBloxInteractionType;
  setSelectedMode: Dispatch<SetStateAction<EBloxInteractionType>>;
  onConnectionPress?: () => void
};

export const BloxInteraction = ({
  selectedMode,
  setSelectedMode,
  onConnectionPress
}: TBloxInteraction) => {
  const carouselRef = useRef<ICarouselInstance>(null);
  const { colorScheme } = useSettingsStore((store) => ({
    colorScheme: store.colorScheme,
  }));
  const { colors } = useFxTheme();
  const selectedIndex = bloxInteractions.findIndex(
    (interaction) => interaction.mode === selectedMode
  );
  const [fulaIsReady, checkBloxConnection, bloxConnectionStatus] = useUserProfileStore((state) => [
    state.fulaIsReady,
    state.checkBloxConnection,
    state.bloxConnectionStatus
  ]);

  useEffect(() => {
    if (fulaIsReady) {
      checkConnectionStatus()
    }
  }, [fulaIsReady])

  const checkConnectionStatus = async () => {
    try {
      await checkBloxConnection()
    } catch (error) {
      console.log(error)
    }
  }
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
              <FxPressableOpacity
                flexDirection="row"
                alignItems="center"
                paddingVertical='4'
                onPress={onConnectionPress}
              >
                <CircleFilledIcon
                  color={
                    bloxConnectionStatus === 'CONNECTED' ? 'successBase' :
                      (bloxConnectionStatus === 'PENDING' ? 'warningBase' : 'errorBase')
                  }
                />
                <FxText
                  paddingStart='4'
                  color={
                    bloxConnectionStatus === 'CONNECTED' ? 'successBase' :
                      (bloxConnectionStatus === 'PENDING' ? 'warningBase' : 'errorBase')
                  }
                >
                  {bloxConnectionStatus.toString()}

                </FxText>
                <FxChevronDownIcon
                  width={16}
                  height={16}
                  marginLeft="4"
                  fill={colors.content1}
                />
              </FxPressableOpacity>

              <FxBox marginTop='12'>

                <FxText>

                </FxText>
              </FxBox>
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
