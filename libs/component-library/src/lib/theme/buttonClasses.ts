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
  'default' | 'inverted' | 'disabled',
  ButtonClassType
> = {
  default: {
    button: { variant: undefined },
    text: {
      variant: 'bodyXSSemibold',
      color: 'content1',
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
};
