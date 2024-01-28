import React from 'react';
import { BoxProps } from '@shopify/restyle';
import { FxTheme } from '../theme/theme';
import { SliderProps } from '@react-native-community/slider';
import { FxBox, FxReanimatedBox } from '../box/box';
import { StyleSheet, ViewProps, ViewStyle } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { clamp } from 'react-native-redash';
import { FxText } from '../text/text';

const THUMB_SIZE = 24;

type Bounds = {
  low: number; // screen coord
  high: number; // screen coord
};

type FxSliderProps = BoxProps<FxTheme> &
  Pick<
    SliderProps,
    | 'disabled'
    | 'value'
    | 'onValueChange'
    | 'minimumValue'
    | 'maximumValue'
    | 'step'
  > & {
    label?: string;
  };

// converts x coordinate to step percent
const toStep = (x: number, boundsX: Bounds, range: Bounds, step: number) => {
  'worklet';
  if (step === 0) return x / boundsX.high;
  const stepX = step / (range.high - range.low);
  return Math.round(x / boundsX.high / stepX) * stepX;
};

const FxSlider = ({
  disabled,
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 1,
  step = 0,
  label,
  ...rest
}: FxSliderProps) => {
  const boundsX = useSharedValue<Bounds>({ low: 0, high: 0 });
  const range = useDerivedValue(() => ({
    low: minimumValue,
    high: maximumValue,
  }));
  const _translateX = useSharedValue(0);
  const translateX = useDerivedValue(() => {
    if (typeof value === 'undefined') return _translateX.value;
    return (
      ((value - range.value.low) / (range.value.high - range.value.low)) *
      boundsX.value.high
    );
  });
  const labelWidth = useSharedValue(0);
  const labelOpacity = useSharedValue(0);

  const activePanHandler = (val: number) => {
    if (onValueChange) onValueChange(val);
  };

  const onGestureEvent = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    {
      offsetX: number;
    }
  >({
    onStart: (_, ctx) => {
      ctx.offsetX = translateX.value;
      labelOpacity.value = 1;
    },
    onActive: (event, ctx) => {
      _translateX.value = clamp(
        ctx.offsetX + event.translationX,
        boundsX.value.low,
        boundsX.value.high
      );

      const _value = clamp(
        Math.round(
          toStep(_translateX.value, boundsX.value, range.value, step) *
            (range.value.high - range.value.low) +
            range.value.low
        ),
        range.value.low,
        range.value.high
      );

      runOnJS(activePanHandler)(_value);
    },
    onEnd: () => (labelOpacity.value = 0),
  });

  const positionerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    width: `${((translateX.value / boundsX.value.high) * 100).toFixed(2)}%` as any,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -labelWidth.value / 2 + THUMB_SIZE / 2 },
      { translateY: -10 },
    ],
    opacity: labelOpacity.value,
  }));

  return (
    <FxBox
      width="100%"
      height={THUMB_SIZE}
      justifyContent="center"
      opacity={disabled ? 0.5 : 1}
      pointerEvents={disabled ? 'none' : 'auto'}
      onLayout={(e) => {
        const layout = e.nativeEvent.layout;
        boundsX.value = {
          low: 0,
          high: layout.width - THUMB_SIZE,
        };
      }}
      {...rest}
    >
      <Track style={trackStyle} />
      <PanGestureHandler onGestureEvent={onGestureEvent}>
        <FxReanimatedBox position="absolute" style={positionerStyle}>
          <Label
            style={[labelStyle, styles.label]}
            onLayout={(e) => {
              const layout = e.nativeEvent.layout;
              labelWidth.value = layout.width;
            }}
            value={value}
            label={label}
          />
          <Thumb />
        </FxReanimatedBox>
      </PanGestureHandler>
    </FxBox>
  );
};

const Track = ({ style }: { style: ViewStyle }) => (
  <FxBox
    width="100%"
    height={4}
    borderRadius="s"
    backgroundColor="backgroundSecondary"
  >
    <FxReanimatedBox
      height="100%"
      borderRadius="s"
      backgroundColor="greenBase"
      style={style}
    />
  </FxBox>
);

type LabelProps = Pick<FxSliderProps, 'value' | 'label'> &
  Pick<ViewProps, 'style' | 'onLayout'>;

const Label = ({ style, onLayout, value, label }: LabelProps) => (
  <FxReanimatedBox
    backgroundColor="backgroundSecondary"
    borderRadius="s"
    padding="8"
    style={style}
    onLayout={onLayout}
  >
    <FxText variant="bodyXSRegular" color="content1" numberOfLines={1}>
      {value}
      {label ? ` ${label}` : ''}
    </FxText>
  </FxReanimatedBox>
);

const Thumb = () => (
  <FxBox backgroundColor="greenBase" style={styles.thumb}>
    <FxBox backgroundColor="white" style={styles.thumbDot} />
  </FxBox>
);

const styles = StyleSheet.create({
  thumb: {
    alignItems: 'center',
    borderRadius: THUMB_SIZE / 2,
    height: THUMB_SIZE,
    justifyContent: 'center',
    position: 'absolute',
    top: -THUMB_SIZE / 2,
    width: THUMB_SIZE,
  },
  thumbDot: {
    borderRadius: THUMB_SIZE / 6,
    height: THUMB_SIZE / 3,
    width: THUMB_SIZE / 3,
  },
  label: {
    bottom: THUMB_SIZE / 2,
    position: 'absolute',
  },
});

export { FxSlider };
