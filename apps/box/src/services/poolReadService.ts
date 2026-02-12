import { ethers } from 'ethers';
import { PoolInfo, UserPoolInfo, JoinRequest, SupportedChain } from '../contracts/types';
import { POOL_STORAGE_ABI, REWARD_ENGINE_ABI } from '../contracts/abis';
import { getChainConfigByName } from '../contracts/config';
import { peerIdToBytes32, bytes32ToPeerId } from '../utils/peerIdConversion';

/**
 * PoolReadService provides read-only access to pool data using standard RPC endpoints
 * This allows reading pool information without requiring a wallet connection.
 * Perfect for when user has signed manually and no wallet is connected.
 */
export class PoolReadService {
  private provider: ethers.providers.JsonRpcProvider | null = null;
  private poolStorageContract: ethers.Contract | null = null;
  private chain: SupportedChain;

  constructor(chain: SupportedChain = 'skale') {
    this.chain = chain;
    this.initializeProvider();
  }

  private initializeProvider(): void {
    try {
      const chainConfig = getChainConfigByName(this.chain);
      this.provider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
      
      // Initialize read-only contract
      this.poolStorageContract = new ethers.Contract(
        chainConfig.contracts.poolStorage,
        POOL_STORAGE_ABI,
        this.provider
      );
      
      console.log(`PoolReadService initialized for ${this.chain} with RPC: ${chainConfig.rpcUrl}`);
    } catch (error) {
      console.error('Failed to initialize PoolReadService:', error);
      throw error;
    }
  }

  /**
   * Switch to a different chain
   */
  switchChain(chain: SupportedChain): void {
    this.chain = chain;
    this.initializeProvider();
  }

  /**
   * List all pools from the blockchain
   */
  async listPools(offset: number = 0, limit: number = 25): Promise<PoolInfo[]> {
    try {
      if (!this.poolStorageContract) {
        throw new Error('Pool storage contract not initialized');
      }

      console.log('PoolReadService.listPools: Starting...');
      const pools: PoolInfo[] = [];
      let index = 0;

      while (true) {
        try {
          const poolId = await this.poolStorageContract.poolIds(index);
          
          // If poolId is 0, we've reached the end
          if (poolId === 0) {
            console.log('PoolReadService.listPools: Reached end of pools');
            break;
          }

          const pool = await this.poolStorageContract.pools(poolId);
          pools.push({
            poolId: pool.id.toString(),
            name: pool.name,
            region: pool.region,
            parent: '',
            participants: [],
            replicationFactor: 1,
          });

          index++;
        } catch (error) {
          console.log('PoolReadService.listPools: Reached end of pools at index', index);
          break;
        }
      }

      console.log('PoolReadService.listPools: Found', pools.length, 'pools');
      return pools;
    } catch (error) {
      console.error('PoolReadService.listPools error:', error);
      throw error;
    }
  }

