import { BoxProps, TextProps, VariantProps } from '@shopify/restyle';
import { merge } from 'lodash';
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
  default: merge({}, type.default, size.default),
  inverted: merge({}, type.inverted, size.default),
  disabled: merge({}, type.disabled, size.default),
  pressed: merge({}, type.pressed, size.default),
  defaultLarge: merge({}, type.default, size.large),
  invertedLarge: merge({}, type.inverted, size.large),
  disabledLarge: merge({}, type.disabled, size.large),
  pressedLarge: merge({}, type.pressed, size.large),
};
