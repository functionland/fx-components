import axios from 'axios';
import { API_URL } from './index';
import { TBloxProperty } from '../models';
import BleManager from 'react-native-ble-manager';
import { ResponseAssembler } from '../utils/ble';

export type TBlox = {
  id: string; // peerId?
  totalStorage: number;
  poolAllocation: number;
  name: string;
  usageStats: {
    decentralizedId: string;
    storage: number;
  }[];
};

export type GeneralResponse = {
  status: boolean;
  msg?: string;
};

export const mockBlockHardware: TBlox[] = [
  {
    id: '1',
    totalStorage: 800000,
    poolAllocation: 400000,
    name: 'Office Setup',
    usageStats: [
      {
        decentralizedId: 'key:abc12345xyz',
        storage: 500000,
      },
      {
        decentralizedId: 'ghoim234tnas09',
        storage: 30000,
      },
      {
        decentralizedId: '1plk09aslkm',
        storage: 28500,
      },
      {
        decentralizedId: 'lkj013980ma',
        storage: 15300,
      },
    ],
  },
];

export const exchangeConfig = async (data: {
  peer_id?: string;
  seed?: string;
}): Promise<{ data: { peer_id: string } }> => {
  const formData = new URLSearchParams();
  formData.append('peer_id', data?.peer_id);
  formData.append('seed', data?.seed);
  return axios.post(
    `${API_URL}/peer/exchange?${formData.toString()}`,
    undefined,
    {
      timeout: 1000 * 15,
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
};

export const getBloxProperties = async (): Promise<any> => {
  try {
    // Check for BLE connection first
    const connectedPeripherals = await BleManager.getConnectedPeripherals([]);

    if (connectedPeripherals.length > 0) {
      // Try BLE first
      const responseAssembler = new ResponseAssembler();
      try {
        const response = await responseAssembler.writeToBLEAndWaitForResponse(
          'properties',
          connectedPeripherals[0].id
        );

        if (response) {
          return { data: response };
        }
      } catch (bleError) {
        console.log('BLE properties fetch failed:', bleError);
        // Continue to HTTP fallback
      } finally {
        responseAssembler.cleanup();
      }
    }

    // Fallback to HTTP if BLE is not connected or failed
    console.log(`Fetching properties via HTTP: ${API_URL}/properties`);
    const res = await axios.get(`${API_URL}/properties`);
    console.log('HTTP response:', res);
    return res;
  } catch (error) {
    console.error('Properties fetch failed:', error);
    throw error;
  }
};
/**
 * Erase partition
 * @returns
 */
export const bloxFormatDisk = async (): Promise<{ data: GeneralResponse }> => {
  return axios.post(`${API_URL}/partition`);
};

export const bloxDeleteFulaConfig = async (): Promise<{
  data: GeneralResponse;
}> => {
  return axios.post(`${API_URL}/delete-fula-config`);
};
