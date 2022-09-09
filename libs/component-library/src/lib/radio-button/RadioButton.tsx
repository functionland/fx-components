import * as React from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import {
  FxPressableOpacity,
  FxPressableOpacityProps,
} from '../pressable-opacity/pressableOpacity';
import { useFxTheme } from '../theme/useFxTheme';

import type { $Omit } from './../types';

import { useRadioButtonContext, ValueType } from './RadioButtonGroup';
import { handlePress, isChecked } from './utils';

const RADIO_SIZE = 18;

type RadioButtonProps = $Omit<FxPressableOpacityProps, 'children'> & {
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
  /**
   * Custom color for radio.
   */
  checkedColor?: string;
  /**
   * Custom color for unchecked radio.
   */
  uncheckedColor?: string;
  /**
   * Custom color for radio.
   */
  checkedDisabledColor?: string;
  /**
   * Custom color for unchecked disabled radio.
   */
  uncheckedDisabledColor?: string;
  /**
   * Custom color for unchecked disabled radio.
   */
  uncheckedDisabledBackgroundColor?: string;
};

const BORDER_WIDTH = 1;
const BORDER_WIDTH_CHECKED = 6;

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

const RadioButton = ({
  disabled,
  onPress,
  value,
  status,
  ...rest
}: RadioButtonProps) => {
  const { colors } = useFxTheme();
  const { value: contextValue, onValueChange } = useRadioButtonContext();
  const checked =
    isChecked({
      contextValue,
      status,
      value,
    }) === 'checked';
  const { current: borderAnim } = React.useRef<Animated.Value>(
    new Animated.Value(checked ? BORDER_WIDTH_CHECKED : BORDER_WIDTH)
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
      radioAnim.setValue(2.5);

      Animated.timing(radioAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      Animated.timing(borderAnim, {
        toValue: BORDER_WIDTH_CHECKED,
        duration: 250,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(borderAnim, {
        toValue: BORDER_WIDTH,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [checked, borderAnim, radioAnim]);

  const radioBackgroundColor = disabled
    ? rest.uncheckedDisabledBackgroundColor || colors.backgroundSecondary
    : undefined;
  const checkedColor = rest.checkedColor || colors.greenBase;
  const uncheckedColor = rest.uncheckedColor || colors.border;
  const checkedDisabledColor = rest.checkedDisabledColor || colors.greenBorder;
  const uncheckedDisabledColor = rest.uncheckedDisabledColor || colors.border;

  let radioColor: string;
  if (disabled) {
    radioColor = checked ? checkedDisabledColor : uncheckedDisabledColor;
  } else {
    radioColor = checked ? checkedColor : uncheckedColor;
  }

  return (
    <FxPressableOpacity
      borderRadius="l"
      accessibilityRole="radio"
      accessibilityState={{ disabled, checked }}
      accessibilityLiveRegion="polite"
      hitSlop={{ top: 0, right: 0, bottom: 0, left: 0 }}
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
      <Animated.View
        style={[
          s.radio,
          {
            backgroundColor: radioBackgroundColor,
            borderColor: radioColor,
            borderWidth: borderAnim,
          },
        ]}
      >
        {checked ? (
          <View style={[StyleSheet.absoluteFill, s.radioContainer]}>
            <Animated.View
              style={[
                s.dot,
                {
                  backgroundColor: disabled ? colors.border : colors.white,
                  transform: [{ scale: radioAnim }],
                },
              ]}
            />
          </View>
        ) : null}
      </Animated.View>
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
});

export default RadioButton;

export { RadioButton, RadioButtonProps };
