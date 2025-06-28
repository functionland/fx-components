import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearStorage = async () => {
  try {
    await AsyncStorage.clear();
  } catch (e) {
    // TODO: add error logging
  }
};

export const getStringData = async (key) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    // error reading value
  }
};
export const setStringData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    // saving error
  }
};

export const getBoolData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    // error reading value
  }
};
export const setBoolData = async (key, bool) => {
  try {
    const jsonValue = JSON.stringify(bool);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    // saving error
  }
};
export const getObjectData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    // error reading value
  }
};
export const setObjectData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    // saving error
  }
};

export const removeValue = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    // remove error
  }
};

export const getAllKeys = async () => {
  try {
    return await AsyncStorage.getAllKeys();
  } catch (e) {
    // read key error
  }
};

const Storage = {
  clearStorage,
  getAllKeys,
  getStringData,
  setStringData,
  getBoolData,
  setBoolData,
  getObjectData,
  setObjectData,
  removeValue,
};
export default Storage;
