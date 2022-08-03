import { BoxProps, TextProps, VariantProps } from '@shopify/restyle';
import { merge, cloneDeep } from 'lodash';
import { FxTheme } from './theme';

type ButtonClassType = {
  // Variant that will be passed to button pressable
  button: VariantProps<FxTheme, 'buttonVariants'> & BoxProps<FxTheme>;
  // theme definitions that will be passed to FxText
  text: VariantProps<FxTheme, 'textVariants'> &
    Pick<TextProps<FxTheme>, 'color'>;
};

const type = {
  default: {
    button: { variant: undefined },
    text: {
      color: 'white',
    },
  },
  inverted: {
    button: { variant: 'inverted' },
    text: {
      color: 'greenBase',
    },
  },
  disabled: {
    button: { variant: 'disabled' },
    text: {
      color: 'border',
    },
  },
  pressed: {
    button: { variant: 'pressed' },
    text: {
      color: 'white',
    },
  },
} as const;

const size = {
  default: {
    button: {
      height: 40,
    },
    text: {
      variant: 'bodyXSSemibold',
    },
  },
  large: {
    button: {
      height: 60,
    },
    text: {
      variant: 'bodySmallSemibold',
    },
  },
} as const;

export const FxButtonClasses: Record<
  | 'default'
  | 'inverted'
  | 'disabled'
  | 'pressed'
  | 'defaultLarge'
  | 'invertedLarge'
  | 'disabledLarge'
  | 'pressedLarge',
  ButtonClassType
> = {
  default: merge(cloneDeep(type.default), size.default),
  inverted: merge(cloneDeep(type.inverted), size.default),
  disabled: merge(cloneDeep(type.disabled), size.default),
  pressed: merge(cloneDeep(type.pressed), size.default),
  defaultLarge: merge(cloneDeep(type.default), size.large),
  invertedLarge: merge(cloneDeep(type.inverted), size.large),
  disabledLarge: merge(cloneDeep(type.disabled), size.large),
  pressedLarge: merge(cloneDeep(type.pressed), size.large),
};
