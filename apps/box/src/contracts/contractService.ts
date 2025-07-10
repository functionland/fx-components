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
  private signer: ethers.Signer | null = null;
  private chain: SupportedChain;
  private poolStorageContract: ethers.Contract | null = null;
  private rewardEngineContract: ethers.Contract | null = null;
  private fulaTokenContract: ethers.Contract | null = null;

  constructor(chain: SupportedChain = 'skale') {
    this.chain = chain;
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
        // Try to switch to the correct chain
        try {
          await web3Provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainConfig.chainId }],
          });
        } catch (switchError: any) {
          // If chain doesn't exist, try to add it
          if (switchError.code === 4902) {
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
          } else {
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
      if (!this.poolStorageContract) throw new Error('Contract not initialized');
      
      const pools = await this.poolStorageContract.listPools(offset, limit);
      return pools.map((pool: any) => ({
        poolId: pool.poolId.toString(),
        name: pool.name,
        region: pool.region,
        parent: pool.parent,
        participants: pool.participants,
        replicationFactor: pool.replicationFactor.toNumber(),
      }));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserPool(account: string): Promise<UserPoolInfo> {
    try {
      if (!this.poolStorageContract) throw new Error('Contract not initialized');
      
      const userPool = await this.poolStorageContract.getUserPool(account);
      return {
        poolId: userPool.poolId.toString(),
        requestPoolId: userPool.requestPoolId.toString(),
        account: userPool.account,
      };
    } catch (error) {
      throw this.handleError(error);
    }
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
      if (!this.provider) throw new Error('Provider not initialized');

      const address = account || await this.getConnectedAccount();
      const balance = await this.provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // FULA Token Methods
  async getFulaTokenBalance(account?: string): Promise<string> {
    try {
      if (!this.fulaTokenContract) throw new Error('FULA token contract not initialized');

      const address = account || await this.getConnectedAccount();
      const balance = await this.fulaTokenContract.balanceOf(address);
      const decimals = await this.fulaTokenContract.decimals();
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
      if (!this.fulaTokenContract) throw new Error('FULA token contract not initialized');

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        this.fulaTokenContract.name(),
        this.fulaTokenContract.symbol(),
        this.fulaTokenContract.decimals(),
        this.fulaTokenContract.totalSupply(),
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
