/**
 * Mock for React Native modules
 */

module.exports = {
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios || obj.default,
  },
  Dimensions: {
    get: () => ({ width: 375, height: 667 }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(),
    canOpenURL: jest.fn().mockResolvedValue(true),
  },
  StyleSheet: {
    create: (styles) => styles,
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  Image: 'Image',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
  useColorScheme: jest.fn(() => 'light'),
  NativeModules: {},
  NativeEventEmitter: jest.fn(),
  PermissionsAndroid: {
    request: jest.fn().mockResolvedValue('granted'),
    requestMultiple: jest.fn().mockResolvedValue({}),
    PERMISSIONS: {},
    RESULTS: { GRANTED: 'granted' },
  },
  // NOTE: BleManager methods are intentionally NOT exposed here at the top
  // level. They live in `__mocks__/react-native-ble-manager.js` which takes
  // precedence over the moduleNameMapper for `react-native-ble-manager`
  // specifically. Exposing them here too would pollute the generic
  // react-native mock — every test that mocks `react-native` would then get
  // unexpected BLE method names alongside the platform primitives, which
  // could mask future test bugs (a test expecting `write` for a TextInput
  // would get the BleManager.write mock instead).
  // (Built-in advisor pre-merge cleanup.)
  request: jest.fn().mockResolvedValue('granted'),
  PERMISSIONS: {},
  RESULTS: { GRANTED: 'granted' },
};
