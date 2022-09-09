import { RadioButtonContextType, ValueType } from './RadioButtonGroup';

export const handlePress = ({
  onPress,
  value,
  onValueChange,
  contextValue,
}: {
  onPress?: () => void;
  value: ValueType;
  onValueChange?: (value: any) => void;
  contextValue?: RadioButtonContextType<ValueType>['value'];
}) => {
  if (onPress && onValueChange) {
    console.warn(
      `onPress in the scope of RadioButtonGroup will not be executed, use onValueChange instead`
    );
  }

  !onValueChange
    ? onPress?.()
    : typeof contextValue === 'object'
    ? contextValue.find((v) => v === value)
      ? onValueChange(contextValue.filter((v) => v !== value))
      : onValueChange([...contextValue, value])
    : onValueChange(value);
};

export const isChecked = ({
  value,
  status,
  contextValue,
}: {
  value: ValueType;
  status?: 'checked' | 'unchecked';
  contextValue?: RadioButtonContextType<ValueType>['value'];
}) => {
  if (contextValue !== undefined && contextValue !== null) {
    return contextValue === value ||
      (typeof contextValue === 'object' &&
        contextValue.find((v) => v === value))
      ? 'checked'
      : 'unchecked';
  } else {
    return status;
  }
};
