import React from 'react';
import {
  BoxProps,
  boxRestyleFunctions,
  composeRestyleFunctions,
  createRestyleComponent,
  useRestyle,
} from '@shopify/restyle';
import { FxTheme } from '../theme/theme';
import Slider, { SliderProps } from '@react-native-community/slider';
import { FxBox } from '../box/box';
import { useFxTheme } from '../theme/useFxTheme';

type FxSliderProps = BoxProps<FxTheme> & SliderProps;

const FxSliderBase = createRestyleComponent<FxSliderProps, FxTheme>(
  boxRestyleFunctions,
  Slider
);

const restyleFunctions = composeRestyleFunctions<FxTheme, FxSliderProps>(
  boxRestyleFunctions
);

const FxSlider = (props: FxSliderProps) => {
  const { style, ...rest } = useRestyle(restyleFunctions, props);
  const { colors } = useFxTheme();

  return (
    <FxBox style={style}>
      <FxSliderBase
        width="100%"
        minimumTrackTintColor={colors.greenBase}
        maximumTrackTintColor={colors.backgroundSecondary}
        thumbTintColor={colors.greenBase}
        {...rest}
      />
    </FxBox>
  );
};

export { FxSlider };
