type TSettings = {
  brightness: number;
  color: string;
};

enum ETowerType {
  Fula,
  Storage,
  Hub,
}

export type TTower = {
  id: string; // randomly generated unique identifier
  name: string;
  poolId: string; // pool unique identifier
  settings: TSettings;
  storageTotal: number; // megabytes
  userStorageAllocation: {
    decentralizedId: string;
    consumed: number;
    allocated: number;
  }[];
  type: ETowerType;
};

export const mockTowerData: TTower[] = [
  {
    id: '1',
    name: 'Tower 1',
    poolId: '',
    settings: {
      color: '#FFFF00', // yellow
      brightness: 1,
    },
    storageTotal: 0,
    userStorageAllocation: [],
    type: ETowerType.Storage,
  },
  {
    id: '2',
    name: 'Tower 2',
    poolId: '',
    settings: {
      color: '#FF8E00', // orange
      brightness: 1,
    },
    storageTotal: 0,
    userStorageAllocation: [],
    type: ETowerType.Storage,
  },
  {
    id: '3',
    name: 'Tower 3',
    poolId: '',
    settings: {
      color: '#008E00', // green
      brightness: 1,
    },
    storageTotal: 0,
    userStorageAllocation: [],
    type: ETowerType.Storage,
  },
  {
    id: '4',
    name: 'Tower 4',
    poolId: '',
    settings: {
      color: '#FF6599', // pink
      brightness: 1,
    },
    storageTotal: 0,
    userStorageAllocation: [],
    type: ETowerType.Storage,
  },
  {
    id: '5',
    name: 'Tower 5',
    poolId: '',
    settings: {
      color: '#400098', // indigo
      brightness: 1,
    },
    storageTotal: 0,
    userStorageAllocation: [],
    type: ETowerType.Storage,
  },
  {
    id: '6',
    name: 'Tower 6',
    poolId: '',
    settings: {
      color: '#CD66FF', // lavender
      brightness: 1,
    },
    storageTotal: 0,
    userStorageAllocation: [],
    type: ETowerType.Storage,
  },
  {
    id: '7',
    name: 'Tower 7',
    poolId: '',
    settings: {
      color: '#FF0000', // red
      brightness: 1,
    },
    storageTotal: 0,
    userStorageAllocation: [],
    type: ETowerType.Storage,
  },
  {
    id: '8',
    name: 'Tower 8',
    poolId: '',
    settings: {
      color: '#00C0C0', // turquoise
      brightness: 1,
    },
    storageTotal: 0,
    userStorageAllocation: [],
    type: ETowerType.Storage,
  },
  {
    id: '9',
    name: 'Tower 9',
    poolId: '',
    settings: {
      color: '#8E008E', // violet
      brightness: 1,
    },
    storageTotal: 0,
    userStorageAllocation: [],
    type: ETowerType.Storage,
  },
];
