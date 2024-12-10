import axios from 'axios';
import { API_URL } from './index';
import BleManager from 'react-native-ble-manager';
import { ResponseAssembler } from '../utils/ble';

export const getProperties = async () => {
  return axios.get(`${API_URL}/properties`, {
    timeout: 1000 * 15,
  });
};

export const postProperties = async (data) => {
  return axios.post(`${API_URL}/properties`, data);
};

export const getWifiList = async (): Promise<{ data: { essid: string }[] }> => {
  try {
    const connectedPeripherals = await BleManager.getConnectedPeripherals([]);

    if (connectedPeripherals.length > 0) {
      const responseAssembler = new ResponseAssembler();
      try {
        console.log('sending wifi/list command through ble');
        const response = await responseAssembler.writeToBLEAndWaitForResponse(
          'wifi/list',
          connectedPeripherals[0].id
        );
        console.log({ response });
        if (response) {
          return { data: response };
        }
      } catch (bleError) {
        console.log('BLE wifi list fetch failed:', bleError);
      } finally {
        responseAssembler.cleanup();
      }
    }

    // Fallback to HTTP
    return axios.get(`${API_URL}/wifi/list`);
  } catch (error) {
    console.error('WiFi list fetch failed:', error);
    throw error;
  }
};

export const getWifiStatus = async () => {
  try {
    const connectedPeripherals = await BleManager.getConnectedPeripherals([]);

    if (connectedPeripherals.length > 0) {
      const responseAssembler = new ResponseAssembler();
      try {
        const response = await responseAssembler.writeToBLEAndWaitForResponse(
          'wifi/status',
          connectedPeripherals[0].id
        );
        if (response) {
          return { data: response };
        }
      } catch (bleError) {
        console.log('BLE wifi status fetch failed:', bleError);
      } finally {
        responseAssembler.cleanup();
      }
    }

    // Fallback to HTTP
    return axios.get(`${API_URL}/wifi/status`);
  } catch (error) {
    console.error('WiFi status fetch failed:', error);
    throw error;
  }
};

export const postWifiConnect = async (data: {
  ssid: string;
  password: string;
  countryCode: string;
}) => {
  try {
    const connectedPeripherals = await BleManager.getConnectedPeripherals([]);

    if (connectedPeripherals.length > 0) {
      const responseAssembler = new ResponseAssembler();
      try {
        // Format command as expected by the BLE server
        const command = `wifi/connect ${data.ssid} ${data.password} ${
          data.countryCode || 'CA'
        }`;
        const response = await responseAssembler.writeToBLEAndWaitForResponse(
          command,
          connectedPeripherals[0].id
        );
        if (response) {
          return { data: response };
        }
      } catch (bleError) {
        console.log('BLE wifi connect failed:', bleError);
      } finally {
        responseAssembler.cleanup();
      }
    }

    // Fallback to HTTP
    const formData = new URLSearchParams();
    formData.append('ssid', data?.ssid);
    formData.append('password', data?.password);
    formData.append('countryCode', data?.countryCode || 'CA');

    return axios.post(
      `${API_URL}/wifi/connect?${formData.toString()}`,
      undefined,
      {
        timeout: 1000 * 15,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
  } catch (error) {
    console.error('WiFi connect failed:', error);
    throw error;
  }
};

export const putApDisable = async () => {
  return axios.put(`${API_URL}/ap/disable`);
};
