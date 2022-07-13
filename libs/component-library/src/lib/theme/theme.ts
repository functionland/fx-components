import { createTheme } from '@shopify/restyle';

export const palette = {
  green: '#06B597',
  blue: '#187AF9',
  white: 'white',
};

const paletteDark = {
  grayscale700: '#F8F9FA',
  grayscale500: '#CED4DA',
  grayscale400: '#868E96',
  grayscale0: '#343A40',
  appBackground: '#212529',
};

const paletteLight = {
  grayscale700: '#343A40',
  grayscale500: '#6F767D',
  grayscale400: '#CED4DA',
  grayscale0: '#F8F9FA',
  appBackground: '#FFFFFF',
};

const fxLightTheme = createTheme({
  colors: {
    white: palette.white,
    primary: palette.green,
    secondary: palette.blue,
    appBackground: paletteLight.appBackground,
    backgroundPrimary: paletteLight.grayscale0,
    content1: paletteLight.grayscale700,
    content3: paletteLight.grayscale500,
    border: paletteLight.grayscale400,
  },
  spacing: {
    s: 8,
    m: 16,
  },
  breakpoints: {},
  textVariants: {
    defaults: {},
    body: {
      fontSize: 16,
      color: 'primary',
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
    white: 'white',
    primary: palette.green,
    secondary: palette.blue,
    appBackground: paletteDark.appBackground,
    backgroundPrimary: paletteDark.grayscale0,
    content1: paletteDark.grayscale700,
    content3: paletteDark.grayscale500,
    border: paletteDark.grayscale400,
  },
};

export { FxTheme, fxLightTheme, fxDarkTheme };
