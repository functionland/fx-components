import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations directly
import enTranslation from './locales/en/translation.json';
import zhTranslation from './locales/zh/translation.json';
import enTasks from './locales/en/tasks.json';

// Default language
const FALLBACK_LANGUAGE = 'en';

// Resources object with all translations
const resources = {
  en: {
    translation: enTranslation,
    tasks: enTasks
  },
  zh: {
    translation: zhTranslation,
    tasks: enTasks // Using English tasks for now, can be translated later
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

// Initialize i18next with a basic configuration first
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: FALLBACK_LANGUAGE, // Start with fallback, will be updated after storage check
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: ['en', 'zh'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Create a language change function that also updates storage
export const changeLanguage = async (language: string) => {
  try {
    await AsyncStorage.setItem('userLanguage', language);
    await i18n.changeLanguage(language);
    console.log(`Language changed and saved to storage: ${language}`);
    return true;
  } catch (error) {
    console.error('Failed to set language:', error);
    return false;
  }
};

// Immediately invoked async function to load the stored language
(async () => {
  try {
    // First check storage
    const storedLanguage = await AsyncStorage.getItem('userLanguage');
    
    if (storedLanguage && ['en', 'zh'].includes(storedLanguage)) {
      console.log(`Loaded language from storage: ${storedLanguage}`);
      await i18n.changeLanguage(storedLanguage);
    } else {
      // If no stored language, use device language and save it
      const deviceLang = getDeviceLanguage();
      console.log(`No stored language, using device language: ${deviceLang}`);
      await AsyncStorage.setItem('userLanguage', deviceLang);
      await i18n.changeLanguage(deviceLang);
    }
  } catch (error) {
    console.error('Error loading language:', error);
    // Fall back to device language on error
    i18n.changeLanguage(getDeviceLanguage());
  }
})();

export default i18n;