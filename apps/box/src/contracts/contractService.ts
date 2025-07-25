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
import { getChainConfigByName, getChainConfig, METHOD_GAS_LIMITS, ContractMethod, CONTRACT_ADDRESSES, CHAIN_DISPLAY_NAMES } from './config';
import { peerIdToBytes32, bytes32ToPeerId } from '../utils/peerIdConversion';

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

      console.log(`Chain verification: current=${network.chainId}, expected=${expectedChainId}, chainName=${this.chain}`);

      if (network.chainId !== expectedChainId) {
        // Check if the current chain is supported
        const currentChainConfig = getChainConfig(`0x${network.chainId.toString(16)}`);

        if (currentChainConfig) {
          // If user is on a supported chain but different from app setting,
          // suggest updating app setting instead of forcing chain switch
          const currentChainName = Object.keys(CONTRACT_ADDRESSES).find(
            key => CONTRACT_ADDRESSES[key as SupportedChain].chainId === `0x${network.chainId.toString(16)}`
          ) as SupportedChain;

          if (currentChainName) {
            if (typeof globalThis.queueToast === 'function') {
              globalThis.queueToast({
                type: 'info',
                title: 'Chain Mismatch Detected',
                message: `You're on ${CHAIN_DISPLAY_NAMES[currentChainName]} but app is set to ${chainConfig.name}. Go to Settings > Chain Selection to update.`,
              });
            }

            // Initialize with the current chain instead of forcing a switch
            this.chain = currentChainName;
            const currentConfig = getChainConfigByName(currentChainName);

            // Initialize contracts with current chain
            this.poolStorageContract = new ethers.Contract(
              currentConfig.contracts.poolStorage,
              POOL_STORAGE_ABI,
              this.signer
            );

            this.rewardEngineContract = new ethers.Contract(
              currentConfig.contracts.rewardEngine,
              REWARD_ENGINE_ABI,
              this.signer
            );

            this.fulaTokenContract = new ethers.Contract(
              currentConfig.contracts.fulaToken,
              FULA_TOKEN_ABI,
              this.signer
            );

            return; // Exit early, contracts are initialized
          }
        }

        // Only attempt chain switch if user is on an unsupported chain
        // or if this is an explicit user-initiated chain switch
        try {
          await web3Provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainConfig.chainId }],
          });

          // Wait a moment for the chain switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Verify the switch was successful
          const newNetwork = await this.provider.getNetwork();
          if (newNetwork.chainId !== expectedChainId) {
            throw new Error('Chain switch was not completed');
          }

        } catch (switchError: any) {
          // Handle user rejection (code 4001) gracefully
          if (switchError.code === 4001) {
            if (typeof globalThis.queueToast === 'function') {
              globalThis.queueToast({
                type: 'warning',
                title: 'Chain Switch Cancelled',
                message: `Please switch to ${chainConfig.name} network in MetaMask to use this feature.`,
              });
            }
            throw new Error(`Please switch to ${chainConfig.name} network to continue`);
          }

          // If chain doesn't exist, try to add it
          if (switchError.code === 4902) {
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
              if (typeof globalThis.queueToast === 'function') {
                globalThis.queueToast({
                  type: 'error',
                  title: 'Failed to Add Network',
                  message: `Could not add ${chainConfig.name} to MetaMask. Please add it manually.`,
                });
              }
              throw new Error(`Failed to add ${chainConfig.name} to MetaMask`);
            }
          } else {
            // Other errors
            if (typeof globalThis.queueToast === 'function') {
              globalThis.queueToast({
                type: 'error',
                title: 'Chain Switch Failed',
                message: `Could not switch to ${chainConfig.name}. Please switch manually in MetaMask.`,
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

  async joinPool(poolId: string, peerId?: string): Promise<void> {
    try {
      if (!this.poolStorageContract) throw new Error('Contract not initialized');

      if (!peerId) {
        throw new Error('PeerId is required for joining pool');
      }

      // Convert peerId to bytes32 format for contract call
      const peerIdBytes32 = await peerIdToBytes32(peerId);
      console.log('joinPool: Converted peerId to bytes32', { peerId, peerIdBytes32 });

      const tx = await this.poolStorageContract.joinPoolRequest(poolId, peerIdBytes32, {
        gasLimit: METHOD_GAS_LIMITS.joinPool,
      });

      await tx.wait();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async leavePool(poolId: string, peerId?: string): Promise<void> {
    try {
      console.log('leavePool: Starting leave pool process', { poolId, peerId });

      if (!this.poolStorageContract) throw new Error('Contract not initialized');

      if (!peerId) {
        throw new Error('PeerId is required for leaving pool');
      }

      // Convert peerId to bytes32 format for contract call
      const peerIdBytes32 = await peerIdToBytes32(peerId);
      console.log('leavePool: Converted peerId to bytes32', { peerId, peerIdBytes32 });
      console.log('leavePool: About to call removeMemberPeerId on contract');
      console.log('leavePool: removeMemberPeerId exists:', typeof this.poolStorageContract.removeMemberPeerId);
      console.log('leavePool: Call parameters:', { poolId, peerIdBytes32, gasLimit: METHOD_GAS_LIMITS.leavePool });

      try {


        /* Dry-run */
        const pid   = Number(poolId);
        const poolStorageAddress = CONTRACT_ADDRESSES[this.chain]?.contracts.poolStorage;
        const iface = this.poolStorageContract!.interface;
        const data  = iface.encodeFunctionData(
          "removeMemberPeerId(uint32,bytes32)",
          [pid, peerIdBytes32]
        );
        try {
          await this.readOnlyProvider!.call({
            to: poolStorageAddress,
            data,
          });
          console.log("dry-run succeed")
        } catch (err: any) {
          if (err.data) {
            const decoded = iface.parseError(err.data);       // PNF / PNF2 / OCA
            console.error("Simulation revert:", decoded.name);
          } else {
            console.error("Node refused call:", err.message);
          }
          return;      // abort if it would revert on‑chain
        }

        console.log("leavepool: sending actual transaction")
        const gasHex = ethers.utils.hexlify(150_000); 
        const txHash = await this.provider!.provider.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: await this.signer!.getAddress(), // MetaMask fills if omitted on v0.30+
              to: poolStorageAddress,
              data,
              gas: gasHex, // **gas**, not gasLimit
              value: '0x0',
            },
          ],
        });
        console.log('User confirmed – hash:', txHash);

        // 4. Optionally wait for inclusion with readOnlyProvider:
        await this.readOnlyProvider!.waitForTransaction(txHash);
        /*
        try {
          console.log("leavepool: dry-run transaction");
          await this.poolStorageContract.callStatic
          .removeMemberPeerId(
            Number(poolId),                       // be explicit – BigNumberish
            peerIdBytes32,
            { from: await this.signer.getAddress() }
          ); 
        } catch (dryRunError) {
          console.log("leavepool:", dryRunError);
        }
        // First, try to estimate gas to see if the transaction would succeed
        console.log('leavePool: Estimating gas for removeMemberPeerId...');
        
        try {
          // Add timeout to gas estimation
          const gasEstimationPromise = this.poolStorageContract.estimateGas.removeMemberPeerId(Number(poolId), peerIdBytes32);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Gas estimation timeout after 10 seconds')), 10000);
          });

          const estimatedGas = await Promise.race([gasEstimationPromise, timeoutPromise]);
          console.log('leavePool: Gas estimation successful', { estimatedGas: estimatedGas.toString() });
        } catch (gasEstimationError) {
          console.error('leavePool: Gas estimation failed:', gasEstimationError);
          console.error('leavePool: Gas estimation error details:', {
            message: gasEstimationError.message,
            code: gasEstimationError.code,
            reason: gasEstimationError.reason,
            data: gasEstimationError.data
          });

          // If gas estimation fails, the transaction will likely fail too
          // But let's try anyway in case it's just a gas estimation issue
          console.log('leavePool: Continuing despite gas estimation failure...');
        }

        console.log('leavePool: Calling removeMemberPeerId with transaction...');
        console.log('leavePool: Transaction parameters:', {
          poolId: Number(poolId),
          peerIdBytes32,
          gasLimit: 150000,
          from: await this.signer.getAddress()
        });

        const tx = await this.poolStorageContract.removeMemberPeerId(
          Number(poolId),
          peerIdBytes32,
          {
            gasLimit: Number(150000)
          }
        );

        console.log('leavePool: Transaction sent, waiting for confirmation', { txHash: tx.hash });
        const receipt = await tx.wait();
*/
        console.log('leavePool: Transaction confirmed', { txHash });
      } catch (contractCallError) {
        console.error('leavePool: Contract call failed:', contractCallError);
        console.error('leavePool: Error details:', {
          message: contractCallError.message,
          code: contractCallError.code,
          reason: contractCallError.reason,
          data: contractCallError.data,
          transaction: contractCallError.transaction
        });
        throw contractCallError;
      }
    } catch (error) {
      console.error('leavePool: Error occurred', error);
      throw this.handleError(error);
    }
  }

  async cancelJoinRequest(poolId: string, peerId?: string): Promise<void> {
    try {
      if (!this.poolStorageContract) throw new Error('Contract not initialized');

      if (!peerId) {
        throw new Error('PeerId is required for canceling join request');
      }

      // Convert peerId to bytes32 format for contract call
      const peerIdBytes32 = await peerIdToBytes32(peerId);
      console.log('cancelJoinRequest: Converted peerId to bytes32', { peerId, peerIdBytes32 });

      const tx = await this.poolStorageContract.cancelJoinRequest(poolId, peerIdBytes32, {
        gasLimit: METHOD_GAS_LIMITS.cancelJoinRequest,
      });

      await tx.wait();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async voteJoinRequest(poolId: string, peerId: string, voterPeerId: string, vote: boolean): Promise<void> {
    try {
      if (!this.poolStorageContract) throw new Error('Contract not initialized');

      // Convert both peerIds to bytes32 format for contract call
      const peerIdBytes32 = await peerIdToBytes32(peerId);
      const voterPeerIdBytes32 = await peerIdToBytes32(voterPeerId);
      console.log('voteJoinRequest: Converted peerIds to bytes32', {
        peerId, peerIdBytes32,
        voterPeerId, voterPeerIdBytes32
      });

      const tx = await this.poolStorageContract.voteOnJoinRequest(poolId, peerIdBytes32, voterPeerIdBytes32, vote, {
        gasLimit: METHOD_GAS_LIMITS.voteJoinRequest,
      });

      await tx.wait();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Pool Query Methods

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
    try {
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');

      // Use read-only provider like in listPools to avoid hanging issues
      const chainConfig = getChainConfigByName(this.chain);
      const readOnlyContract = new ethers.Contract(
        chainConfig.contracts.poolStorage,
        POOL_STORAGE_ABI,
        this.readOnlyProvider
      );

      let ids: string[] = [];
      let index = 0;

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('getAllPoolIds call timed out after 30 seconds')), 30000);
      });

      while (true) {
        console.log("HERE index:"+index);
        try {
          const contractCallPromise = readOnlyContract.poolIds(index);
          const id = await Promise.race([contractCallPromise, timeoutPromise]);
          console.log("HERE id: "+id);

          // If poolId is 0, we've reached the end
          if (id === 0) {
            console.log('getAllPoolIds: Reached end of pools (poolId = 0)');
            break;
          }

          ids.push(id.toString());
          index++;
        } catch (error) {
          // End of array or timeout
          console.error("HERE Error", error);
          break;
        }
      }
      console.log('getAllPoolIds: Final pool IDs:', ids);
      return ids;
    } catch (error) {
      console.error('getAllPoolIds error:', error);
      throw this.handleError(error);
    }
  }

  // Get pool details by ID
  async getPool(poolId: string): Promise<any> {
    try {
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');

      // Use read-only provider for consistency
      const chainConfig = getChainConfigByName(this.chain);
      const readOnlyContract = new ethers.Contract(
        chainConfig.contracts.poolStorage,
        POOL_STORAGE_ABI,
        this.readOnlyProvider
      );

      const pool = await readOnlyContract.pools(poolId);
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
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get member list for a pool
  async getPoolMembers(poolId: string): Promise<string[]> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    return await this.poolStorageContract.getPoolMembers(poolId);
  }

  // Get peer IDs for a member in a pool
  async getMemberPeerIds(poolId: string, member: string): Promise<string[]> {
    try {
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');

      // Use read-only provider for consistency
      const chainConfig = getChainConfigByName(this.chain);
      const readOnlyContract = new ethers.Contract(
        chainConfig.contracts.poolStorage,
        POOL_STORAGE_ABI,
        this.readOnlyProvider
      );

      const peerIds = await readOnlyContract.getMemberPeerIds(poolId, member);

      // If the contract returns bytes32 peerIds, convert them back to string format
      // Note: This depends on the contract implementation - if it returns strings, no conversion needed
      const convertedPeerIds = await Promise.all(
        peerIds.map(async (peerId: any) => {
          // Check if it's a bytes32 (hex string starting with 0x and 66 chars long)
          if (typeof peerId === 'string' && peerId.startsWith('0x') && peerId.length === 66) {
            try {
              return await bytes32ToPeerId(peerId);
            } catch (error) {
              console.warn('Failed to convert bytes32 to peerId, returning as-is:', peerId);
              return peerId;
            }
          }
          return peerId;
        })
      );

      return convertedPeerIds;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get peer info for a peerId in a pool
  async getPeerIdInfo(poolId: string, peerId: string): Promise<{ member: string, lockedTokens: string }> {
    try {
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');

      // Use read-only provider for consistency
      const chainConfig = getChainConfigByName(this.chain);
      const readOnlyContract = new ethers.Contract(
        chainConfig.contracts.poolStorage,
        POOL_STORAGE_ABI,
        this.readOnlyProvider
      );

      // Convert peerId to bytes32 format for contract call
      const peerIdBytes32 = await peerIdToBytes32(peerId);
      console.log('getPeerIdInfo: Converted peerId to bytes32', { peerId, peerIdBytes32 });

      const [member, lockedTokens] = await readOnlyContract.getPeerIdInfo(poolId, peerIdBytes32);
      return { member, lockedTokens: lockedTokens.toString() };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get member index for a member in a pool
  async getMemberIndex(poolId: string, member: string): Promise<string> {
    try {
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');

      // Use read-only provider for consistency
      const chainConfig = getChainConfigByName(this.chain);
      const readOnlyContract = new ethers.Contract(
        chainConfig.contracts.poolStorage,
        POOL_STORAGE_ABI,
        this.readOnlyProvider
      );

      const idx = await readOnlyContract.getMemberIndex(poolId, member);
      return idx.toString();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get join request for a poolId and peerId
  async getJoinRequest(poolId: string, peerId: string): Promise<any> {
    try {
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');

      // Use read-only provider for consistency
      const chainConfig = getChainConfigByName(this.chain);
      const readOnlyContract = new ethers.Contract(
        chainConfig.contracts.poolStorage,
        POOL_STORAGE_ABI,
        this.readOnlyProvider
      );

      // Convert peerId to bytes32 format for contract call
      const peerIdBytes32 = await peerIdToBytes32(peerId);
      console.log('getJoinRequest: Converted peerId to bytes32', { peerId, peerIdBytes32 });

      return await readOnlyContract.joinRequests(poolId, peerIdBytes32);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get all join request keys for a pool
  async getJoinRequestKeys(poolId: string): Promise<string[]> {
    try {
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');

      // Use read-only provider for consistency
      const chainConfig = getChainConfigByName(this.chain);
      const readOnlyContract = new ethers.Contract(
        chainConfig.contracts.poolStorage,
        POOL_STORAGE_ABI,
        this.readOnlyProvider
      );

      let keys: string[] = [];
      let index = 0;
      while (true) {
        try {
          const key = await readOnlyContract.joinRequestKeys(poolId, index);

          // If the key is a bytes32 peerId, convert it back to string format
          if (typeof key === 'string' && key.startsWith('0x') && key.length === 66) {
            try {
              const convertedKey = await bytes32ToPeerId(key);
              keys.push(convertedKey);
            } catch (error) {
              console.warn('Failed to convert bytes32 to peerId, using as-is:', key);
              keys.push(key);
            }
          } else {
            keys.push(key);
          }

          index++;
        } catch (error) {
          // End of array
          break;
        }
      }
      return keys;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Check if address is forfeited
  async isForfeited(address: string): Promise<boolean> {
    if (!this.poolStorageContract) throw new Error('Contract not initialized');
    return await this.poolStorageContract.isForfeited(address);
  }

  // Get unclaimed rewards for a peerId and poolId using RewardEngine
  async getUnclaimedRewards(account: string, peerId: string, poolId: string): Promise<{
    unclaimedMining: string;
    unclaimedStorage: string;
    totalUnclaimed: string;
  }> {
    try {
      if (!this.rewardEngineContract) throw new Error('Contract not initialized');

      // Convert peerId to bytes32 format for contract call
      const peerIdBytes32 = await peerIdToBytes32(peerId);
      console.log('getUnclaimedRewards: Converted peerId to bytes32', { peerId, peerIdBytes32 });

      const result = await this.rewardEngineContract.getUnclaimedRewards(account, peerIdBytes32, poolId);
      return {
        unclaimedMining: ethers.utils.formatEther(result.unclaimedMining),
        unclaimedStorage: ethers.utils.formatEther(result.unclaimedStorage),
        totalUnclaimed: ethers.utils.formatEther(result.totalUnclaimed),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get claimed rewards info for a peerId and poolId
  async getClaimedRewardsInfo(account: string, peerId: string, poolId: string): Promise<{
    lastClaimedTimestamp: number;
    timeSinceLastClaim: number;
  }> {
    try {
      if (!this.rewardEngineContract) throw new Error('Contract not initialized');

      // Convert peerId to bytes32 format for contract call
      const peerIdBytes32 = await peerIdToBytes32(peerId);
      console.log('getClaimedRewardsInfo: Converted peerId to bytes32', { peerId, peerIdBytes32 });

      const result = await this.rewardEngineContract.getClaimedRewardsInfo(account, peerIdBytes32, poolId);
      return {
        lastClaimedTimestamp: result.lastClaimedTimestamp.toNumber(),
        timeSinceLastClaim: result.timeSinceLastClaim.toNumber(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Claim rewards for a peerId and poolId using RewardEngine
  async claimRewardsForPeer(peerId: string, poolId: string): Promise<void> {
    try {
      if (!this.rewardEngineContract) throw new Error('Contract not initialized');

      // Convert peerId to bytes32 format for contract call
      const peerIdBytes32 = await peerIdToBytes32(peerId);
      console.log('claimRewardsForPeer: Converted peerId to bytes32', { peerId, peerIdBytes32 });

      const tx = await this.rewardEngineContract.claimRewards(peerIdBytes32, poolId, {
        gasLimit: METHOD_GAS_LIMITS.claimRewards,
      });

      await tx.wait();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get join timestamp for a peerId
  async joinTimestamp(peerId: string): Promise<string> {
    try {
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');

      // Use read-only provider for consistency
      const chainConfig = getChainConfigByName(this.chain);
      const readOnlyContract = new ethers.Contract(
        chainConfig.contracts.poolStorage,
        POOL_STORAGE_ABI,
        this.readOnlyProvider
      );

      // Convert peerId to bytes32 format for contract call
      const peerIdBytes32 = await peerIdToBytes32(peerId);
      console.log('joinTimestamp: Converted peerId to bytes32', { peerId, peerIdBytes32 });

      const ts = await readOnlyContract.joinTimestamp(peerIdBytes32);
      return ts.toString();
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

      // Convert peerId to bytes32 format for contract call
      const peerIdBytes32 = await peerIdToBytes32(peerId);
      console.log('isPeerIdMemberOfPool: Converted peerId to bytes32', { peerId, peerIdBytes32 });

      const [isMember, memberAddress] = await readOnlyContract.isPeerIdMemberOfPool(poolId, peerIdBytes32);
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
        console.log("getUserPoolInfo: isMemberByAddress="+isMemberByAddress+", peerId"+peerId);
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
        console.log("getUserPoolInfo: only isMemberByAddress="+isMemberByAddress);
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
      } else 
        console.log("getUserPoolInfo: None");

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

    let errorMessage = error.reason || error.message || 'Unknown contract error';

    // Handle specific error types
    if (error.code === 'NETWORK_ERROR') {
      if (error.message?.includes('underlying network changed')) {
        errorMessage = 'Network changed during operation. Please refresh and try again.';
      } else {
        errorMessage = 'Network connection failed. Please check your internet connection.';
      }
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Insufficient funds for transaction.';
    } else if (error.code === 'USER_REJECTED') {
      errorMessage = 'Transaction was rejected by user.';
    } else if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again.';
    } else if (error.message?.includes('execution reverted')) {
      errorMessage = 'Transaction failed: ' + (error.reason || 'Contract execution reverted');
    } else if (error.message?.includes('connection') || error.message?.includes('fetch')) {
      errorMessage = 'Connection failed. Please check your network and try again.';
    }

    const contractError: ContractError = new Error(errorMessage);

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
