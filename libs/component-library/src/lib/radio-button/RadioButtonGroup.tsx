import React from 'react';
import { View } from 'react-native';

type ValueType = string | number;

type SingleValueProps<T> = {
  /**
   * Function to execute on selection change.
   */
  onValueChange: (value: T) => void;
  /**
   * Value of the currently selected radio button.
   */
  value: T;
};

type MultiValueProps<T> = {
  onValueChange: (value: T[]) => void;
  value: T[];
};

type Props<T extends ValueType> = (SingleValueProps<T> | MultiValueProps<T>) & {
  /**
   * React elements containing radio buttons.
   */
  children: React.ReactNode;
};

type RadioButtonContextType<T extends ValueType> = Omit<Props<T>, 'children'>;

const initialContext: RadioButtonContextType<ValueType> = {
  value: '',
  onValueChange: () => null,
};

export const RadioButtonContext =
  React.createContext<RadioButtonContextType<ValueType>>(initialContext);

export const useRadioButtonContext = () => React.useContext(RadioButtonContext);

/**
 * Radio button group allows to control a group of radio buttons.
 *
 * ## Usage
 * ```jsx
 * import React from 'react';
 * import { View, Text } from 'react-native';
 * import { RadioButton } from '@functionland/component-library';
 *
 * const MyComponent = () => {
 *   const [value, setValue] = React.useState('first');
 *
 *   return (
 *     <RadioButton.Group onValueChange={newValue => setValue(newValue)} value={value}>
 *       <View>
 *         <Text>First</Text>
 *         <RadioButton value="first" />
 *       </View>
 *       <View>
 *         <Text>Second</Text>
 *         <RadioButton value="second" />
 *       </View>
 *     </RadioButton.Group>
 *   );
 * };
 *
 * export default MyComponent;
 *```
 */
const RadioButtonGroup = ({
  value,
  onValueChange,
  children,
}: Props<ValueType>) => (
  <RadioButtonContext.Provider value={{ value, onValueChange }}>
    <View accessibilityRole="radiogroup">{children}</View>
  </RadioButtonContext.Provider>
);

RadioButtonGroup.displayName = 'RadioButton.Group';
export default RadioButtonGroup;

export { RadioButtonGroup, ValueType, RadioButtonContextType };
