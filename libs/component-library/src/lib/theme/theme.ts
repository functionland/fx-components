import { createTheme } from '@shopify/restyle';

const palette = {
  green: '#06B597',
  blue: '#187AF9',
  white: 'white',
  transparent: 'rgba(0,0,0,0)',
};
// Light and Dark color palettes are broken out into separate palettes since they are broken out in the figame-ui library.
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

  // WARNING
  warning700: '#F59F00',
  warning600: '#FAB005',
  warning500: '#FCC419',
  warning200: '#FFF3BF',
  warning100: '#FFF9DB',

  // INFO
  info700: '#1864AB',
  info600: '#1C7ED6',
  info500: '#339AF0',
  info200: '#D0EBFF',
  info100: '#E7F5FF',

  // SUCCESS
  success700: '#2F9E44',
  success600: '#37B24D',
  success500: '#51CF66',
  success200: '#D3F9D8',
  success100: '#EBFBEE',
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

  // WARNING
  warning700: '#F08C00',
  warning600: '#FCC419',
  warning500: '#FFD43B',
  warning200: '#806A1D',
  warning100: '#4C4012',

  // INFO
  info700: '#1864AB',
  info600: '#1C7ED6',
  info500: '#339AF0',
  info200: '#0E3F6B',
  info100: '#082640',

  // SUCCESS
  success700: '#2F9E44',
  success600: '#37B24D',
  success500: '#51CF66',
  success200: '#1C5927',
  success100: '#103517',
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
    greenBorder: paletteLight.green400,
    greenBackground: paletteLight.green100,

    successBase: paletteLight.success600,
    infoBase: paletteLight.info600,
    warningBase: paletteLight.warning600,
    errorBase: paletteLight.error600,

    primary: palette.green,
    secondary: palette.blue,
    white: palette.white,
    transparent: palette.transparent,
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
type BaseThemeType = typeof BaseTheme;

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

type InnerTextThemeColorType = { color: keyof BaseThemeType['colors'] };
const buttonTheme /*: ButtonThemeType*/ = {
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
      defaults: { color: 'white' } as InnerTextThemeColorType,
      inverted: { color: 'greenBase' } as InnerTextThemeColorType,
      disabled: { color: 'border' } as InnerTextThemeColorType,
      pressed: { color: 'white' } as InnerTextThemeColorType,
    },
    sizes: {
      defaults: { ...textVariants.bodyXSSemibold },
      large: { ...textVariants.bodySmallSemibold },
    },
  },
};

const dropdownTheme /*: DropdownThemeType*/ = {
  container: {
    types: {
      defaults: {
        borderColor: 'border',
      },
      disabled: {
        backgroundColor: 'backgroundPrimary',
        borderColor: 'border',
      },
      pressed: {
        backgroundColor: 'backgroundPrimary',
        borderColor: 'greenPressed',
      },
      error: {
        borderColor: 'errorBase',
      },
    },
  },
  text: {
    types: {
      defaults: { color: 'content1' } as InnerTextThemeColorType,
      disabled: { color: 'border' } as InnerTextThemeColorType,
      pressed: { color: 'content3' } as InnerTextThemeColorType,
      error: { color: 'content3' } as InnerTextThemeColorType,
    },
  },
};
const filesTheme = {
  container: {
    types: {
      defaults: {
        backgroundColor: 'backgroundPrimary',
      },
      disabled: {
        backgroundColor: 'backgroundPrimary',
      },
      pressed: {
        backgroundColor: 'backgroundPrimary',
      },
    },
  },
  text: {
    types: {
      defaults: { color: 'content1' } as InnerTextThemeColorType,
      disabled: { color: 'border' } as InnerTextThemeColorType,
      pressed: { color: 'content3' } as InnerTextThemeColorType,
    },
  },
  textDetail: {
    types: {
      defaults: { color: 'content3' } as InnerTextThemeColorType,
      disabled: { color: 'border' } as InnerTextThemeColorType,
      pressed: { color: 'content3' } as InnerTextThemeColorType,
    },
  },
};

const linkTheme = {
  types: {
    defaults: { color: 'greenBase' } as InnerTextThemeColorType,
    disabled: { color: 'border' } as InnerTextThemeColorType,
    pressed: { color: 'greenPressed' } as InnerTextThemeColorType,
  },
  sizes: {
    defaults: { ...textVariants.bodyXSSemibold },
    large: { ...textVariants.bodyMediumRegular },
  },
};

const switchTheme = {
  track: {
    types: {
      defaults: {
        backgroundColor: 'border',
      },
      disabled: {
        backgroundColor: 'backgroundSecondary',
      },
      pressed: {
        backgroundColor: 'greenBase',
      },
      pressedDisabled: {
        backgroundColor: 'greenBase',
        opacity: 0.5,
      },
    },
  },
  thumb: {
    types: {
      defaults: {
        backgroundColor: 'backgroundApp',
      },
      disabled: {
        backgroundColor: 'backgroundPrimary',
      },
      pressed: {
        backgroundColor: 'backgroundApp',
      },
      pressedDisabled: {
        backgroundColor: 'backgroundApp',
      },
    },
  },
};

const radioTheme = {
  container: {
    types: {
      defaults: {
        borderColor: 'border',
      },
      disabled: {
        backgroundColor: 'backgroundSecondary',
        borderColor: 'border',
      },
      pressed: {
        borderColor: 'greenBase',
      },
      pressedDisabled: {
        borderColor: 'greenBase',
        opacity: 0.5,
      },
    },
  },
  checkmark: {
    types: {
      defaults: {
        backgroundColor: 'transparent',
      },
      disabled: {
        backgroundColor: 'transparent',
      },
      pressed: {
        backgroundColor: 'backgroundApp',
      },
      pressedDisabled: {
        backgroundColor: 'backgroundApp',
      },
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
  linkVariants: { ...linkTheme.types },
  linkSizes: { ...linkTheme.sizes },
  dropdownVariants: { ...dropdownTheme.container.types },
  dropdownTextVariants: { ...dropdownTheme.text.types },
  switchTrackVariants: { ...switchTheme.track.types },
  switchThumbVariants: { ...switchTheme.thumb.types },
  radioVariants: { ...radioTheme.container.types },
  radioCheckmarkVariants: { ...radioTheme.checkmark.types },
  fileVariants: { ...filesTheme.text.types },
  fileTextVariants: { ...filesTheme.text.types },
  fileTextDetailVariants: { ...filesTheme.textDetail.types },
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
    greenBorder: paletteDark.green200,
    greenBackground: paletteDark.green100,

    successBase: paletteDark.success600,
    infoBase: paletteDark.info600,
    warningBase: paletteDark.warning600,
    errorBase: paletteDark.error600,
  },
  switchTrackVariants: {
    ...fxLightTheme.switchTrackVariants,
    pressedDisabled: {
      backgroundColor: 'greenBorder',
      opacity: 1,
    },
  },
  switchThumbVariants: {
    defaults: {
      backgroundColor: 'content1',
    },
    disabled: {
      backgroundColor: 'border',
    },
    pressed: {
      backgroundColor: 'content1',
    },
    pressedDisabled: {
      backgroundColor: 'border',
    },
  },
  radioVariants: {
    ...fxLightTheme.radioVariants,
    pressedDisabled: {
      borderColor: 'greenBorder',
      opacity: 1,
    },
  },
  radioCheckmarkVariants: {
    ...fxLightTheme.radioCheckmarkVariants,
    pressed: {
      backgroundColor: 'content1',
    },
    pressedDisabled: {
      backgroundColor: 'border',
    },
  },
};

export { FxTheme, fxLightTheme, fxDarkTheme };
