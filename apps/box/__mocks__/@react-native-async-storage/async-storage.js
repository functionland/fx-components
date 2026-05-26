/**
 * Manual jest mock for @react-native-async-storage/async-storage.
 * In-memory map; tests can reset between cases via clear().
 */
const store = new Map();

module.exports = {
  __esModule: true,
  default: {
    setItem: jest.fn((k, v) => {
      store.set(k, String(v));
      return Promise.resolve();
    }),
    getItem: jest.fn((k) => Promise.resolve(store.has(k) ? store.get(k) : null)),
    removeItem: jest.fn((k) => {
      store.delete(k);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      store.clear();
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve([...store.keys()])),
    multiGet: jest.fn((keys) => Promise.resolve(keys.map((k) => [k, store.has(k) ? store.get(k) : null]))),
    multiSet: jest.fn((pairs) => {
      for (const [k, v] of pairs) store.set(k, String(v));
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys) => {
      for (const k of keys) store.delete(k);
      return Promise.resolve();
    }),
  },
  // Named test helper — call from beforeEach to reset
  __resetStore: () => store.clear(),
};
