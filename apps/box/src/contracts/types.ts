// Contract types and interfaces for PoolStorage and RewardEngine

export interface PoolInfo {
  poolId: string;
  name: string;
  region: string;
  parent: string;
  participants: string[];
  replicationFactor: number;
  // New fields from updated contract
  creator?: string;
  maxChallengeResponsePeriod?: number;
  memberCount?: number;
  maxMembers?: number;
  requiredTokens?: string;
  minPingTime?: string;
}

export interface UserPoolInfo {
  poolId: string;
  requestPoolId: string;
  account: string;
}

export interface JoinRequest {
  account: string;
  poolId: string;
  voted: string[];
  positive_votes: number;
  negative_votes: number;
  // New fields from updated contract
  timestamp?: number;
  index?: number;
  approvals?: number;
  rejections?: number;
  status?: number; // 1=pending, 2=approved, 3=rejected/cancelled
  peerId?: string;
}

export interface RewardInfo {
  account: string;
  poolId: string;
  amount: string;
  lastClaimEpoch: number;
}

export interface ContractAddresses {
  poolStorage: string;
  rewardEngine: string;
  fulaToken: string;
}

export interface ChainConfig {
  chainId: string;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  contracts: ContractAddresses;
  requiresAuth?: boolean;
}

// Contract method signatures
export interface PoolStorageContract {
  // Pool management
  createPool(name: string, region: string, parent: string): Promise<string>;
  joinPool(poolId: string): Promise<void>;
  leavePool(poolId: string): Promise<void>;
  cancelJoinRequest(poolId: string): Promise<void>;
  voteJoinRequest(poolId: string, account: string, vote: boolean): Promise<void>;
  
  // Pool queries
  getPool(poolId: string): Promise<PoolInfo>;
  listPools(offset: number, limit: number): Promise<PoolInfo[]>;
  getUserPool(account: string): Promise<UserPoolInfo>;
  getJoinRequest(poolId: string, account: string): Promise<JoinRequest>;
  
  // Events
  PoolCreated: string;
  JoinRequested: string;
  JoinRequestVoted: string;
  UserJoined: string;
  UserLeft: string;
}

export interface RewardEngineContract {
  // Reward management
  claimRewards(poolId: string): Promise<void>;
  distributeRewards(poolId: string, accounts: string[], amounts: string[]): Promise<void>;

  // Reward queries
  getRewards(account: string, poolId: string): Promise<RewardInfo>;
  getTotalRewards(account: string): Promise<string>;
  getClaimableRewards(account: string, poolId: string): Promise<string>;

  // Events
  RewardsClaimed: string;
  RewardsDistributed: string;
}

export interface FulaTokenContract {
  // ERC20 standard methods
  balanceOf(account: string): Promise<string>;
  totalSupply(): Promise<string>;
  decimals(): Promise<number>;
  symbol(): Promise<string>;
  name(): Promise<string>;

  // Transfer methods
  transfer(to: string, amount: string): Promise<void>;
  transferFrom(from: string, to: string, amount: string): Promise<void>;
  approve(spender: string, amount: string): Promise<void>;
  allowance(owner: string, spender: string): Promise<string>;

  // Events
  Transfer: string;
  Approval: string;
}

export type SupportedChain = 'base' | 'skale';

export interface ContractError extends Error {
  code?: string;
  reason?: string;
  transaction?: any;
}
