import { TextProps, VariantProps } from '@shopify/restyle';
import { FxTheme } from './theme';

type ButtonClassType = {
  // Variant that will be passed to button pressable
  button: VariantProps<FxTheme, 'buttonVariants'>;
  // theme definitions that will be passed to FxText
  text: VariantProps<FxTheme, 'textVariants'> &
    Pick<TextProps<FxTheme>, 'color'>;
};

export const FxButtonClasses: Record<
  'default' | 'inverted' | 'disabled' | 'pressed',
  ButtonClassType
> = {
  default: {
    button: { variant: undefined },
    text: {
      variant: 'bodyXSSemibold',
      color: 'white',
    },
  },
  inverted: {
    button: { variant: 'inverted' },
    text: {
      variant: 'bodyXSSemibold',
      color: 'greenBase',
    },
  },
  disabled: {
    button: { variant: 'disabled' },
    text: {
      variant: 'bodyXSSemibold',
      color: 'border',
    },
  },
  pressed: {
    button: { variant: 'pressed' },
    text: {
      variant: 'bodyXSSemibold',
      color: 'white',
    },
  },
};
