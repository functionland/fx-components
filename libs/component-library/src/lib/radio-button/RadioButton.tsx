import {
  createRestyleComponent,
  createVariant,
  VariantProps,
} from '@shopify/restyle';
import * as React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { FxBox } from '../box/box';
import { FxCheckIcon } from '../icons/icons';
import {
  FxPressableOpacity,
  FxPressableOpacityProps,
} from '../pressable-opacity/pressableOpacity';
import { FxTheme } from '../theme/theme';
import { useFxTheme } from '../theme/useFxTheme';
import type { $Omit } from './../types';

import { useRadioButtonContext, ValueType } from './RadioButtonGroup';
import { handlePress, isChecked } from './utils';

const radioVariant = createVariant({
  themeKey: 'radioVariants',
  property: 'variant',
});

const FxRadioBase = createRestyleComponent<
  React.ComponentProps<typeof Animated.View> &
    VariantProps<FxTheme, 'radioVariants', 'variant'>,
  FxTheme
>([radioVariant], Animated.View);

const radioCheckmarkVariant = createVariant({
  themeKey: 'radioCheckmarkVariants',
  property: 'type',
});

const FxRadioDot = createRestyleComponent<
  React.ComponentProps<typeof FxBox> &
    VariantProps<FxTheme, 'radioCheckmarkVariants', 'type'>,
  FxTheme
>([radioCheckmarkVariant], FxBox);

type RadioButtonProps = React.ComponentProps<typeof FxRadioBase> &
  $Omit<FxPressableOpacityProps, 'children'> & {
    /**
     * Value of the radio button
     */
    value: ValueType;
    /**
     * Status of radio button.
     */
    status?: 'checked' | 'unchecked';
    /**
     * Whether radio is disabled.
     */
    disabled?: boolean;
    /**
     * Function to execute on internal onPress.
     */
    onPress?: () => void;
  };

/**
 * ## Usage
 * ```js
 * import * as React from 'react';
 * import { View } from 'react-native';
 * import { RadioButton } from '@functionland/component-library';
 *
 * const MyComponent = () => {
 *   const [checked, setChecked] = React.useState('first');
 *
 *   return (
 *     <View>
 *       <RadioButton
 *         value="first"
 *         status={ checked === 'first' ? 'checked' : 'unchecked' }
 *         onPress={() => setChecked('first')}
 *       />
 *       <RadioButton
 *         value="second"
 *         status={ checked === 'second' ? 'checked' : 'unchecked' }
 *         onPress={() => setChecked('second')}
 *       />
 *     </View>
 *   );
 * };
 *
 * export default MyComponent;
 * ```
 */

const RADIO_SIZE = 18;
const CHECKBOX_SIZE = 20;
const BORDER_WIDTH = 1;
const BORDER_WIDTH_CHECKED = 6;

const RadioButton = ({
  disabled,
  onPress,
  value,
  status,
  variant,
  ...rest
}: RadioButtonProps) => {
  const theme = useFxTheme();
  const { value: contextValue, onValueChange } = useRadioButtonContext();
  const checked =
    isChecked({
      contextValue,
      status,
      value,
    }) === 'checked';
  const isMultiSelect = typeof contextValue === 'object';
  const type =
    disabled && checked
      ? 'pressedDisabled'
      : disabled
      ? 'disabled'
      : checked
      ? 'pressed'
      : variant;

  const { current: borderAnim } = React.useRef<Animated.Value>(
    new Animated.Value(
      checked
        ? isMultiSelect
          ? CHECKBOX_SIZE / 2
          : BORDER_WIDTH_CHECKED
        : BORDER_WIDTH
    )
  );

  const { current: radioAnim } = React.useRef<Animated.Value>(
    new Animated.Value(1)
  );

  const isFirstRendering = React.useRef<boolean>(true);

  React.useEffect(() => {
    // Do not run animation on very first rendering
    if (isFirstRendering.current) {
      isFirstRendering.current = false;
      return;
    }

    if (checked) {
      const duration = isMultiSelect ? 150 : 250;
      radioAnim.setValue(2.5);

      Animated.timing(radioAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();

      Animated.timing(borderAnim, {
        toValue: isMultiSelect ? CHECKBOX_SIZE / 2 : BORDER_WIDTH_CHECKED,
        duration,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(borderAnim, {
        toValue: BORDER_WIDTH,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [checked, borderAnim, radioAnim, isMultiSelect]);

  return (
    <FxPressableOpacity
      borderRadius="l"
      accessibilityRole="radio"
      accessibilityState={{ disabled, checked }}
      accessibilityLiveRegion="polite"
      hitSlop={0}
      {...rest}
      onPress={
        disabled
          ? undefined
          : () => {
              handlePress({
                onPress,
                onValueChange,
                value,
                contextValue,
              });
            }
      }
    >
      <FxRadioBase
        variant={type}
        style={[
          isMultiSelect ? s.checkbox : s.radio,
          {
            borderWidth: borderAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            s.radioContainer,
            {
              transform: [{ scale: radioAnim }],
            },
          ]}
        >
          {isMultiSelect ? (
            <FxCheckIcon
              color={
                theme.radioCheckmarkVariants[type || 'defaults']
                  .backgroundColor as keyof typeof theme.colors
              }
              height={(CHECKBOX_SIZE * 8) / 5}
              width={(CHECKBOX_SIZE * 8) / 5}
            />
          ) : (
            <FxRadioDot type={type} style={s.dot} />
          )}
        </Animated.View>
      </FxRadioBase>
    </FxPressableOpacity>
  );
};

RadioButton.displayName = 'RadioButton';

const s = StyleSheet.create({
  radioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    height: RADIO_SIZE,
    width: RADIO_SIZE,
    borderRadius: RADIO_SIZE / 2,
  },
  dot: {
    height: RADIO_SIZE / 3,
    width: RADIO_SIZE / 3,
    borderRadius: RADIO_SIZE / 6,
  },
  checkbox: {
    height: CHECKBOX_SIZE,
    width: CHECKBOX_SIZE,
    borderRadius: CHECKBOX_SIZE / 5,
  },
});

export default RadioButton;

export { RadioButton, RadioButtonProps };
