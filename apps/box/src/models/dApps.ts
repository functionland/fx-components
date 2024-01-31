export type TDApp = {
  name: string;
  bundleId: string;
  peerId: string;
  bloxPeerId: string;
  accountId?: string;
  authorized: boolean;
  tag?: string;
  storageUsed?: number;
  lastUpdate?: Date;
};
