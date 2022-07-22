import React, { useEffect, useState } from 'react';
import {
  FxBox,
  FxCard,
  FxError,
  FxHorizontalRule,
  FxPressableOpacity,
  FxSlider,
  FxText,
  FxTextInput,
} from '@functionland/component-library';
import { CardHeader } from './CardHeader';
import { StyleSheet } from 'react-native';
import ColorPicker from 'react-native-wheel-color-picker';

export const ColorSettingsCard = () => {
  const [color, setColor] = useState('#3250EF'.toLowerCase());
  const [colorInput, setColorInput] = useState(color);
  const [colorError, setColorError] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [brightness, setBrightness] = useState(5);

  useEffect(() => {
    if (color !== colorInput) onColorTextInputChange(color);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  const onColorTextInputChange = (value: string) => {
    setColorInput(value.toLowerCase());
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      setColor(value.toLowerCase());
      setColorError('');
    } else {
      setColorError('Invalid Hex Color');
    }
  };

  const resetColor = () => onColorTextInputChange(color);

  return (
    <>
      <CardHeader>LED Color Settings</CardHeader>
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
              <FxPressableOpacity
                key={dotColor}
                width={24}
                height={24}
                justifyContent="center"
                alignItems="center"
                onPress={() => setColor(dotColor)}
              >
                <ColorDot color={dotColor} />
              </FxPressableOpacity>
            ))}
          </FxBox>
        ))}
        <FxBox flexDirection="row" justifyContent="space-between">
          <FxText variant="bodySmallRegular" color="content3" lineHeight={18}>
            Custom color
          </FxText>
          <FxPressableOpacity
            flexDirection="row"
            alignItems="center"
            onPress={() => setShowColorPicker(!showColorPicker)}
          >
            <ColorDot color={color} />
            <FxText
              variant="bodySmallRegular"
              color="content3"
              marginLeft="8"
              lineHeight={18}
            >
              {color}
            </FxText>
          </FxPressableOpacity>
        </FxBox>
        {showColorPicker && (
          <FxBox>
            <FxBox marginBottom="16">
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
              height={32}
              paddingHorizontal="12"
              value={colorInput}
              onChangeText={onColorTextInputChange}
              onSubmitEditing={resetColor}
              onBlur={resetColor}
              error={!!colorError}
              placeholder="#000000"
            />
            <FxError error={colorError} />
          </FxBox>
        )}
        <FxHorizontalRule marginVertical="16" />
        <FxBox
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <FxText variant="bodySmallRegular" color="content3">
            Brightness
          </FxText>
          <FxText variant="bodySmallRegular" color="content3">
            {brightness}
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

type ColorDotProps = {
  color: string;
};

const ColorDot = ({ color }: ColorDotProps) => (
  <FxBox
    width={12}
    height={12}
    style={{ backgroundColor: color, ...styles.colorDot }}
  />
);

const styles = StyleSheet.create({
  colorDot: {
    borderRadius: 5,
  },
});
