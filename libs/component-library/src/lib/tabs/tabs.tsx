import React from 'react';
import { FxBox, FxReanimatedBox } from '../box/box';
import {
  FxPressableOpacity,
  FxPressableOpacityProps,
} from '../pressable-opacity/pressableOpacity';
import { FxText, FxTextProps } from '../text/text';
import {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { FxSpacer } from '../spacer/spacer';
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
  hitSlop: 0,
};

const AUTO_TAB_STYLES: FxPressableOpacityProps = {
  paddingVertical: '8',
  hitSlop: 16,
};

const FIXED_TEXT_STYLES: FxTextProps = {
  variant: 'bodySmallRegular',
};

const AUTO_TEXT_STYLES: FxTextProps = {
  variant: 'bodyMediumRegular',
};

const VARIANT_STYLES = {
  fixed: {
    defaults: FIXED_TAB_STYLES,
    defaultsText: FIXED_TEXT_STYLES,
    pressedText: FIXED_PRESSED,
    pressedBackground: {
      backgroundColor: 'backgroundPrimary',
      borderBottomColor: 'backgroundSecondary',
    } as FxPressableOpacityProps,
  },
  auto: {
    defaults: AUTO_TAB_STYLES,
    defaultsText: AUTO_TEXT_STYLES,
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
  const [pressed, setPressed] = React.useState(false);

  const backgroundOverrides = pressed
    ? VARIANT_STYLES[variant].pressedBackground
    : {};

  // let textOverrides = pressed ? VARIANT_STYLES[variant].pressedText : {};
  // textOverrides = { ...textOverrides, ...(selected ? SELECTED_TEXT : {}) };

  const textOverrides = {
    ...(pressed ? VARIANT_STYLES[variant].pressedText : {}),
    ...(selected ? SELECTED_TEXT : {}),
  };

  return (
    <FxPressableOpacity
      onPress={onPress}
      disabled={selected}
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
      <FxText
        color="content3"
        {...VARIANT_STYLES[variant].defaultsText}
        {...textOverrides}
      >
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
  const highlightWidth = useSharedValue(0);
  const selectedLayout = useSharedValue({
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
    const isAuto = variant === 'auto';
    const isLast = idx === items.length - 1;
    const renderSpacer = isAuto && !isLast;

    return (
      <React.Fragment key={idx}>
        <FxBox
          flex={isAuto ? undefined : 1}
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
        </FxBox>
        {renderSpacer && <FxSpacer width={24} />}
      </React.Fragment>
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
      {tabsItems}
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
