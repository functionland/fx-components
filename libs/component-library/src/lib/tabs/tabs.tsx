import { useTheme } from '@shopify/restyle';
import React from 'react';
import { FxBox, FxReanimatedBox } from '../box/box';
import { FxPressableOpacity } from '../pressable-opacity/pressableOpacity';
import { FxText, FxTextProps } from '../text/text';
import { FxTheme } from '../theme/theme';
import {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const ANIMATION_DURATION = 300;
const SELECTED_TEXT: FxTextProps = { color: 'greenBase' };
const PRESSED_TEXT: FxTextProps = { color: 'backgroundSecondary' };

type FixedTabProps = {
  text: string;
  selected: boolean;
  onPress: () => void;
};

const FixedTab = ({ text, selected, onPress }: FixedTabProps) => {
  const theme = useTheme<FxTheme>();
  const [pressed, setPressed] = React.useState<boolean>(false);

  let textOverrides = pressed ? PRESSED_TEXT : {};
  textOverrides = { ...textOverrides, ...(selected ? SELECTED_TEXT : {}) };

  return (
    <FxPressableOpacity
      flex={1}
      onPress={onPress}
      alignItems="center"
      justifyContent="center"
      borderBottomWidth={2}
      borderBottomColor="content3"
      paddingVertical="16"
      disabled={selected}
      hitSlop={0}
      onPressIn={() => {
        setPressed(true);
      }}
      onPressOut={() => {
        setPressed(false);
      }}
      style={(args) => [
        args.pressed && {
          opacity: 1,
          backgroundColor: theme.colors.backgroundPrimary,
          borderBottomColor: theme.colors.backgroundSecondary,
        },
      ]}
    >
      <FxText variant="bodySmallRegular" color="content3" {...textOverrides}>
        {text}
      </FxText>
    </FxPressableOpacity>
  );
};

type FxTabsProps = {
  items: Array<string>;
  selectedIdx?: number;
  onSelect: (idx: number) => void;
  animate?: boolean;
  animationDuration?: number; // ms
};
export const FxTabs = ({
  items,
  selectedIdx = 0,
  onSelect,
  animate = true,
  animationDuration = ANIMATION_DURATION,
}: FxTabsProps) => {
  const translateX = useSharedValue(0);
  const containerWidth = useSharedValue<number>(0);
  const hightlightWidth = useDerivedValue(() => {
    return containerWidth.value / items.length;
  }, [containerWidth, items]);

  // This handles computing what value to translate to and detecting
  // if we have had a chance to measure the width of the Tab Bar. This
  // logic is also used to prevent us from running the animation on the
  // first render.
  useAnimatedReaction(
    () => {
      return {
        translateValue: hightlightWidth.value * selectedIdx,
        hasMeasured: containerWidth.value > 0,
      };
    },
    (data, prevData) => {
      if (!prevData?.hasMeasured || !animate) {
        translateX.value = data.translateValue;
      } else {
        translateX.value = withTiming(data.translateValue, {
          duration: animationDuration,
        });
      }
    }
  );

  const selectHandler = (idx: number) => {
    if (idx !== selectedIdx) {
      onSelect(idx);
    }
  };

  const highlightStyle = useAnimatedStyle(() => {
    return {
      width: hightlightWidth.value,
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <FxBox
      flexDirection="row"
      onLayout={(event) => {
        containerWidth.value = event.nativeEvent.layout.width;
      }}
    >
      {items.map((item, idx) => {
        return (
          <FixedTab
            text={item}
            key={idx}
            selected={idx === selectedIdx}
            onPress={() => selectHandler(idx)}
          />
        );
      })}
      <FxReanimatedBox
        position="absolute"
        height={2}
        backgroundColor="greenBase"
        bottom={0}
        style={highlightStyle}
      />
    </FxBox>
  );
};
