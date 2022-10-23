import {
  FxBox,
  FxDownArrowIcon,
  FxReanimatedBox,
} from '@functionland/component-library';
import React from 'react';
import { StyleSheet } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import {
  runOnJS,
  SharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import { clamp } from 'react-native-redash';

const HEIGHT = 40;
const TOUCHABLE_WIDTH = 40;
const TOUCHABLE_HEIGHT = HEIGHT + 12;

type Bounds = {
  low: number; // screen coord
  high: number; // screen coord
};

export type UsageBarUsage = {
  usage: number;
  color: string;
};

// converts percentage into x coordinate value based on bounds of usage bar
const fromPercentage = (_percentage: number, { high, low }: Bounds) => {
  'worklet';
  const usageWidth = high - low;
  return low + (usageWidth * _percentage) / 100;
};

// converts x coordinate into percentage value based on bounds of usage bar
const toPercentage = (_pos: number, { high }: Bounds) => {
  'worklet';
  return ((_pos + TOUCHABLE_WIDTH / 2) / (high + TOUCHABLE_WIDTH / 2)) * 100;
};

// converts the space usage percentage into width value based on size of the
// usage bar.
const calculateLayoutWidth = (
  totalCapacity: number,
  space: number,
  bounds: Bounds
) => {
  'worklet';
  const width = bounds.high - bounds.low;
  const spacePercent = space / totalCapacity;
  return width * spacePercent;
};

interface UsageBarProps {
  isEditable?: boolean;
  /**
   * Percentage of the division as a reanimated SharedValue number. e.g 50
   */
  divisionPercent: SharedValue<number>;
  totalCapacity: number;
  usages?: [Array<UsageBarUsage>, Array<UsageBarUsage>];
  onEditStart?: () => void;
  onEditEnd?: (percentage: number) => void;
}
export const UsageBar = ({
  isEditable,
  divisionPercent,
  usages = [[], []],
  totalCapacity,
  onEditStart,
  onEditEnd,
}: UsageBarProps) => {
  const [usageFirst, usageSecond] = usages;
  const [boundsX, setBoundsX] = React.useState<Bounds>({ low: 0, high: 0 });

  const dividerX = useDerivedValue(() => {
    return fromPercentage(divisionPercent.value, boundsX);
  });

  const editStartHandler = () => {
    onEditStart && onEditStart();
  };
  const editEndHandler = (percentage: number) => {
    onEditEnd && onEditEnd(percentage);
  };

  // calculates the bounds of the division split so that
  // the divider isn't dragged into used space.
  const clampBoundaries = useDerivedValue<Bounds>(() => {
    const low =
      boundsX.low +
      usageFirst.reduce((prev, cur) => {
        return prev + calculateLayoutWidth(totalCapacity, cur.usage, boundsX);
      }, 0);
    const high =
      boundsX.high -
      usageSecond.reduce((prev, cur) => {
        return prev + calculateLayoutWidth(totalCapacity, cur.usage, boundsX);
      }, 0);
    return {
      low: toPercentage(low, boundsX),
      high: toPercentage(high, boundsX),
    };
  }, [boundsX, usageFirst, usageSecond]);

  const onGestureEvent = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    {
      offsetX: number;
    }
  >({
    onStart: (_, ctx) => {
      ctx.offsetX = dividerX.value;
      runOnJS(editStartHandler)();
    },
    onActive: (event, ctx) => {
      const percentage = clamp(
        toPercentage(ctx.offsetX + event.translationX, boundsX),
        clampBoundaries.value.low,
        clampBoundaries.value.high
      );
      divisionPercent.value = percentage;
    },
    onEnd: (event, ctx) => {
      const percentage = clamp(
        toPercentage(ctx.offsetX + event.translationX, boundsX),
        clampBoundaries.value.low,
        clampBoundaries.value.high
      );
      runOnJS(editEndHandler)(percentage);
    },
  });

  const panStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: dividerX.value,
      },
    ],
  }));

  const dividerStyle = useAnimatedStyle(() => ({
    left: dividerX.value + TOUCHABLE_WIDTH / 2 - 1,
  }));

  const poolUsageStyle = useAnimatedStyle(() => ({
    width: `${divisionPercent.value}%`,
  }));

  return (
    <FxBox
      height={HEIGHT}
      flexDirection="row"
      marginVertical="8"
      onLayout={(e) => {
        const layout = e.nativeEvent.layout;
        const newBounds = {
          low: -TOUCHABLE_WIDTH / 2,
          high: layout.width - TOUCHABLE_WIDTH / 2,
        };

        setBoundsX(newBounds);
      }}
    >
      {isEditable && (
        <PanGestureHandler onGestureEvent={onGestureEvent}>
          <FxReanimatedBox
            zIndex="foreground"
            position="absolute"
            alignItems="center"
            width={TOUCHABLE_WIDTH}
            height={TOUCHABLE_HEIGHT}
            style={[panStyle, { marginTop: HEIGHT - TOUCHABLE_HEIGHT }]}
          />
        </PanGestureHandler>
      )}
      <FxReanimatedBox
        style={poolUsageStyle}
        backgroundColor="greenPressed"
        borderTopLeftRadius="s"
        borderBottomLeftRadius="s"
        overflow="hidden"
        flexDirection="row"
      >
        {usageFirst.map((u, idx) => (
          <FxBox
            key={idx}
            width={calculateLayoutWidth(totalCapacity, u.usage, boundsX)}
            style={{ backgroundColor: u.color }}
          />
        ))}
      </FxReanimatedBox>
      <FxReanimatedBox
        backgroundColor="backgroundSecondary"
        width={isEditable ? 2 : 1}
        zIndex="foreground"
        pointerEvents="none"
        position="absolute"
        style={dividerStyle}
      >
        {isEditable && <Divider />}
      </FxReanimatedBox>
      <FxBox
        borderTopRightRadius="s"
        borderBottomRightRadius="s"
        overflow="hidden"
        flexDirection="row"
        flex={1}
      >
        {usageSecond.map((u, idx) => (
          <FxBox
            key={idx}
            width={calculateLayoutWidth(totalCapacity, u.usage, boundsX)}
            style={{ backgroundColor: u.color }}
          />
        ))}
        <FxBox
          backgroundColor="greenHover"
          flexGrow={1}
          borderTopRightRadius="s"
          borderBottomRightRadius="s"
        />
      </FxBox>
    </FxBox>
  );
};

const Divider = () => (
  <FxBox position="absolute" top={-12}>
    <FxDownArrowIcon color="content1" style={styles.dividerArrow} />
    <FxBox
      backgroundColor="white"
      width={1}
      height={HEIGHT + 2}
      style={styles.dividerBar}
    />
  </FxBox>
);

const styles = StyleSheet.create({
  dividerBar: {
    transform: [
      {
        translateX: 0.5,
      },
    ],
  },
  dividerArrow: {
    marginBottom: 2,
    transform: [
      {
        translateX: -6,
      },
    ],
  },
});
