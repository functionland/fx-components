import {
  capitalizeFirstLetter,
  FxBox,
  FxRadioButton,
  FxRadioButtonWithLabel,
  FxSwitch,
  FxText,
} from '@functionland/component-library';
import React from 'react';
import { Image, ImageSourcePropType, StyleSheet } from 'react-native';
import { SubHeaderText } from '../../components/Text';
import { scaleByWidth } from '../../constants/layout';
import { ColorScheme, useSettingsStore } from '../../stores';
import { useLogger } from '../../hooks';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';

export const ModeScreen = () => {
  const { t } = useTranslation();
  return (
    <FxBox marginHorizontal="20">
      <SubHeaderText marginVertical="16">Mode</SubHeaderText>
      <SelectMode />
      <AutomaticSwitch />
      <LanguageSelector />
      <DebugModeSwitch/>
    </FxBox>
  );
};

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  
  return (
    <FxBox marginTop="32">
      <FxText variant="bodySmallRegular" marginBottom="16">Language</FxText>
      <FxRadioButton.Group
        value={i18n.language}
        onValueChange={(language) => changeLanguage(language)}
      >
        <FxBox marginBottom="8">
          <FxRadioButtonWithLabel value="en" label="English" />
        </FxBox>
        <FxBox>
          <FxRadioButtonWithLabel value="zh" label="中文 (Chinese)" />
        </FxBox>
      </FxRadioButton.Group>
    </FxBox>
  );
};

const SelectMode = () => {
  const colorScheme = useSettingsStore((store) => store.colorScheme);
  const setColorScheme = useSettingsStore((store) => store.setColorScheme);
  return (
    <FxRadioButton.Group
      onValueChange={(newValue: ColorScheme) => setColorScheme(newValue)}
      value={colorScheme}
    >
      <FxBox marginTop="16" flexDirection="row" justifyContent="space-between">
        <ColorSchemeSelector
          imageSrc={require('./../../../assets/images/mode_light.png')}
          value={'light'}
        />
        <ColorSchemeSelector
          imageSrc={require('./../../../assets/images/mode_dark.png')}
          value={'dark'}
        />
      </FxBox>
    </FxRadioButton.Group>
  );
};

const ColorSchemeSelector = ({
  imageSrc,
  value,
}: {
  imageSrc: ImageSourcePropType;
  value: ColorScheme;
}) => {
  const isAuto = useSettingsStore().isAuto;
  return (
    <FxBox>
      <Image style={s.image} source={imageSrc} />
      <FxBox marginTop="16" flexDirection="row" alignItems="center">
        <FxRadioButton marginRight="8" value={value} disabled={isAuto} />
        <FxText
          variant="bodySmallRegular"
          children={capitalizeFirstLetter(value)}
        />
      </FxBox>
    </FxBox>
  );
};

const AutomaticSwitch = () => {
  const isAuto = useSettingsStore((store) => store.isAuto);
  const toggleIsAuto = useSettingsStore((store) => store.toggleIsAuto);

  return (
    <FxBox
      marginTop="32"
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
    >
      <FxBox>
        <FxText variant="bodySmallRegular">Automatic dark mode</FxText>
        <FxText variant="bodyXSRegular">
          Use system light/dark mode setting.
        </FxText>
      </FxBox>
      <FxSwitch value={isAuto} onValueChange={toggleIsAuto} />
    </FxBox>
  );
};

const DebugModeSwitch = () => {
  const { toggleDebugMode, isDebugModeEnable } = useLogger()
  return (
    <FxBox
      marginTop="32"
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
    >
      <FxBox>
        <FxText variant="bodySmallRegular">Debug mode</FxText>
        <FxText variant="bodyXSRegular">
          Enable logs for troubleshooting by support team
        </FxText>
      </FxBox>
      <FxSwitch value={isDebugModeEnable} onValueChange={toggleDebugMode} />
    </FxBox>
  );
};

const s = StyleSheet.create({
  image: {
    width: scaleByWidth(154),
    height: scaleByWidth(96),
    resizeMode: 'contain',
  },
});