  /**
   * Get all pool IDs
   */
  async getAllPoolIds(): Promise<string[]> {
    try {
      if (!this.poolStorageContract) {
        throw new Error('Pool storage contract not initialized');
      }

      const ids: string[] = [];
      let index = 0;

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('getAllPoolIds call timed out after 30 seconds')), 30000);
      });

      while (true) {
        try {
          const contractCallPromise = this.poolStorageContract.poolIds(index);
          const id = await Promise.race([contractCallPromise, timeoutPromise]);

          if (id === 0) {
            console.log('PoolReadService.getAllPoolIds: Reached end of pools');
            break;
          }

          ids.push(id.toString());
          index++;
        } catch (error) {
          console.log('PoolReadService.getAllPoolIds: Reached end at index', index);
          break;
        }
      }

      return ids;
    } catch (error) {
      console.error('PoolReadService.getAllPoolIds error:', error);
      throw error;
    }
  }

  /**
   * Get pool details by ID
   */
  async getPool(poolId: string): Promise<any> {
    try {
      if (!this.poolStorageContract) {
        throw new Error('Pool storage contract not initialized');
      }

      const pool = await this.poolStorageContract.pools(poolId);
      return {
        creator: pool.creator,
        id: pool.id.toString(),
        maxChallengeResponsePeriod: pool.maxChallengeResponsePeriod.toString(),
        memberCount: pool.memberCount.toString(),
        maxMembers: pool.maxMembers.toString(),
        requiredTokens: pool.requiredTokens.toString(),
        minPingTime: pool.minPingTime.toString(),
        name: pool.name,
        region: pool.region,
      };
    } catch (error) {
      console.error('PoolReadService.getPool error:', error);
      throw error;
    }
  }

  /**
   * Check if an account is a member of any pool
   */
  async isMemberOfAnyPool(account: string): Promise<boolean> {
    try {
      if (!this.poolStorageContract) {
        throw new Error('Pool storage contract not initialized');
      }

      const isMember = await this.poolStorageContract.isMemberOfAnyPool(account);
      console.log('PoolReadService.isMemberOfAnyPool:', { account, isMember });
      return isMember;
    } catch (error) {
      console.error('PoolReadService.isMemberOfAnyPool error:', error);
      return false;
    }
  }

  /**
   * Get member index in a pool
   */
  async getMemberIndex(poolId: string, account: string): Promise<string> {
    try {
      if (!this.poolStorageContract) {
        throw new Error('Pool storage contract not initialized');
      }

      const index = await this.poolStorageContract.getMemberIndex(poolId, account);
      return index.toString();
    } catch (error) {
      console.error('PoolReadService.getMemberIndex error:', error);
      return '0';
    }
  }

  /**
   * Check if a peer ID is a member of a pool
   */
  async isPeerIdMemberOfPool(poolId: string, peerId: string): Promise<{ isMember: boolean; memberAddress: string }> {
    try {
      if (!this.poolStorageContract) {
        throw new Error('Pool storage contract not initialized');
      }

      const peerIdBytes32 = await peerIdToBytes32(peerId);
      console.log('PoolReadService.isPeerIdMemberOfPool: Calling contract with', { poolId, peerId, peerIdBytes32 });
      
      const [isMember, memberAddress] = await this.poolStorageContract.isPeerIdMemberOfPool(poolId, peerIdBytes32);
      console.log('PoolReadService.isPeerIdMemberOfPool: Result', { isMember, memberAddress });

      return {
        isMember,
        memberAddress: memberAddress || '',
      };
    } catch (error) {
      console.error('PoolReadService.isPeerIdMemberOfPool error:', error);
      return {
        isMember: false,
        memberAddress: '',
      };
    }
  }

  /**
   * Get user pool info - check if account is member of any pool
   */
  async getUserPoolInfo(account: string, peerId?: string): Promise<UserPoolInfo> {
    try {
      let poolId = '0';
      let requestPoolId = '0';

      // Step 1: Check if account is a member of any pool
      const isMemberByAddress = await this.isMemberOfAnyPool(account);
      console.log('PoolReadService.getUserPoolInfo: isMemberByAddress', {
        isMemberByAddress,
        account,
      });

      if (isMemberByAddress && peerId) {
        // Step 2: If account is a member, find which pool(s) and check if peerId is also a member
        const poolIds = await this.getAllPoolIds();
        console.log('PoolReadService.getUserPoolInfo: All pools fetched', { poolIds, peerId });

        for (const pid of poolIds) {
          const { isMember } = await this.isPeerIdMemberOfPool(pid, peerId);
          console.log('PoolReadService.getUserPoolInfo: isPeerIdMemberOfPool', {
            isMember,
            pid,
            peerId,
          });
          if (isMember) {
            poolId = pid;
            break;
          }
        }
      } else if (isMemberByAddress) {
        // If no peerId provided, just find which pool the account is in
        const poolIds = await this.getAllPoolIds();
        console.log('PoolReadService.getUserPoolInfo: All pools fetched', { poolIds });
        for (const pid of poolIds) {
          const memberIndex = await this.getMemberIndex(pid, account);
          if (memberIndex !== '0') {
            poolId = pid;
            break;
          }
        }
      }

      return {
        account,
        poolId,
        requestPoolId,
      };
    } catch (error) {
      console.error('PoolReadService.getUserPoolInfo error:', error);
      throw error;
    }
  }

  /**
   * Get join request details
   */
  async getJoinRequest(poolId: string, account: string): Promise<any> {
    try {
      if (!this.poolStorageContract) {
        throw new Error('Pool storage contract not initialized');
      }

      const joinRequest = await this.poolStorageContract.joinRequests(poolId, account);
      return {
        poolId,
        account,
        positive_votes: joinRequest.positive_votes?.toString() || '0',
        negative_votes: joinRequest.negative_votes?.toString() || '0',
        timestamp: joinRequest.timestamp?.toString() || '0',
      };
    } catch (error) {
      console.error('PoolReadService.getJoinRequest error:', error);
      throw error;
    }
  }
}

// Singleton instance for each chain
const poolReadServiceInstances: Record<SupportedChain, PoolReadService> = {} as any;

/**
 * Get or create a PoolReadService instance for a specific chain
 */
export const getPoolReadService = (chain: SupportedChain = 'skale'): PoolReadService => {
  if (!poolReadServiceInstances[chain]) {
    poolReadServiceInstances[chain] = new PoolReadService(chain);
  }
  return poolReadServiceInstances[chain];
};
