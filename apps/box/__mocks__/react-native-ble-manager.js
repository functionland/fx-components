/**
 * Manual jest mock for react-native-ble-manager.
 *
 * Placed at the project root `__mocks__/` so it takes precedence over the
 * generic `moduleNameMapper` ('react-native-*' → react-native.js) in
 * jest.config.js. The default export carries the BleManager surface
 * ResponseAssembler uses; tests can `jest.spyOn` on individual methods.
 */
module.exports = {
  __esModule: true,
  default: {
    onDidUpdateValueForCharacteristic: jest.fn().mockReturnValue({
      remove: jest.fn(),
    }),
    retrieveServices: jest.fn().mockResolvedValue(undefined),
    startNotification: jest.fn().mockResolvedValue(undefined),
    stopNotification: jest.fn().mockResolvedValue(undefined),
    write: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    getConnectedPeripherals: jest.fn().mockResolvedValue([]),
  },
};
