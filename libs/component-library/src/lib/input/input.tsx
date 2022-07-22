import React, { useMemo, useState } from 'react';
import {
  BoxProps,
  boxRestyleFunctions,
  composeRestyleFunctions,
  TextProps,
  textRestyleFunctions,
  useRestyle,
  useTheme,
} from '@shopify/restyle';
import { FxTheme } from '../theme/theme';
import { FxTextInputClasses } from '../theme/inputClasses';
import { TextInput, TextInputProps } from 'react-native';

type FxTextInputProps = TextProps<FxTheme> &
  BoxProps<FxTheme> &
  TextInputProps & {
    disabled?: boolean;
    error?: boolean;
  };

type FxTextInputRestyleProps = Omit<FxTextInputProps, 'disabled' | 'error'>;

const restyleFunctions = composeRestyleFunctions<
  FxTheme,
  FxTextInputRestyleProps
>([...textRestyleFunctions, ...boxRestyleFunctions]);

const FxTextInput = ({ disabled, error, ...rest }: FxTextInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const variant = useMemo(() => {
    if (disabled) return 'disabled';
    else if (error) return 'error';
    else if (isFocused) return 'active';
    return 'default';
  }, [disabled, error, isFocused]);
  const variantStyles = FxTextInputClasses[variant];
  const { onFocus, onBlur, ...restyleProps } = useRestyle(restyleFunctions, {
    ...variantStyles,
    ...rest,
  } as FxTextInputRestyleProps);
  const { colors } = useTheme<FxTheme>();
  const placeHolderTextColor = colors[variantStyles.placeholderTextColor];
  const selectionColor = colors[variantStyles.selectionColor];

  return (
    <TextInput
      onFocus={(e) => {
        setIsFocused(true);
        if (onFocus) onFocus(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        if (onBlur) onBlur(e);
      }}
      editable={!disabled}
      placeholderTextColor={placeHolderTextColor}
      selectionColor={selectionColor}
      blurOnSubmit
      {...restyleProps}
    />
  );
};

export { FxTextInput };
