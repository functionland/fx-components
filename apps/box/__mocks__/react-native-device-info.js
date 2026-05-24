/**
 * Manual jest mock for react-native-device-info.
 * Returns stable values that match the shape the app uses; tests can
 * override per case via jest.spyOn if needed.
 */
module.exports = {
  __esModule: true,
  default: {
    getVersion: jest.fn(() => '3.1.0'),
    getModel: jest.fn(() => 'Pixel 8 Pro'),
    getSystemVersion: jest.fn(() => '14'),
  },
  getVersion: jest.fn(() => '3.1.0'),
  getModel: jest.fn(() => 'Pixel 8 Pro'),
  getSystemVersion: jest.fn(() => '14'),
};
