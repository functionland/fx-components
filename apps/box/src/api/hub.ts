import { TBloxFolderSize } from '../models';

export enum EDeviceStatus {
  InUse = 0,
  BackingUp = 1,
  NotInUse = 2,
  NotAvailable = 3,
}

export type TDevice = {
  name: string;
  capacity: number; // megabytes
  folderInfo: TBloxFolderSize;
  used?: number; // megabytes
  free?: number; // megabytes
  status: EDeviceStatus;
  associatedDevices: string[];
};
/*
export const mockHub: TDevice[] = [
  {
    name: 'Expansion Card 1',
    capacity: 921600,
    status: 0,
    associatedDevices: ['Home Blox Set Up', 'Tower #1', 'Slot #1'],
  },
  {
    name: 'Expansion Card 2',
    capacity: 20000,
    status: 1,
    associatedDevices: ['Home Blox Set Up', 'Tower #1', 'Slot #2'],
  },
];
*/