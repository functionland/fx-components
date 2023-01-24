export type TDApp = {
    name: string;
    bundleId: string;
    peerId: string;
    authorized: boolean;
    tag?: string;
    storageUsed?: number;
    lastUpdate?: Date;
  };