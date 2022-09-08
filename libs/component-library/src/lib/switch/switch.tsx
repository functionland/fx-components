import React from 'react';
import {
  createBox,
  createRestyleComponent,
  createVariant,
  VariantProps,
} from '@shopify/restyle';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  SwitchProps,
} from 'react-native';
import { FxTheme } from '../theme/theme';
import { FxReanimatedBox } from '../box/box';
import {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';

const TRACK_SIZE = 40;
const THUMB_SIZE_OFFSET = 3;
const THUMB_SIZE = TRACK_SIZE / 2 - THUMB_SIZE_OFFSET * 2;

type Bounds = {
  low: number; // screen coord
  high: number; // screen coord
};

const switchTrackVariant = createVariant({
  themeKey: 'switchTrackVariants',
  property: 'variant',
});

const PressableBox = createBox<FxTheme, PressableProps>(Pressable);

const FxSwitchTrack = createRestyleComponent<
  React.ComponentProps<typeof PressableBox> &
    Pick<SwitchProps, 'value' | 'onValueChange' | 'disabled'> &
    VariantProps<FxTheme, 'switchTrackVariants', 'variant'>,
  FxTheme
>([switchTrackVariant], PressableBox);

const dropdownTextVariant = createVariant({
  themeKey: 'switchThumbVariants',
  property: 'type',
});

const FxSwitchThumb = createRestyleComponent<
  React.ComponentProps<typeof FxReanimatedBox> &
    VariantProps<FxTheme, 'switchThumbVariants', 'type'>,
  FxTheme
>([dropdownTextVariant], FxReanimatedBox);

export type FxSwitchProps = React.ComponentProps<typeof FxSwitchTrack>;

const FxSwitch = ({
  variant,
  value,
  onValueChange,
  disabled,
  ...rest
}: FxSwitchProps) => {
  const xBounds = useDerivedValue<Bounds>(() => ({
    low: THUMB_SIZE_OFFSET,
    high: TRACK_SIZE - THUMB_SIZE - THUMB_SIZE_OFFSET,
  }));
  const type =
    disabled && !!value
      ? 'pressedDisabled'
      : disabled
      ? 'disabled'
      : value
      ? 'pressed'
      : variant;

  const onPress = () => !disabled && onValueChange?.(!value);

  const thumbPosition = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withSpring(
          type === 'pressed' || type === 'pressedDisabled'
            ? xBounds.value.high
            : xBounds.value.low
        ),
      },
    ],
  }));

  return (
    <FxSwitchTrack
      variant={type}
      style={styles.track}
      onPress={onPress}
      hitSlop={{ top: 0, right: 0, bottom: 0, left: 0 }}
      accessibilityRole="switch"
      accessibilityState={{ disabled, checked: value }}
      accessibilityLiveRegion="polite"
      {...rest}
    >
      <FxSwitchThumb type={type} style={[thumbPosition, styles.thumb]} />
    </FxSwitchTrack>
  );
};

const styles = StyleSheet.create({
  track: {
    borderRadius: TRACK_SIZE / 2,
    height: TRACK_SIZE / 2,
    justifyContent: 'center',
    width: TRACK_SIZE,
  },
  thumb: {
    borderRadius: THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
});

export { FxSwitch };
