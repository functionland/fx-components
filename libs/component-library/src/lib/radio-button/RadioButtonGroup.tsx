import React from 'react';
import { View } from 'react-native';

type Props = {
  /**
   * Function to execute on selection change.
   */
  onValueChange: (value: string) => void;
  /**
   * Value of the currently selected radio button.
   */
  value: string;
  /**
   * React elements containing radio buttons.
   */
  children: React.ReactNode;
};

export type RadioButtonContextType = {
  value: string;
  onValueChange: (item: string) => void;
};

const initialContext: RadioButtonContextType = {
  value: '',
  onValueChange: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
};

export const RadioButtonContext =
  React.createContext<RadioButtonContextType>(initialContext);

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
const RadioButtonGroup = ({ value, onValueChange, children }: Props) => (
  <RadioButtonContext.Provider value={{ value, onValueChange }}>
    <View accessibilityRole="radiogroup">{children}</View>
  </RadioButtonContext.Provider>
);

RadioButtonGroup.displayName = 'RadioButton.Group';
export default RadioButtonGroup;

export { RadioButtonGroup };
