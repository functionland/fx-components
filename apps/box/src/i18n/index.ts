import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations directly
import enTranslation from './locales/en/translation.json';
import zhTranslation from './locales/zh/translation.json';

// Default language
const FALLBACK_LANGUAGE = 'en';

// Resources object with all translations
const resources = {
  en: {
    translation: enTranslation
  },
  zh: {
    translation: zhTranslation
  }
};

// Detect the device language
const getDeviceLanguage = () => {
  try {
    const locales = getLocales();
    return locales[0]?.languageCode || FALLBACK_LANGUAGE;
  } catch (error) {
    console.error('Error getting device language:', error);
    return FALLBACK_LANGUAGE;
  }
};

// Create a language detection function that checks storage first
const detectLanguage = async () => {
  try {
    const storedLanguage = await AsyncStorage.getItem('userLanguage');
    if (storedLanguage) return storedLanguage;
    return getDeviceLanguage();
  } catch (error) {
    return getDeviceLanguage();
  }
};

// Create a language change function that also updates storage
export const changeLanguage = async (language: string) => {
  try {
    await AsyncStorage.setItem('userLanguage', language);
    await i18n.changeLanguage(language);
    return true;
  } catch (error) {
    console.error('Failed to set language:', error);
    return false;
  }
};

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: ['en', 'zh'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Initialize with stored language if available
detectLanguage().then(language => {
  i18n.changeLanguage(language);
});

export default i18n;