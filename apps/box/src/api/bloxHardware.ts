export interface Blox {
  id: string; // peerId?
  totalStorage: number;
  poolAllocation: number;
  name: string;
  usageStats: {
    decentralizedId: string;
    storage: number;
  }[];
}

export const mockBlockHardware: Blox[] = [
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
