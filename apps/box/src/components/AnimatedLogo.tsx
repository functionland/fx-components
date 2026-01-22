import { FxBox, FxReanimatedBox } from '@functionland/component-library';
import React from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withDecay,
} from 'react-native-reanimated';
import { Logo } from './Icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { clamp, withBouncing } from 'react-native-redash';

/**
 * This is an example component of how to utilize react-native-gesture-handler with react-native-reanimated
 */

type Bounds = {
  low: number;
  high: number;
};

const LOGO_WIDTH = 105;
const LOGO_HEIGHT = 102;

export const AnimatedLogo = () => {
  const boundsX = useSharedValue<Bounds>({ low: 0, high: 0 });
  const boundsY = useSharedValue<Bounds>({ low: 0, high: 0 });
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const calcBounds = (
    layoutCoord: number,
    dim: number,
    lowCoord: number,
    highCoord: number
  ) => {
    const low = lowCoord - layoutCoord;
    const high = highCoord - (layoutCoord + dim);

    return [low, high];
  };

  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = clamp(
        offsetX.value + event.translationX,
        boundsX.value.low,
        boundsX.value.high
      );
      translateY.value = clamp(
        offsetY.value + event.translationY,
        boundsY.value.low,
        boundsY.value.high
      );
    })
    .onEnd((event) => {
      translateX.value = withBouncing(
        withDecay({
          velocity: event.velocityX,
        }),
        boundsX.value.low,
        boundsX.value.high
      );
      translateY.value = withBouncing(
        withDecay({
          velocity: event.velocityY,
        }),
        boundsY.value.low,
        boundsY.value.high
      );
    });
  const panStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: clamp(
            translateX.value,
            boundsX.value.low,
            boundsX.value.high
          ),
        },
        {
          translateY: clamp(
            translateY.value,
            boundsY.value.low,
            boundsY.value.high
          ),
        },
      ],
    };
  });

  return (
    <FxBox
      flex={3}
      marginHorizontal="16"
      justifyContent="center"
      alignItems="center"
      onLayout={(evt) => {
        const layout = evt.nativeEvent.layout;

        const logox = layout.x + layout.width / 2 - LOGO_WIDTH / 2;
        const logoy = layout.y + layout.height / 2 - LOGO_HEIGHT / 2;

        const xBounds = calcBounds(
          logox,
          LOGO_WIDTH,
          layout.x,
          layout.x + layout.width
        );
        const yBounds = calcBounds(
          logoy,
          LOGO_HEIGHT,
          layout.y,
          layout.y + layout.height
        );
        boundsX.value = { low: xBounds[0], high: xBounds[1] };
        boundsY.value = { low: yBounds[0], high: yBounds[1] };
      }}
    >
      <GestureDetector gesture={panGesture}>
        <FxReanimatedBox style={panStyle}>
          <Logo color="greenBase" />
        </FxReanimatedBox>
      </GestureDetector>
    </FxBox>
  );
};
