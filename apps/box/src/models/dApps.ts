export type TDApp = {
  name: string;
  bundleId: string;
  peerId: string;
  bloxPeerId: string;
  authorized: boolean;
  tag?: string;
  storageUsed?: number;
  lastUpdate?: Date;
};
