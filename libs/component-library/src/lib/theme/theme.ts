import { createTheme } from '@shopify/restyle';

const palette = {
  green: '#06B597',
  blue: '#187AF9',
  white: 'white',
};

const paletteLight = {
  appBackground: '#FFFFFF',
  grayscale700: '#343A40',
  grayscale500: '#6F767D',
  grayscale400: '#CED4DA',
  grayscale100: '#E9ECEF',
  grayscale000: '#F8F9FA',
};

const paletteDark = {
  appBackground: '#212529',
  grayscale700: '#F8F9FA',
  grayscale500: '#CED4DA',
  grayscale400: '#868E96',
  grayscale100: '#495057',
  grayscale000: '#343A40',
};

const fxLightTheme = createTheme({
  colors: {
    backgroundApp: paletteLight.appBackground,
    backgroundPrimary: paletteLight.grayscale000,
    backgroundSecondary: paletteLight.grayscale100,
    border: paletteLight.grayscale400,
    content1: paletteLight.grayscale700,
    content3: paletteLight.grayscale500,
    primary: palette.green,
    secondary: palette.blue,
    white: palette.white,
  },
  spacing: {
    s: 8,
    m: 16,
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
  },
  borderRadii: {
    s: 8,
    m: 16,
  },
  buttonVariants: {
    defaults: {
      backgroundColor: 'primary',
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
    primary: palette.green,
    secondary: palette.blue,
    white: 'white',
  },
};

export { FxTheme, fxLightTheme, fxDarkTheme };
