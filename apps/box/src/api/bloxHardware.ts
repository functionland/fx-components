import axios from 'axios';
import { API_URL } from './index';
import { TBloxProperty } from '../models';
import { delay } from 'lodash';

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
  // const formData = new URLSearchParams();
  // formData.append('peer_id', data?.peer_id);
  // formData.append('seed', data?.seed);
  // return axios.post(
  //   `${API_URL}/peer/exchange?${formData.toString()}`,
  //   undefined,
  //   {
  //     timeout: 1000 * 15,
  //     headers: {
  //       Accept: '*/*',
  //       'Content-Type': 'application/x-www-form-urlencoded',
  //     },
  //   }
  // );
  console.log('exhcange called');
  return {
    data: { peer_id: '12D3KooWL1BuyxhJ5givbrR4Ym8SYpefLbD6nZRjoC5PzDCPtpQR' },
  };
};

export const getBloxProperties = async (): Promise<any> => {
  // console.log(`${API_URL}/properties`);
  // const res = await axios.get(`${API_URL}/properties`);
  // console.log('res: ', res);
  // return res;
  return {
    data: {
      name: 'Blox man',
      hardwareID: 'hwd',
      bloxFreeSpace: {
        device_count: 1,
        size: 1,
        avail: 1,
        used: 0,
        used_percentage: 0,
      },
      containerInfo_fula: 'ci',
      containerInfo_fxsupport: 'fxsupport',
      containerInfo_node: 'node',
      restartNeeded: 'false',
      ota_version: 'v_ota',
    },
  };
};
/**
 * Erase partition
 * @returns
 */
export const bloxFormatDisk = async (): Promise<{ data: GeneralResponse }> => {
  // return axios.post(`${API_URL}/partition`);
  console.log('request format');
  return { data: { status: true, msg: 'ok' } };
};

export const bloxDeleteFulaConfig = async (): Promise<{
  data: GeneralResponse;
}> => {
  // return axios.post(`${API_URL}/delete-fula-config`);
  return { data: { status: true, msg: 'ok' } };
};
