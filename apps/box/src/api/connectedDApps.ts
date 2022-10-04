export type DApp = {
  id: number;
  name: string;
  isConnected: boolean;
  tag: string;
  storageUsed: number;
  lastUpdate: Date;
};

enum dApps {
  fileSync = 'fileSync',
  fotos = 'fotos',
}

export type DApps = keyof typeof dApps;

export const imageMap = {
  [dApps.fileSync]: require('./../../assets/images/file_sync_logo.png'),
  [dApps.fotos]: require('./../../assets/images/fotos_logo.png'),
};

type ConnectedDApp = {
  id: number;
  name: string;
  data: Record<DApps, DApp>;
};

export const mockConnectedDAppsData: ConnectedDApp[] = [
  {
    id: 1,
    name: 'Home Blox Setup',
    data: {
      fileSync: {
        id: 1,
        name: 'File Sync',
        isConnected: true,
        tag: 'Home Blox Setup',
        storageUsed: 450000,
        lastUpdate: new Date(),
      },
      fotos: {
        id: 2,
        name: 'Fotos',
        isConnected: true,
        tag: 'Home Blox Setup',
        storageUsed: 921600,
        lastUpdate: new Date(),
      },
    },
  },
  {
    id: 2,
    name: 'Office Blox System',
    data: {
      fileSync: {
        id: 3,
        name: 'File Sync',
        isConnected: true,
        tag: 'Home Blox Setup',
        storageUsed: 35000000,
        lastUpdate: new Date(),
      },
      fotos: {
        id: 4,
        name: 'Fotos',
        isConnected: true,
        tag: 'Home Blox Setup',
        storageUsed: 27000000,
        lastUpdate: new Date(),
      },
    },
  },
];
