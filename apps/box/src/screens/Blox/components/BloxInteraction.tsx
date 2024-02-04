import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
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
import OfficeBloxUnitDark from '../../../app/icons/office-blox-unit-dark.svg';
import OfficeBloxUnitLight from '../../../app/icons/office-blox-unit-light.svg';

import { useBloxsStore, useSettingsStore } from '../../../stores';
import { EBloxInteractionType, TBloxInteraction } from '../../../models';
import { CircleFilledIcon } from 'apps/box/src/components';

type TBloxInteractionProps = {
  bloxs: TBloxInteraction[];
  selectedMode: EBloxInteractionType;
  setSelectedMode?: Dispatch<SetStateAction<EBloxInteractionType>>;
  onConnectionPress?: () => void;
  onBloxChange?: (index: number) => void;
  onBloxPress?: (peerId: string) => void;
};

export const BloxInteraction = ({
  selectedMode,
  bloxs,
  setSelectedMode,
  onConnectionPress,
  onBloxChange,
  onBloxPress,
}: TBloxInteractionProps) => {
  const carouselRef = useRef<ICarouselInstance>(null);
  const { colorScheme } = useSettingsStore((store) => ({
    colorScheme: store.colorScheme,
  }));
  const { colors } = useFxTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [bloxsConnectionStatus] = useBloxsStore(
    (state) => [state.bloxsConnectionStatus]
  );

  // useEffect(() => {
  //   if (fulaIsReady && currentBloxPeerId) {
  //     checkConnectionStatus()
  //   }
  // }, [fulaIsReady, currentBloxPeerId])

  // const checkConnectionStatus = async () => {
  //   try {
  //     await checkBloxConnection()
  //   } catch (error) {
  //     console.log(error)
  //   }
  // }
  const swipePrevious = () => {
    carouselRef?.current?.prev();
  };

  const swipeNext = () => {
    carouselRef?.current?.next();
  };
  const onSnapToItem = (index: number) => {
    setSelectedIndex(index);
    onBloxChange?.(index);
  };
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
        data={bloxs}
        renderItem={({ item }) => {
          const Icon =
            colorScheme === 'dark'
              ? item.darkIcon || OfficeBloxUnitDark
              : item.lightIcon || OfficeBloxUnitLight;
          return (
            <FxPressableOpacity
              onPress={() => onBloxPress?.(item.peerId)}
              height="100%"
              flexDirection="column"
              alignItems="center"
            >
              <Icon />
              <FxText variant="bodyLargeRegular" marginTop="12">
                {item.title}
              </FxText>
              <FxPressableOpacity
                flexDirection="row"
                alignItems="center"
                paddingVertical="4"
                onPress={onConnectionPress}
              >
                <CircleFilledIcon
                  color={
                    bloxsConnectionStatus[item.peerId] === 'CONNECTED'
                      ? 'successBase'
                      : bloxsConnectionStatus[item.peerId] === 'PENDING'
                      ? 'warningBase'
                      : 'errorBase'
                  }
                />
                <FxText
                  paddingStart="4"
                  color={
                    bloxsConnectionStatus[item.peerId] === 'CONNECTED'
                      ? 'successBase'
                      : bloxsConnectionStatus[item.peerId] === 'PENDING'
                      ? 'warningBase'
                      : 'errorBase'
                  }
                >
                  {bloxsConnectionStatus[item.peerId]?.toString() ||
                    'CHECKING'}
                </FxText>
                <FxChevronDownIcon
                  width={16}
                  height={16}
                  marginLeft="4"
                  fill={colors.content1}
                />
              </FxPressableOpacity>
            </FxPressableOpacity>
          );
        }}
        //onSnapToItem={(index) => setSelectedMode?.(bloxInteractions[index]?.mode)}
        onSnapToItem={onSnapToItem}
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
            selectedIndex === bloxs?.length - 1
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
