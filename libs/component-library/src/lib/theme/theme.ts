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
};

const paletteDark = {
  // GRAYSCALE
  appBackground: '#212529',
  grayscale700: '#F8F9FA',
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
};

const fxLightTheme = createTheme({
  colors: {
    backgroundApp: paletteLight.appBackground,
    backgroundPrimary: paletteLight.grayscale000,
    backgroundSecondary: paletteLight.grayscale100,
    border: paletteLight.grayscale400,
    content1: paletteLight.grayscale700,
    content3: paletteLight.grayscale500,

    greenBase: paletteLight.green600,

    primary: palette.green,
    secondary: palette.blue,
    white: palette.white,
  },
  spacing: {
    '4': 4,
    '8': 8,
    '12': 12,
    '16': 16,
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
  textVariants: {
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
    bodySmallRegular: {
      fontFamily: 'OpenSans-Regular',
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
  },
  borderRadii: {
    s: 8,
    m: 16,
  },
  buttonVariants: {
    defaults: {
      backgroundColor: 'greenBase',
    },
    inverted: {
      backgroundColor: undefined,
      borderColor: 'primary',
      borderWidth: 2,
    },
  },
  zIndices: {},
});

type FxTheme = typeof fxLightTheme;

const fxDarkTheme: FxTheme = {
  ...fxLightTheme,
  colors: {
    backgroundApp: paletteDark.appBackground,
    backgroundPrimary: paletteDark.grayscale000,
    backgroundSecondary: paletteDark.grayscale100,
    border: paletteDark.grayscale400,
    content1: paletteDark.grayscale700,
    content3: paletteDark.grayscale500,

    greenBase: paletteDark.green600,

    primary: palette.green,
    secondary: palette.blue,
    white: 'white',
  },
};

export { FxTheme, fxLightTheme, fxDarkTheme };
