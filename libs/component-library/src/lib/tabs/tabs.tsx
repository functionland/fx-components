import React from 'react';
import { FxBox, FxReanimatedBox } from '../box/box';
import {
  FxPressableOpacity,
  FxPressableOpacityProps,
} from '../pressable-opacity/pressableOpacity';
import { FxText } from '../text/text';
import {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { FxSpacer } from '../spacer/spacer';
import { StyleSheet, View } from 'react-native';
import { ColorProps } from '@shopify/restyle';
import { FxTheme } from '../theme/theme';

const ANIMATION_DURATION = 150;

type ColorOverrideType = ColorProps<FxTheme> & {
  color: keyof FxTheme['colors'];
};

const SELECTED_TEXT: ColorOverrideType = { color: 'greenBase' };
const AUTO_PRESSED: ColorOverrideType = { color: 'border' };
const FIXED_PRESSED: ColorOverrideType = {
  color: 'backgroundSecondary',
};

const FIXED_TAB_STYLES: FxPressableOpacityProps = {
  borderBottomWidth: 2,
  borderBottomColor: 'content3',
  paddingVertical: '16',
};

const AUTO_TAB_STYLES: FxPressableOpacityProps = {
  paddingVertical: '8',
};

const VARIANT_STYLES = {
  fixed: {
    defaults: FIXED_TAB_STYLES,
    pressedText: FIXED_PRESSED,
    pressedBackground: {
      backgroundColor: 'backgroundPrimary',
      borderBottomColor: 'backgroundSecondary',
    } as FxPressableOpacityProps,
  },
  auto: {
    defaults: AUTO_TAB_STYLES,
    pressedText: AUTO_PRESSED,
    pressedBackground: {} as FxPressableOpacityProps,
  },
};

type TabProps = {
  text: string;
  selected: boolean;
  onPress: () => void;
  variant: 'auto' | 'fixed';
};

const Tab = ({ text, selected, onPress, variant }: TabProps) => {
  const [pressed, setPressed] = React.useState<boolean>(false);

  const backgroundOverrides = pressed
    ? VARIANT_STYLES[variant].pressedBackground
    : {};

  let textOverrides = pressed ? VARIANT_STYLES[variant].pressedText : {};
  textOverrides = { ...textOverrides, ...(selected ? SELECTED_TEXT : {}) };

  return (
    <FxPressableOpacity
      onPress={onPress}
      disabled={selected}
      hitSlop={0}
      alignItems="center"
      justifyContent="center"
      onPressIn={() => {
        setPressed(true);
      }}
      onPressOut={() => {
        setPressed(false);
      }}
      {...VARIANT_STYLES[variant].defaults}
      {...backgroundOverrides}
      style={(args) => [
        args.pressed && {
          opacity: 1,
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
  variant?: 'fixed' | 'auto';
};
export const FxTabs = ({
  items,
  selectedIdx = 0,
  onSelect,
  animate = true,
  animationDuration = ANIMATION_DURATION,
  variant = 'fixed',
}: FxTabsProps) => {
  const translateX = useSharedValue(0);
  const highlightWidth = useSharedValue<number>(0);
  const selectedLayout = useSharedValue<{ x: number; width: number }>({
    x: 0,
    width: 0,
  });
  const itemLayouts = React.useRef<Array<{ x: number; width: number }>>([]);

  React.useEffect(() => {
    if (itemLayouts.current[selectedIdx]) {
      selectedLayout.value = itemLayouts.current[selectedIdx];
    }
  }, [selectedIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabsItems = items.map((item, idx) => {
    return (
      <View
        key={idx}
        style={styles[variant]}
        onLayout={(event) => {
          const { x, width } = event.nativeEvent.layout;
          itemLayouts.current[idx] = {
            x: x,
            width: width,
          };

          if (idx === selectedIdx) {
            selectedLayout.value = { x: x, width: width };
          }
        }}
      >
        <Tab
          text={item}
          selected={idx === selectedIdx}
          onPress={() => selectHandler(idx)}
          variant={variant}
        />
      </View>
    );
  });

  // This handles computing what value to translate to and detecting
  // if we have had a chance to measure the width of the Tab Bar. This
  // logic is also used to prevent us from running the animation on the
  // first render.
  useAnimatedReaction(
    () => {
      return {
        translateValue: selectedLayout.value.x,
        width: selectedLayout.value.width,
        hasMeasured: selectedLayout.value.width > 0,
      };
    },
    (data, prevData) => {
      if (!prevData?.hasMeasured || !animate) {
        translateX.value = data.translateValue;
        highlightWidth.value = data.width;
      } else {
        translateX.value = withTiming(data.translateValue, {
          duration: animationDuration,
        });
        highlightWidth.value = withTiming(data.width, {
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
      width: highlightWidth.value,
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <FxBox flexDirection="row">
      {variant === 'auto'
        ? tabsItems.reduce((acc, cur) => {
            if (!acc) {
              return cur;
            } else {
              return (
                <>
                  {acc}
                  <FxSpacer width={24} />
                  {cur}
                </>
              );
            }
          })
        : tabsItems}
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

const styles = StyleSheet.create({
  fixed: {
    flex: 1,
  },
  auto: {},
});
