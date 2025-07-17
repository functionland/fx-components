import { ethers } from 'ethers';
import { useSDK } from '@metamask/sdk-react';
import { 
  PoolInfo, 
  UserPoolInfo, 
  JoinRequest, 
  RewardInfo, 
  ContractError,
  SupportedChain 
} from './types';
import { POOL_STORAGE_ABI, REWARD_ENGINE_ABI, FULA_TOKEN_ABI } from './abis';
import { getChainConfigByName, METHOD_GAS_LIMITS, ContractMethod } from './config';

export class ContractService {
  private provider: ethers.providers.Web3Provider | null = null;
  private readOnlyProvider: ethers.providers.JsonRpcProvider | null = null;
  private signer: ethers.Signer | null = null;
  public chain: SupportedChain;
  private poolStorageContract: ethers.Contract | null = null;
  private rewardEngineContract: ethers.Contract | null = null;
  private fulaTokenContract: ethers.Contract | null = null;

  constructor(chain: SupportedChain = 'skale') {
    this.chain = chain;
    // Initialize read-only provider for balance queries
    const chainConfig = getChainConfigByName(this.chain);
    this.readOnlyProvider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
  }

  async initialize(provider: any): Promise<void> {
    try {
      // Handle MetaMask provider
      const web3Provider = provider.provider || provider;
      this.provider = new ethers.providers.Web3Provider(web3Provider);
      this.signer = this.provider.getSigner();

      const chainConfig = getChainConfigByName(this.chain);

      // Verify we're on the correct chain
      const network = await this.provider.getNetwork();
      const expectedChainId = parseInt(chainConfig.chainId, 16);

      if (network.chainId !== expectedChainId) {
        // Try to switch to the correct chain only once
        let switchAttempted = false;
        try {
          await web3Provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainConfig.chainId }],
          });
        } catch (switchError: any) {
          // If chain doesn't exist, try to add it ONCE
          if (switchError.code === 4902 && !switchAttempted) {
            switchAttempted = true;
            try {
              await web3Provider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: chainConfig.chainId,
                  chainName: chainConfig.name,
                  rpcUrls: [chainConfig.rpcUrl],
                  blockExplorerUrls: [chainConfig.blockExplorer],
                  nativeCurrency: {
                    name: this.chain === 'skale' ? 'sFUEL' : 'ETH',
                    symbol: this.chain === 'skale' ? 'sFUEL' : 'ETH',
                    decimals: 18,
                  },
                }],
              });
            } catch (addError: any) {
              // Notify user and abort further attempts
              if (typeof globalThis.queueToast === 'function') {
                globalThis.queueToast({
                  type: 'error',
                  title: 'Unsupported Network',
                  message: `The selected chain (${chainConfig.chainId}) is not available in MetaMask. Please add it manually.`,
                });
              }
              throw new Error(`Failed to add chain ${chainConfig.chainId} to MetaMask: ${addError?.message || addError}`);
            }
          } else {
            // Notify user and abort further attempts
            if (typeof globalThis.queueToast === 'function') {
              globalThis.queueToast({
                type: 'error',
                title: 'Unsupported Network',
                message: `Please switch to ${chainConfig.name} network in MetaMask.`,
              });
            }
            throw new Error(`Please switch to ${chainConfig.name} network`);
          }
        }
      }

      // Initialize contracts
      this.poolStorageContract = new ethers.Contract(
        chainConfig.contracts.poolStorage,
        POOL_STORAGE_ABI,
        this.signer
      );

      this.rewardEngineContract = new ethers.Contract(
        chainConfig.contracts.rewardEngine,
        REWARD_ENGINE_ABI,
        this.signer
      );

      this.fulaTokenContract = new ethers.Contract(
        chainConfig.contracts.fulaToken,
        FULA_TOKEN_ABI,
        this.signer
      );
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async switchChain(newChain: SupportedChain): Promise<void> {
    this.chain = newChain;
    if (this.provider) {
      await this.initialize(this.provider.provider);
    }
  }

  // Pool Management Methods
  async createPool(name: string, region: string, parent: string): Promise<string> {
    try {
      if (!this.poolStorageContract) throw new Error('Contract not initialized');
      
      const tx = await this.poolStorageContract.createPool(name, region, parent, {
        gasLimit: METHOD_GAS_LIMITS.createPool,
      });
      
      const receipt = await tx.wait();
      const event = receipt.events?.find((e: any) => e.event === 'PoolCreated');
      return event?.args?.poolId?.toString() || '';
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async joinPool(poolId: string): Promise<void> {
    try {
      if (!this.poolStorageContract) throw new Error('Contract not initialized');
      
      const tx = await this.poolStorageContract.joinPool(poolId, {
        gasLimit: METHOD_GAS_LIMITS.joinPool,
      });
      
      await tx.wait();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async leavePool(poolId: string): Promise<void> {
    try {
      if (!this.poolStorageContract) throw new Error('Contract not initialized');
      
      const tx = await this.poolStorageContract.leavePool(poolId, {
        gasLimit: METHOD_GAS_LIMITS.leavePool,
      });
      
      await tx.wait();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async cancelJoinRequest(poolId: string): Promise<void> {
    try {
      if (!this.poolStorageContract) throw new Error('Contract not initialized');
      
      const tx = await this.poolStorageContract.cancelJoinRequest(poolId, {
        gasLimit: METHOD_GAS_LIMITS.cancelJoinRequest,
      });
      
      await tx.wait();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async voteJoinRequest(poolId: string, account: string, vote: boolean): Promise<void> {
    try {
      if (!this.poolStorageContract) throw new Error('Contract not initialized');
      
      const tx = await this.poolStorageContract.voteJoinRequest(poolId, account, vote, {
        gasLimit: METHOD_GAS_LIMITS.voteJoinRequest,
      });
      
      await tx.wait();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Pool Query Methods
  async getPool(poolId: string): Promise<PoolInfo> {
    try {
      if (!this.poolStorageContract) throw new Error('Contract not initialized');
      
      const pool = await this.poolStorageContract.getPool(poolId);
      return {
        poolId: pool.poolId.toString(),
        name: pool.name,
        region: pool.region,
        parent: pool.parent,
        participants: pool.participants,
        replicationFactor: pool.replicationFactor.toNumber(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async listPools(offset: number = 0, limit: number = 25): Promise<PoolInfo[]> {
    try {
      console.log('📞 listPools: Starting contract call...');
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');

      const chainConfig = getChainConfigByName(this.chain);
      console.log('📞 Using contract address:', chainConfig.contracts.poolStorage);
      console.log('📞 Using RPC URL:', chainConfig.rpcUrl);

      // Use read-only provider for queries
      const readOnlyContract = new ethers.Contract(
        chainConfig.contracts.poolStorage,
        POOL_STORAGE_ABI,
        this.readOnlyProvider
      );

      const pools: PoolInfo[] = [];
      let index = 0;

      console.log('📞 Starting to iterate through pool indices...');

      while (true) {
        try {
          console.log('📞 Checking index:', index);
          const poolId = await readOnlyContract.poolIds(index);
          console.log('📞 Pool ID at index', index, ':', poolId);

          // If poolId is 0, we've reached the end
          if (poolId === 0) {
            console.log('📞 Reached end of pools (poolId = 0)');
            break;
          }

          console.log('📞 Getting pool details for ID:', poolId);
          const pool = await readOnlyContract.pools(poolId);
          console.log('📞 Pool data:', pool);

          pools.push({
            poolId: pool.id.toString(),
            name: pool.name,
            region: pool.region,
            parent: '', // Not available in this contract
            participants: [], // We'll need to get this separately if needed
            replicationFactor: 1, // Default value
          });

          index++;
        } catch (error) {
          console.log('📞 Error at index', index, '- assuming end of pools:', error.message);
          break;
        }
      }

      console.log('📞 Final mapped pools:', pools);
      return pools;
    } catch (error) {
      console.error('📞 listPools error:', error);
      throw this.handleError(error);
    }
  }

  // Get all pool IDs
  async getAllPoolIds(): Promise<string[]> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    let ids: string[] = [];
    let index = 0;
    while (true) {
      try {
        const id = await this.poolStorageContract.poolIds(index);
        ids.push(id.toString());
        index++;
      } catch (error) {
        // End of array
        break;
      }
    }
    return ids;
  }

  // Get pool details by ID
  async getPool(poolId: string): Promise<any> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
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
      region: pool.region
    };
  }

  // Get member list for a pool
  async getPoolMembers(poolId: string): Promise<string[]> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    return await this.poolStorageContract.getPoolMembers(poolId);
  }

  // Get peer IDs for a member in a pool
  async getMemberPeerIds(poolId: string, member: string): Promise<string[]> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    return await this.poolStorageContract.getMemberPeerIds(poolId, member);
  }

  // Get peer info for a peerId in a pool
  async getPeerIdInfo(poolId: string, peerId: string): Promise<{ member: string, lockedTokens: string }> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    const [member, lockedTokens] = await this.poolStorageContract.getPeerIdInfo(poolId, peerId);
    return { member, lockedTokens: lockedTokens.toString() };
  }

  // Get member index for a member in a pool
  async getMemberIndex(poolId: string, member: string): Promise<string> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    const idx = await this.poolStorageContract.getMemberIndex(poolId, member);
    return idx.toString();
  }

  // Get join request for a poolId and peerId
  async getJoinRequest(poolId: string, peerId: string): Promise<any> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    return await this.poolStorageContract.joinRequests(poolId, peerId);
  }

  // Get all join request keys for a pool
  async getJoinRequestKeys(poolId: string): Promise<string[]> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    let keys: string[] = [];
    let index = 0;
    while (true) {
      try {
        const key = await this.poolStorageContract.joinRequestKeys(poolId, index);
        keys.push(key);
        index++;
      } catch (error) {
        // End of array
        break;
      }
    }
    return keys;
  }

  // Check if address is forfeited
  async isForfeited(address: string): Promise<boolean> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    return await this.poolStorageContract.isForfeited(address);
  }

  // Get claimable tokens for a peerId
  async claimableTokens(peerId: string): Promise<string> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    const tokens = await this.poolStorageContract.claimableTokens(peerId);
    return tokens.toString();
  }

  // Get join timestamp for a peerId
  async joinTimestamp(peerId: string): Promise<string> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    const ts = await this.poolStorageContract.joinTimestamp(peerId);
    return ts.toString();
  }

  // Join a pool
  async joinPool(poolId: string): Promise<void> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    const tx = await this.poolStorageContract.joinPool(poolId, { gasLimit: METHOD_GAS_LIMITS.joinPool });
    await tx.wait();
  }

  // Leave a pool
  async leavePool(poolId: string): Promise<void> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    const tx = await this.poolStorageContract.leavePool(poolId, { gasLimit: METHOD_GAS_LIMITS.leavePool });
    await tx.wait();
  }

  // Cancel join request
  async cancelJoinRequest(poolId: string): Promise<void> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    const tx = await this.poolStorageContract.cancelJoinRequest(poolId, { gasLimit: METHOD_GAS_LIMITS.cancelJoinRequest });
    await tx.wait();
  }

  async getJoinRequest(poolId: string, account: string): Promise<JoinRequest> {
    try {
      if (!this.poolStorageContract) throw new Error('Contract not initialized');
      
      const request = await this.poolStorageContract.getJoinRequest(poolId, account);
      return {
        account: request.account,
        poolId: request.poolId.toString(),
        voted: request.voted,
        positive_votes: request.positive_votes.toNumber(),
        negative_votes: request.negative_votes.toNumber(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Reward Methods
  async claimRewards(poolId: string): Promise<void> {
    try {
      if (!this.rewardEngineContract) throw new Error('Contract not initialized');
      
      const tx = await this.rewardEngineContract.claimRewards(poolId, {
        gasLimit: METHOD_GAS_LIMITS.claimRewards,
      });
      
      await tx.wait();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getRewards(account: string, poolId: string): Promise<RewardInfo> {
    try {
      if (!this.rewardEngineContract) throw new Error('Contract not initialized');
      
      const reward = await this.rewardEngineContract.getRewards(account, poolId);
      return {
        account: reward.account,
        poolId: reward.poolId.toString(),
        amount: ethers.utils.formatEther(reward.amount),
        lastClaimEpoch: reward.lastClaimEpoch.toNumber(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTotalRewards(account: string): Promise<string> {
    try {
      if (!this.rewardEngineContract) throw new Error('Contract not initialized');
      
      const total = await this.rewardEngineContract.getTotalRewards(account);
      return ethers.utils.formatEther(total);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getClaimableRewards(account: string, poolId: string): Promise<string> {
    try {
      if (!this.rewardEngineContract) throw new Error('Contract not initialized');
      
      const claimable = await this.rewardEngineContract.getClaimableRewards(account, poolId);
      return ethers.utils.formatEther(claimable);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // User Membership Methods
  async isMemberOfAnyPool(account: string): Promise<boolean> {
    try {
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');
      console.log('isMemberOfAnyPool', { account });

      // Use read-only provider like we do for listPools to avoid signer issues
      const chainConfig = getChainConfigByName(this.chain);
      const readOnlyContract = new ethers.Contract(
        chainConfig.contracts.poolStorage,
        POOL_STORAGE_ABI,
        this.readOnlyProvider
      );

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('isMemberOfAnyPool call timed out after 30 seconds')), 30000);
      });

      const contractCallPromise = readOnlyContract.isMemberOfAnyPool(account);

      console.log('isMemberOfAnyPool: Making contract call with read-only provider...');
      const result = await Promise.race([contractCallPromise, timeoutPromise]);
      console.log('isMemberOfAnyPool: Contract call completed', { result });

      return result;
    } catch (error) {
      console.error('isMemberOfAnyPool error', { account, error: error instanceof Error ? error.message : String(error) });
      throw this.handleError(error);
    }
  }

  // Check if a peerId is member of a specific pool
  async isPeerIdMemberOfPool(poolId: string, peerId: string): Promise<{ isMember: boolean, memberAddress: string }> {
    try {
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');

      // Use read-only provider for consistency
      const chainConfig = getChainConfigByName(this.chain);
      const readOnlyContract = new ethers.Contract(
        chainConfig.contracts.poolStorage,
        POOL_STORAGE_ABI,
        this.readOnlyProvider
      );

      console.log('isPeerIdMemberOfPool: Making contract call...', { poolId, peerId });
      const [isMember, memberAddress] = await readOnlyContract.isPeerIdMemberOfPool(poolId, peerId);
      console.log('isPeerIdMemberOfPool: Contract call completed', { isMember, memberAddress });

      return { isMember, memberAddress };
    } catch (error) {
      console.error('isPeerIdMemberOfPool error', { poolId, peerId, error: error instanceof Error ? error.message : String(error) });
      throw this.handleError(error);
    }
  }

  // Get total members across all pools
  async getTotalMembers(): Promise<string> {
    try {
      if (!this.poolStorageContract) throw new Error('Contract not initialized');
      const total = await this.poolStorageContract.getTotalMembers();
      return total.toString();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get user pool info - follows the correct process:
  // 1. Check if connected account is a member of any pool
  // 2. If yes, check if blox peerId is a member of that pool
  async getUserPoolInfo(account: string, peerId?: string): Promise<UserPoolInfo> {
    try {
      console.log('getUserPoolInfo', {account, peerId});
      if (!this.poolStorageContract) throw new Error('Contract not initialized');

      let poolId = '0';
      let requestPoolId = '0';

      // Step 1: Check if connected account is a member of any pool
      const isMemberByAddress = await this.isMemberOfAnyPool(account);
      console.log('getUserPoolInfo: isMemberByAddress called', {
        isMemberByAddress,
        account,
      });

      if (isMemberByAddress && peerId) {
        // Step 2: If account is a member, find which pool(s) and check if peerId is also a member
        const poolIds = await this.getAllPoolIds();
        console.log('getUserPoolInfo: All pools fetched', { poolIds, peerId });

        for (const pid of poolIds) {
            // Account is a member, now check if peerId is also a member of this pool
            const { isMember } = await this.isPeerIdMemberOfPool(pid, peerId);
            console.log('getUserPoolInfo: isPeerIdMemberOfPool fetched', {
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
        console.log('getUserPoolInfo: All pools fetched', { poolIds });
        for (const pid of poolIds) {
          const memberIndex = await this.getMemberIndex(pid, account);
          if (memberIndex !== '0') {
            poolId = pid;
            break;
          }
        }
      }

      // TODO: Check for pending join requests in requestPoolId

      return {
        account,
        poolId,
        requestPoolId,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Alias for backward compatibility - hooks expect this method name
  async getUserPool(account: string, peerId?: string): Promise<UserPoolInfo> {
    console.log('getUserPool', {account});
    return this.getUserPoolInfo(account, peerId);
  }

  // Utility Methods
  async getConnectedAccount(): Promise<string> {
    try {
      if (!this.signer) throw new Error('Signer not initialized');
      return await this.signer.getAddress();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getBalance(account?: string): Promise<string> {
    try {
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');

      if (!account) {
        throw new Error('Account address is required for balance query');
      }

      const balance = await this.readOnlyProvider.getBalance(account);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // FULA Token Methods
  async getFulaTokenBalance(account?: string): Promise<string> {
    try {
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');

      if (!account) {
        throw new Error('Account address is required for balance query');
      }

      // Create read-only contract instance for balance queries
      const chainConfig = getChainConfigByName(this.chain);
      const readOnlyTokenContract = new ethers.Contract(
        chainConfig.contracts.fulaToken,
        FULA_TOKEN_ABI,
        this.readOnlyProvider
      );

      const balance = await readOnlyTokenContract.balanceOf(account);
      const decimals = await readOnlyTokenContract.decimals();
      return ethers.utils.formatUnits(balance, decimals);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getFulaTokenInfo(): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
  }> {
    try {
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');

      // Create read-only contract instance for token info queries
      const chainConfig = getChainConfigByName(this.chain);
      const readOnlyTokenContract = new ethers.Contract(
        chainConfig.contracts.fulaToken,
        FULA_TOKEN_ABI,
        this.readOnlyProvider
      );

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        readOnlyTokenContract.name(),
        readOnlyTokenContract.symbol(),
        readOnlyTokenContract.decimals(),
        readOnlyTokenContract.totalSupply(),
      ]);

      return {
        name,
        symbol,
        decimals,
        totalSupply: ethers.utils.formatUnits(totalSupply, decimals),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async transferFulaToken(to: string, amount: string): Promise<void> {
    try {
      if (!this.fulaTokenContract) throw new Error('FULA token contract not initialized');

      const decimals = await this.fulaTokenContract.decimals();
      const amountWei = ethers.utils.parseUnits(amount, decimals);

      const tx = await this.fulaTokenContract.transfer(to, amountWei);
      await tx.wait();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): ContractError {
    console.error('Contract error:', error);
    
    const contractError: ContractError = new Error(
      error.reason || error.message || 'Unknown contract error'
    );
    
    contractError.code = error.code;
    contractError.reason = error.reason;
    contractError.transaction = error.transaction;
    
    return contractError;
  }
}

// Singleton instance
let contractServiceInstance: ContractService | null = null;

export const getContractService = (chain?: SupportedChain): ContractService => {
  if (!contractServiceInstance || (chain && contractServiceInstance.chain !== chain)) {
    contractServiceInstance = new ContractService(chain);
  }
  return contractServiceInstance;
};

// Force reset the singleton instance (useful for development)
export const resetContractService = (): void => {
  contractServiceInstance = null;
};

// Hook to use contract service with MetaMask
export const useContractService = () => {
  const { provider } = useSDK();

  const initializeService = async (chain: SupportedChain): Promise<ContractService> => {
    if (!provider) {
      throw new Error('MetaMask not connected');
    }

    const service = getContractService(chain);
    await service.initialize(provider);
    return service;
  };

  return {
    initializeService,
    getService: getContractService,
  };
};
