export enum DeviceStatus {
  InUse = 0,
  BackingUp = 1,
  NotInUse = 2,
}

export type DeviceData = {
  name: string;
  capacity: number; // megabytes
  status: DeviceStatus;
  associatedDevices: string[];
};

export const mockHub: DeviceData[] = [
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
