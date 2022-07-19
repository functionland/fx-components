import {
  FxBox,
  FxDownArrowIcon,
  FxText,
} from '@functionland/component-library';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { clamp } from 'react-native-redash';

const ReanimatedBox = Reanimated.createAnimatedComponent(FxBox);
const HEIGHT = 40;
const TOUCHABLE_WIDTH = 40;

type Bounds = {
  low: number;
  high: number;
};

interface UsageBarProps {
  isEditable?: boolean;
}

export const UsageBar = ({ isEditable }: UsageBarProps) => {
  const boundsX = useSharedValue<Bounds>({ low: 0, high: 0 });
  const translateX = useSharedValue(200); // arbitrarily initialized; needs to be replaced with real data
  const usagePercent = useDerivedValue(
    () =>
      ((translateX.value + TOUCHABLE_WIDTH / 2) /
        (boundsX.value.high + TOUCHABLE_WIDTH / 2)) *
      100
  );
  const [poolUsage, setPoolUsage] = useState(0);

  const calculatePoolUsage = () => setPoolUsage(Math.round(usagePercent.value));

  const onGestureEvent = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    {
      offsetX: number;
    }
  >({
    onStart: (_, ctx) => {
      ctx.offsetX = translateX.value;
    },
    onActive: (event, ctx) => {
      translateX.value = clamp(
        ctx.offsetX + event.translationX,
        boundsX.value.low,
        boundsX.value.high
      );

      runOnJS(calculatePoolUsage)();
    },
  });

  const panStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: translateX.value,
      },
    ],
  }));

  const poolUsageStyle = useAnimatedStyle(() => ({
    width: `${usagePercent.value}%`,
  }));

  return (
    <>
      <FxBox
        height={HEIGHT}
        flexDirection="row"
        marginVertical="8"
        marginHorizontal="24"
        onLayout={(evt) => {
          const layout = evt.nativeEvent.layout;
          boundsX.value = {
            low: -TOUCHABLE_WIDTH / 2,
            high: layout.width - TOUCHABLE_WIDTH / 2,
          };
          setTimeout(() => calculatePoolUsage(), 0);
        }}
      >
        {isEditable && (
          <PanGestureHandler onGestureEvent={onGestureEvent}>
            <ReanimatedBox
              style={panStyle}
              zIndex="foreground"
              position="absolute"
              width={TOUCHABLE_WIDTH}
              height="100%"
            />
          </PanGestureHandler>
        )}
        <ReanimatedBox
          style={poolUsageStyle}
          backgroundColor="greenPressed"
          borderTopLeftRadius="s"
          borderBottomLeftRadius="s"
          overflow="hidden"
        />
        <FxBox
          backgroundColor="backgroundSecondary"
          width={isEditable ? 2 : 1}
          zIndex="foreground"
          pointerEvents="none"
        >
          {isEditable && <Divider />}
        </FxBox>
        <FxBox
          backgroundColor="greenHover"
          flexGrow={1}
          borderTopRightRadius="s"
          borderBottomRightRadius="s"
        />
      </FxBox>
      <FxText>Pool Usage: {poolUsage}%</FxText>
    </>
  );
};

const Divider = () => (
  <FxBox position="absolute" top={-12}>
    <FxBox style={styles.dividerArrow}>
      <FxDownArrowIcon color="content1" />
    </FxBox>
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
