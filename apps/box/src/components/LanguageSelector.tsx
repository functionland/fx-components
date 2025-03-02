// components/LanguageSelector.tsx
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { FxBox, FxText, useFxTheme } from '@functionland/component-library';
import { useTranslation } from 'react-i18next';

interface Language {
  code: string;
  label: string;
}

interface LanguageSelectorProps {
  style?: ViewStyle | Array<ViewStyle | { [key: string]: string | number }>;
}

const LANGUAGES: Language[] = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中' }
];

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ style }) => {
  const { i18n } = useTranslation();
  const { colors } = useFxTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };
  
  const selectLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowDropdown(false);
  };
  
  // Find current language display label
  const currentLang = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];
  
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        onPress={toggleDropdown}
        style={[styles.selector]}
      >
        <FxText variant="bodySmallSemibold">{currentLang.label}</FxText>
      </TouchableOpacity>
      
      {showDropdown && (
        <FxBox style={[styles.dropdown, { backgroundColor: colors.backgroundSecondary }]}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.languageOption]}
              onPress={() => selectLanguage(lang.code)}
            >
              <FxText 
                variant="bodySmallRegular"
                color={lang.code === i18n.language ? 'primary' : 'content1'}
              >
                {lang.label}
              </FxText>
            </TouchableOpacity>
          ))}
        </FxBox>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  selector: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 38,
  },
  selectorButton: {
    padding: 8,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    borderRadius: 8,
    padding: 8,
    marginTop:8,
    minWidth: 60,
    width: '100%',
  },
  languageOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  }
});

export default LanguageSelector;