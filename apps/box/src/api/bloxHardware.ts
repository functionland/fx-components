import axios from 'axios';
import { API_URL } from './index'
import { TBloxProperty } from '../models';

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
  return axios.post(`${API_URL}/peer/exchange?${formData.toString()}`, undefined, {
    timeout: 1000 * 15,
    headers: {
      'Accept': '*/*',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
};

export const getBloxProperties = async (): Promise<{ data: TBloxProperty }> => {
  return axios.get(`${API_URL}/properties`);
};
