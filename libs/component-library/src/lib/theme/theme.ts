import { createTheme } from '@shopify/restyle';

const palette = {
  green: '#06B597',
  blue: '#187AF9',
  white: 'white',
};

const paletteLight = {
  // GRAYSCALE
  appBackground: '#FFFFFF',
  grayscale700: '#343A40',
  grayscale600: '#495057',
  grayscale500: '#6F767D',
  grayscale400: '#CED4DA',
  grayscale100: '#E9ECEF',
  grayscale000: '#F8F9FA',

  // GREEN
  green700: '#038082',
  green600: '#049B8F',
  green500: '#06B597',
  green400: '#97F7CC',
  green100: '#CAFBE0',

  // ERROR
  error700: '#E03131',
  error600: '#FA4343',
  error500: '#FF6B6B',
  error200: '#FFE3E3',
  error100: '#FFF5F5',
};

const paletteDark = {
  // GRAYSCALE
  appBackground: '#212529',
  grayscale700: '#F8F9FA',
  grayscale600: '#E9ECEF',
  grayscale500: '#CED4DA',
  grayscale400: '#868E96',
  grayscale100: '#495057',
  grayscale000: '#343A40',

  // GREEN
  green700: '#038082',
  green600: '#049B8F',
  green500: '#06B597',
  green200: '#035B4C',
  green100: '#02362D',

  // ERROR
  error700: '#E03131',
  error600: '#FA5252',
  error500: '#FF6B6B',
  error200: '#7D2929',
  error100: '#4B1919',
};

const BaseTheme = {
  colors: {
    backgroundApp: paletteLight.appBackground,
    backgroundPrimary: paletteLight.grayscale000,
    backgroundSecondary: paletteLight.grayscale100,
    border: paletteLight.grayscale400,
    content1: paletteLight.grayscale700,
    content2: paletteLight.grayscale600,
    content3: paletteLight.grayscale500,

    greenPressed: paletteLight.green700,
    greenBase: paletteLight.green600,
    greenHover: paletteLight.green500,

    errorBase: paletteLight.error600,

    primary: palette.green,
    secondary: palette.blue,
    white: palette.white,
  },
  spacing: {
    '0': 0,
    '4': 4,
    '8': 8,
    '12': 12,
    '16': 16,
    '20': 20,
    '24': 24,
    '32': 32,
    '40': 40,
    '48': 48,
    '56': 56,
    '64': 64,
    '72': 72,
    '80': 80,
  },
  breakpoints: {},
  borderRadii: {
    s: 4,
    m: 6,
    l: 20,
  },
};

const textVariants = {
  defaults: {
    color: 'content1',
  },
  body: {
    fontSize: 16,
  },
  eyebrow2: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 8,
    lineHeight: 10,
    textTransform: 'uppercase',
  },
  bodyXXSRegular: {
    fontFamily: 'OpenSans-Regular',
    fontSize: 10,
    lineHeight: 14,
  },
  bodyXSLight: {
    fontFamily: 'OpenSans-Light',
    fontSize: 12,
    lineHeight: 16,
  },
  bodyXSRegular: {
    fontFamily: 'OpenSans-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  bodyXSSemibold: {
    fontFamily: 'OpenSans-Semibold',
    fontSize: 12,
    lineHeight: 16,
  },
  bodySmallLight: {
    fontFamily: 'OpenSans-Light',
    fontSize: 14,
    lineHeight: 24,
  },
  bodySmallRegular: {
    fontFamily: 'OpenSans-Regular',
    fontSize: 14,
    lineHeight: 24,
  },
  bodySmallSemibold: {
    fontFamily: 'OpenSans-Semibold',
    fontSize: 14,
    lineHeight: 24,
  },
  bodyLargeLight: {
    fontFamily: 'OpenSans-Light',
    fontSize: 20,
    lineHeight: 30,
  },
  bodyLargeRegular: {
    fontFamily: 'OpenSans-Regular',
    fontSize: 20,
    lineHeight: 30,
  },
  bodyMediumLight: {
    fontFamily: 'OpenSans-Light',
    fontSize: 16,
    lineHeight: 28,
  },
  bodyMediumRegular: {
    fontFamily: 'OpenSans-Regular',
    fontSize: 16,
    lineHeight: 28,
  },
  h200: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  h300: {
    fontFamily: 'Montserrat-Semibold',
    fontSize: 24,
    lineHeight: 36,
  },
  h400: {
    fontFamily: 'Montserrat-Semibold',
    fontSize: 28,
    lineHeight: 40,
  },
};

const buttonTheme = {
  container: {
    types: {
      defaults: {
        backgroundColor: 'greenBase',
        borderRadius: 's',
        alignItems: 'center',
        justifyContent: 'center',
      },
      inverted: {
        backgroundColor: undefined,
        borderColor: 'primary',
        borderWidth: 2,
      },
      disabled: {
        backgroundColor: 'backgroundSecondary',
      },
      pressed: {
        backgroundColor: 'greenPressed',
      },
    },
    sizes: {
      defaults: {
        height: 40,
      },
      large: {
        height: 60,
      },
    },
  },
  text: {
    types: {
      defaults: { color: 'white' },
      inverted: { color: 'greenBase' },
      disabled: { color: 'border' },
      pressed: { color: 'white' },
    },
    sizes: {
      defaults: { ...textVariants.bodyXSSemibold },
      large: { ...textVariants.bodySmallSemibold },
    },
  },
};

const fxLightTheme = createTheme({
  ...BaseTheme,
  textVariants,
  buttonVariants: { ...buttonTheme.container.types },
  buttonSizes: { ...buttonTheme.container.sizes },
  buttonTextVariants: { ...buttonTheme.text.types },
  buttonTextSizes: { ...buttonTheme.text.sizes },
  zIndices: {
    foreground: 1000,
  },
});

type FxTheme = typeof fxLightTheme;

const fxDarkTheme: FxTheme = {
  ...fxLightTheme,
  colors: {
    ...fxLightTheme.colors,
    backgroundApp: paletteDark.appBackground,
    backgroundPrimary: paletteDark.grayscale000,
    backgroundSecondary: paletteDark.grayscale100,
    border: paletteDark.grayscale400,
    content1: paletteDark.grayscale700,
    content2: paletteDark.grayscale600,
    content3: paletteDark.grayscale500,

    greenPressed: paletteDark.green700,
    greenBase: paletteDark.green600,
    greenHover: paletteDark.green500,

    errorBase: paletteDark.error600,
  },
};

export { FxTheme, fxLightTheme, fxDarkTheme };
