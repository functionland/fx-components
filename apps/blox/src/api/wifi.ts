import axios from 'axios';
import { API_URL } from './index';

export const getProperties = async () => {
  return axios.get(`${API_URL}/properties`, {
    timeout: 1000 * 15,
  });
};

export const postProperties = async (data) => {
  return axios.post(`${API_URL}/properties`, data);
};

export const getWifiList = async (): Promise<{ data: { essid: string }[] }> => {
  return axios.get(`${API_URL}/wifi/list`);
};

export const getWifiStatus = async () => {
  return axios.get(`${API_URL}/wifi/status`);
};

export const postWifiConnect = async (data: {
  ssid: string;
  password: string;
  countryCode: string;
}) => {
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
};

export const putApDisable = async () => {
  return axios.put(`${API_URL}/ap/disable`);
};
