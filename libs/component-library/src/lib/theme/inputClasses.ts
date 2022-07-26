import { BoxProps, TextProps } from '@shopify/restyle';
import { FxTheme } from './theme';

type TextInputClassType = BoxProps<FxTheme> &
  TextProps<FxTheme> & {
    placeholderTextColor: keyof FxTheme['colors'];
    selectionColor: keyof FxTheme['colors'];
  };

const defaultProps: TextInputClassType = {
  backgroundColor: undefined,
  borderColor: 'border',
  borderRadius: 's',
  borderWidth: 1,
  color: 'content1',
  height: 52,
  justifyContent: 'center',
  lineHeight: 0,
  paddingHorizontal: '20',
  placeholderTextColor: 'content3',
  selectionColor: 'secondary',
  variant: 'bodySmallRegular',
};

export const FxTextInputClasses: Record<
  'default' | 'disabled' | 'active' | 'error',
  TextInputClassType
> = {
  default: defaultProps,
  disabled: {
    ...defaultProps,
    color: 'border',
    backgroundColor: 'backgroundPrimary',
  },
  active: {
    ...defaultProps,
    backgroundColor: 'backgroundPrimary',
    borderColor: 'greenPressed',
  },
  error: {
    ...defaultProps,
    borderColor: 'errorBase',
  },
};
