import { FxBox } from '@functionland/component-library';
import React from 'react';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Reanimated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { clamp } from 'react-native-redash';

const ReanimatedBox = Reanimated.createAnimatedComponent(FxBox);
const TOUCHABLE_WIDTH = 40;

type Bounds = {
  low: number;
  high: number;
};

export const UsageBar = () => {
  const boundsX = useSharedValue<Bounds>({ low: 0, high: 0 });
  const translateX = useSharedValue(200);
  const usagePercent = useDerivedValue(
    () =>
      ((translateX.value + TOUCHABLE_WIDTH / 2) /
        (boundsX.value.high + TOUCHABLE_WIDTH / 2)) *
      100
  );

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
    <FxBox
      height={40}
      flexDirection="row"
      marginVertical="8"
      marginHorizontal="24"
      onLayout={(evt) => {
        const layout = evt.nativeEvent.layout;
        boundsX.value = {
          low: -TOUCHABLE_WIDTH / 2,
          high: layout.width - TOUCHABLE_WIDTH / 2,
        };
      }}
    >
      <PanGestureHandler onGestureEvent={onGestureEvent}>
        <ReanimatedBox
          style={panStyle}
          zIndex="foreground"
          position="absolute"
          width={TOUCHABLE_WIDTH}
          height="100%"
        />
      </PanGestureHandler>
      <ReanimatedBox
        style={poolUsageStyle}
        backgroundColor="greenPressed"
        borderTopLeftRadius="s"
        borderBottomLeftRadius="s"
      />
      <FxBox backgroundColor="backgroundSecondary" width={1} />
      <FxBox
        backgroundColor="greenHover"
        flexGrow={1}
        borderTopRightRadius="s"
        borderBottomRightRadius="s"
      />
    </FxBox>
  );
};
