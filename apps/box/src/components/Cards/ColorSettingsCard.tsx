import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxCard,
  FxError,
  FxHorizontalRule,
  FxPressableOpacity,
  FxSlider,
  FxText,
  FxTextInput,
} from '@functionland/component-library';
import { CardHeader } from './fields/CardHeader';
import { StyleSheet } from 'react-native';
import ColorPicker from 'react-native-wheel-color-picker';

export const ColorSettingsCard = () => {
  const colorPickerRef = useRef<FxBottomSheetModalMethods>(null);
  const [color, setColor] = useState('#3250EF'.toLowerCase());
  const [colorInput, setColorInput] = useState(color);
  const [colorError, setColorError] = useState('');
  const [brightness, setBrightness] = useState(5);
  const isCustomSelected = useMemo(
    () => !colorDots.flat().find((c) => c.toLowerCase() === color),
    [color]
  );

  useEffect(() => {
    if (color !== colorInput) onColorTextInputChange(color);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  const onColorTextInputChange = (value: string) => {
    setColorInput(value);
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      setColor(value);
      setColorError('');
    } else {
      setColorError('Invalid Hex Color');
    }
  };

  const resetColor = () => onColorTextInputChange(color);

  return (
    <>
      <CardHeader>Color</CardHeader>
      <FxCard>
        <FxText variant="bodySmallRegular" color="content3" marginBottom="8">
          Color
        </FxText>
        {colorDots.map((row, i) => (
          <FxBox
            key={`color-dot-row-${i}`}
            marginBottom="16"
            flexDirection="row"
            justifyContent="space-between"
          >
            {row.map((dotColor) => (
              <ColorDot
                key={dotColor}
                color={dotColor}
                isSelected={color === dotColor.toLowerCase()}
                onPress={() => setColor(dotColor.toLowerCase())}
              />
            ))}
          </FxBox>
        ))}
        <FxPressableOpacity
          flexDirection="row"
          justifyContent="space-between"
          onPress={() => colorPickerRef.current?.present()}
        >
          <FxText variant="bodySmallRegular" color="content3" lineHeight={18}>
            Custom color
          </FxText>
          <FxBox flexDirection="row" alignItems="center">
            <ColorDot color={color} disabled isSelected={isCustomSelected} />
            <FxText
              variant="bodySmallRegular"
              color="content3"
              marginLeft={isCustomSelected ? '8' : '0'}
              lineHeight={18}
            >
              {color}
            </FxText>
          </FxBox>
        </FxPressableOpacity>
        <FxBottomSheetModal ref={colorPickerRef} title="Custom Color">
          <FxBox alignItems="center">
            <FxBox width={265} height={280} marginBottom="16">
              <ColorPicker
                color={color}
                onColorChangeComplete={setColor}
                swatches={false}
                gapSize={0}
                thumbSize={24}
                sliderSize={16}
                shadeSliderThumb
              />
            </FxBox>
            <FxTextInput
              width={120}
              height={32}
              value={colorInput}
              onChangeText={onColorTextInputChange}
              onSubmitEditing={resetColor}
              onBlur={resetColor}
              error={!!colorError}
              placeholder="#000000"
              textAlign="center"
              isBottomSheetInput
            />
            <FxError error={colorError} />
          </FxBox>
        </FxBottomSheetModal>
        <FxHorizontalRule marginTop="4" marginBottom="16" />
        <FxBox
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <FxText variant="bodySmallRegular" color="content3">
            Brightness
          </FxText>
          <FxText variant="bodySmallRegular" color="content3">
            {`${brightness * 10}%`}
          </FxText>
        </FxBox>
        <FxSlider
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={brightness}
          onValueChange={setBrightness}
        />
      </FxCard>
    </>
  );
};

const colorDots = [
  [
    '#AC12F4',
    '#9112F4',
    '#3250EF',
    '#6674F7',
    '#50ABFE',
    '#65E5B0',
    '#7AFF77',
    '#BFF74A',
  ],
  [
    '#BA3685',
    '#FE50B9',
    '#FE5050',
    '#FF862F',
    '#FEAE50',
    '#FED850',
    '#F3E778',
    '#F7F98F',
  ],
];

type ColorDotProps = React.ComponentProps<typeof FxPressableOpacity> & {
  color: string;
  isSelected: boolean;
};

const ColorDot = ({ color, isSelected, ...rest }: ColorDotProps) => (
  <FxPressableOpacity
    width={24}
    height={24}
    justifyContent="center"
    alignItems="center"
    borderColor="border"
    borderRadius="s"
    borderWidth={isSelected ? 1 : 0}
    {...rest}
  >
    <FxBox
      width={12}
      height={12}
      style={{ backgroundColor: color, ...styles.colorDot }}
    />
  </FxPressableOpacity>
);

const styles = StyleSheet.create({
  colorDot: {
    borderRadius: 5,
  },
});
