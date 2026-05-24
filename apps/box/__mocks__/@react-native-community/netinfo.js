/**
 * Manual jest mock for @react-native-community/netinfo.
 * Provides the addEventListener API + a fetch() stub.
 */
module.exports = {
  __esModule: true,
  default: {
    addEventListener: jest.fn().mockReturnValue(() => {}),
    fetch: jest.fn().mockResolvedValue({ isConnected: true, type: 'wifi' }),
  },
  addEventListener: jest.fn().mockReturnValue(() => {}),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, type: 'wifi' }),
};
