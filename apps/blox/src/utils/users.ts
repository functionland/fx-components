import { mockBlockHardware } from '../api/bloxHardware';

type UsageDetailsType = {
  totalUsage: number;
} & Record<string, number>;
export const getUserUsageDetails = (user: {
  decentralizedId: string;
  peerId: string[];
}): UsageDetailsType => {
  const ret = { totalUsage: 0 };
  for (const blox of mockBlockHardware) {
    if (user.peerId.includes(blox.id)) {
      const stats = blox.usageStats.find(
        (elem) => elem.decentralizedId === user.decentralizedId
      );
      if (stats) {
        ret[blox.id] = stats.storage;
        ret.totalUsage += stats.storage;
      }
    }
  }

  return ret;
};
