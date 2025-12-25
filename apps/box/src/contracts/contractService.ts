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

  async initialize(provider: any, options: { allowNetworkSwitch?: boolean } = {}): Promise<void> {
    const { allowNetworkSwitch = true } = options;
    try {
      // Handle MetaMask provider
      const web3Provider = provider.provider || provider;
      this.provider = new ethers.providers.Web3Provider(web3Provider);
      this.signer = this.provider.getSigner();

      const chainConfig = getChainConfigByName(this.chain);

      // Verify we're on the correct chain - request fresh chain ID from MetaMask
      console.log('ContractService: Requesting fresh chainId from MetaMask for verification...');
      const rawProvider = this.provider.provider || this.provider;
      const currentChainIdHex = await rawProvider?.request?.({ method: 'eth_chainId' }) || '0x0';
      const currentChainId = parseInt(currentChainIdHex, 16);
      const expectedChainId = parseInt(chainConfig.chainId, 16);

      console.log(`Chain verification: current=${currentChainId}, expected=${expectedChainId}, chainName=${this.chain}`);
      console.log(`Chain verification hex: current=${currentChainIdHex}, expected=${chainConfig.chainId}`);

      if (currentChainId !== expectedChainId) {
        console.log(`ContractService: Chain mismatch detected - current: ${currentChainId}, expected: ${expectedChainId} (${chainConfig.name})`);
        
        if (!allowNetworkSwitch) {
          console.log('ContractService: Network switch not allowed, throwing error for user-initiated handling');
          throw new Error(`NETWORK_SWITCH_REQUIRED: MetaMask is on chain ${currentChainId} but app requires ${expectedChainId} (${chainConfig.name})`);
        }
        
        // Check if the current chain is supported
        const currentChainConfig = getChainConfig(currentChainIdHex);
        const currentChainName = Object.keys(CONTRACT_ADDRESSES).find(
          key => CONTRACT_ADDRESSES[key as SupportedChain].chainId === currentChainIdHex
        ) as SupportedChain;

        if (currentChainConfig && currentChainName) {
          console.log(`ContractService: User is on ${CHAIN_DISPLAY_NAMES[currentChainName]} but app requires ${chainConfig.name}`);
          if (typeof (globalThis as any).queueToast === 'function') {
            (globalThis as any).queueToast({
              type: 'info',
              title: 'Network Switch Required',
              message: `Switching from ${CHAIN_DISPLAY_NAMES[currentChainName]} to ${chainConfig.name} as selected in app settings.`,
            });
          }
        }

        // Attempt chain switch when allowed
        console.log(`ContractService: Attempting to switch to ${chainConfig.name} (${chainConfig.chainId})`);
        try {
          console.log(`ContractService: Sending wallet_switchEthereumChain request with chainId: ${chainConfig.chainId}`);
          console.log(`ContractService: Request params:`, { chainId: chainConfig.chainId });
          
          const switchResult = await web3Provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainConfig.chainId }],
          });
          
          console.log(`ContractService: Chain switch request completed with result:`, switchResult);
          console.log(`ContractService: MetaMask should now be prompting user to switch to ${chainConfig.name}`);
          
          // Add a small delay to allow MetaMask to process the request
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Wait longer and retry verification multiple times for chain switch to complete
          console.log(`ContractService: Waiting for chain switch to complete...`);
          
          let verificationAttempts = 0;
          const maxVerificationAttempts = 5;
          let chainSwitchSuccessful = false;
          
          while (verificationAttempts < maxVerificationAttempts && !chainSwitchSuccessful) {
            verificationAttempts++;
            console.log(`ContractService: Chain switch verification attempt ${verificationAttempts}/${maxVerificationAttempts}`);
            
            // Wait progressively longer between attempts
            const waitTime = 2000 + (verificationAttempts * 1000); // 2s, 3s, 4s, 5s, 6s
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            try {
              const newNetwork = await this.provider.getNetwork();
              console.log(`ContractService: Verification attempt ${verificationAttempts} - current chainId: ${newNetwork.chainId}, expected: ${expectedChainId}`);
              
              if (newNetwork.chainId === expectedChainId) {
                console.log(`ContractService: Chain switch verified successfully on attempt ${verificationAttempts}`);
                chainSwitchSuccessful = true;
                break;
              } else {
                console.log(`ContractService: Chain switch not yet complete on attempt ${verificationAttempts}. Current: ${newNetwork.chainId}, Expected: ${expectedChainId}`);
              }
            } catch (verificationError) {
              console.warn(`ContractService: Network verification attempt ${verificationAttempts} failed:`, verificationError);
            }
          }
          
          if (!chainSwitchSuccessful) {
            console.error(`ContractService: Chain switch verification failed after ${maxVerificationAttempts} attempts`);
            throw new Error(`Chain switch was not completed after ${maxVerificationAttempts} verification attempts. Please manually switch to ${chainConfig.name} in MetaMask.`);
          }
        } catch (switchError: any) {
          console.error(`ContractService: Chain switch failed:`, switchError);
          console.error(`ContractService: Error details - code: ${switchError.code}, message: ${switchError.message}`);
          
          // Handle user rejection (code 4001) gracefully
          if (switchError.code === 4001) {
            console.log(`ContractService: User rejected chain switch request`);
            if (typeof globalThis.queueToast === 'function') {
              globalThis.queueToast({
                type: 'warning',
                title: 'Chain Switch Cancelled',
                message: `Please switch to ${chainConfig.name} network in MetaMask to use this feature.`,
              });
            }
            throw new Error(`Please switch to ${chainConfig.name} network to continue`);
          }
          
          // Handle case where MetaMask doesn't respond or request fails silently
          if (!switchError.code || switchError.code === -32603) {
            console.warn(`ContractService: Chain switch request may have failed silently or MetaMask didn't respond properly`);
            console.warn(`ContractService: This might indicate MetaMask is not showing the chain switch prompt`);
            
            if (typeof globalThis.queueToast === 'function') {
              globalThis.queueToast({
                type: 'warning',
                title: 'Chain Switch Issue',
                message: `MetaMask may not be responding. Please manually switch to ${chainConfig.name} network in MetaMask.`,
              });
            }
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
    console.log(`ContractService: switchChain called - switching from ${this.chain} to ${newChain}`);
    
    if (!this.provider) {
      console.error('ContractService: switchChain called but no provider available');
      throw new Error('No provider available for chain switching');
    }

    const chainConfig = getChainConfigByName(newChain);
    console.log(`ContractService: Target chain config:`, chainConfig);

    try {
      // Get current network to check if switch is needed
      const currentNetwork = await this.provider.getNetwork();
      const expectedChainId = parseInt(chainConfig.chainId, 16);
      
      console.log(`ContractService: Current chainId: ${currentNetwork.chainId}, Target chainId: ${expectedChainId}`);
      
      if (currentNetwork.chainId === expectedChainId) {
        console.log(`ContractService: Already on target chain ${newChain}, updating internal state only`);
        this.chain = newChain;
        await this.initialize(this.provider.provider, { allowNetworkSwitch: false });
        return;
      }

      // Request MetaMask to switch to the target chain
      console.log(`ContractService: Requesting MetaMask to switch to ${chainConfig.name} (${chainConfig.chainId})`);
      
      const web3Provider = this.provider.provider;
      await web3Provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainConfig.chainId }],
      });
      
      console.log(`ContractService: Chain switch request sent to MetaMask`);
      
      // Wait for the switch to complete and verify
      let verificationAttempts = 0;
      const maxVerificationAttempts = 5;
      let chainSwitchSuccessful = false;
      
      while (verificationAttempts < maxVerificationAttempts && !chainSwitchSuccessful) {
        verificationAttempts++;
        console.log(`ContractService: Chain switch verification attempt ${verificationAttempts}/${maxVerificationAttempts}`);
        
        // Wait progressively longer between attempts
        const waitTime = 2000 + (verificationAttempts * 1000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        try {
          const newNetwork = await this.provider.getNetwork();
          console.log(`ContractService: Verification attempt ${verificationAttempts} - current chainId: ${newNetwork.chainId}, expected: ${expectedChainId}`);
          
          if (newNetwork.chainId === expectedChainId) {
            console.log(`ContractService: Chain switch verified successfully on attempt ${verificationAttempts}`);
            chainSwitchSuccessful = true;
            break;
          }
        } catch (verificationError) {
          console.warn(`ContractService: Network verification attempt ${verificationAttempts} failed:`, verificationError);
        }
      }
      
      if (!chainSwitchSuccessful) {
        console.error(`ContractService: Chain switch verification failed after ${maxVerificationAttempts} attempts`);
        throw new Error(`Chain switch was not completed. Please manually switch to ${chainConfig.name} in MetaMask.`);
      }
      
      // Update internal state and reinitialize with the new chain
      this.chain = newChain;
      await this.initialize(this.provider.provider, { allowNetworkSwitch: false });
      
      console.log(`ContractService: Successfully switched to ${newChain} and reinitialized`);
      
    } catch (error: any) {
      console.error(`ContractService: switchChain failed:`, error);
      
      // Handle user rejection gracefully
      if (error.code === 4001) {
        console.log(`ContractService: User rejected chain switch request`);
        throw new Error(`Chain switch cancelled by user`);
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  // Public method to get the provider for chain verification
  getProvider(): ethers.providers.Web3Provider | null {
    return this.provider;
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
      if (!this.poolStorageContract) throw new Error('Contract not initialized');
      if (!this.signer) throw new Error('Signer not available');

      // Use the connected account's peerId if not provided
      const connectedAccount = await this.getConnectedAccount();
      if (!connectedAccount) throw new Error('No connected account');
      
      const peerIdToUse = peerId || connectedAccount;
      console.log('leavePool: Using peerId:', peerIdToUse);
      
      // Convert peerId to bytes32
      const peerIdBytes32 = await peerIdToBytes32(peerIdToUse);
      console.log('leavePool: Contract address:', this.poolStorageContract.address);
      console.log('leavePool: Current chain:', this.chain);
      
      const chainConfig = getChainConfigByName(this.chain);
      if (!chainConfig) {
        throw new Error(`Invalid chain configuration for ${this.chain}`);
      }
      console.log('leavePool: Expected contract address from config:', chainConfig.contracts.poolStorage);
      console.log('leavePool: Converted peerId to bytes32:', peerIdBytes32);
      console.log('leavePool: bytes32 length:', peerIdBytes32.length);
      console.log('leavePool: bytes32 type:', typeof peerIdBytes32);
      console.log('leavePool: Full conversion details:', { 
        originalPeerId: peerIdToUse, 
        convertedBytes32: peerIdBytes32,
        poolId: poolId,
        poolIdNumber: Number(poolId)
      });
      console.log('leavePool: About to call removeMemberPeerId on contract');
      console.log('leavePool: removeMemberPeerId exists:', typeof this.poolStorageContract.removeMemberPeerId);

      try {
        // First, verify user is actually a member of this pool
        console.log('leavePool: Checking membership status...');
        try {
          const membershipResult = await this.isPeerIdMemberOfPool(poolId, peerIdToUse);
          console.log('leavePool: Membership check result:', membershipResult);
          
          if (!membershipResult.isMember) {
            console.error('leavePool: User is not a member of this pool');
            throw new Error(`You are not a member of pool ${poolId}. Cannot leave a pool you haven't joined.`);
          }
        } catch (membershipError) {
          console.error('leavePool: Failed to check membership:', membershipError);
          // Continue anyway, let the contract handle the validation
        }

        // Dry-run simulation first
        const pid = Number(poolId);
        const poolStorageAddress = chainConfig.contracts.poolStorage;
        const iface = this.poolStorageContract.interface;
        const data = iface.encodeFunctionData(
          "removeMemberPeerId(uint32,bytes32)",
          [pid, peerIdBytes32]
        );
        
        try {
          await this.readOnlyProvider!.call({
            to: poolStorageAddress,
            data,
          });
          console.log("leavePool: Dry-run simulation succeeded");
        } catch (err: any) {
          console.error("leavePool: Dry-run simulation failed:", err);
          
          // Try to decode specific error types
          if (err.data && err.data !== '0x') {
            try {
              const decoded = iface.parseError(err.data);
              console.error("leavePool: Decoded error:", decoded.name, decoded.args);
              
              // Handle specific error cases
              switch (decoded.name) {
                case 'NM':
                  throw new Error('You are not a member of this pool.');
                case 'OCA':
                  throw new Error('Only contract admin can perform this action.');
                case 'CannotRemoveSelf':
                  throw new Error('You cannot remove yourself from the pool.');
                case 'AccessControlUnauthorizedAccount':
                  throw new Error('You do not have permission to leave this pool.');
                default:
                  throw new Error(`Pool operation failed: ${decoded.name}`);
              }
            } catch (parseError) {
              console.error("leavePool: Failed to parse error:", parseError);
            }
          }
          
          // If we can't decode the error, provide a generic message
          throw new Error('Pool leave operation would fail. Please check if you are a member of this pool and try again.');
        }

        console.log("leavePool: Sending actual transaction");
        
        // Clean up any existing MetaMask listeners before transaction
        try {
          const metamaskProvider = this.provider!.provider as any;
          if (metamaskProvider && typeof metamaskProvider.removeAllListeners === 'function') {
            console.log('leavePool: Cleaning up existing MetaMask listeners');
            metamaskProvider.removeAllListeners();
          }
        } catch (cleanupError) {
          console.warn('leavePool: Failed to cleanup MetaMask listeners:', cleanupError);
        }
        
        const gasHex = ethers.utils.hexlify(150_000); 
        const txHash = await this.provider!.provider.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: await this.signer!.getAddress(),
              to: poolStorageAddress,
              data,
              gas: gasHex,
              value: '0x0',
            },
          ],
        });
        console.log('leavePool: User confirmed transaction – hash:', txHash);

        // Wait for transaction confirmation
        await this.readOnlyProvider!.waitForTransaction(txHash);
        console.log('leavePool: Transaction confirmed', { txHash });
      } catch (contractCallError: any) {
        console.error('leavePool: Contract call failed:', contractCallError);
        console.error('leavePool: Error details:', {
          message: contractCallError?.message,
          code: contractCallError?.code,
          reason: contractCallError?.reason,
          data: contractCallError?.data,
          transaction: contractCallError?.transaction
        });
        throw contractCallError;
      }
    } catch (error) {
      console.error('leavePool: Error occurred', error);
      throw this.handleError(error);
    } finally {
      // Always clean up MetaMask listeners after transaction
      try {
        const metamaskProvider = this.provider?.provider as any;
        if (metamaskProvider && typeof metamaskProvider.removeAllListeners === 'function') {
          console.log('leavePool: Final cleanup of MetaMask listeners');
          metamaskProvider.removeAllListeners();
        }
      } catch (finalCleanupError) {
        console.warn('leavePool: Failed to perform final MetaMask cleanup:', finalCleanupError);
      }
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
      console.log('🔍 getUnclaimedRewards: Starting with params:', { account, peerId, poolId, chain: this.chain });
      
      if (!this.readOnlyProvider) {
        console.error('❌ getUnclaimedRewards: Read-only provider not initialized!');
        throw new Error('Read-only provider not initialized');
      }

      const chainConfig = getChainConfigByName(this.chain);
      console.log('✅ getUnclaimedRewards: Using read-only provider approach');
      console.log('🔗 getUnclaimedRewards: Contract address:', chainConfig.contracts.rewardEngine);
      console.log('🔗 getUnclaimedRewards: RPC URL:', chainConfig.rpcUrl);

      // Create read-only contract instance for this call
      const readOnlyRewardContract = new ethers.Contract(
        chainConfig.contracts.rewardEngine,
        REWARD_ENGINE_ABI,
        this.readOnlyProvider
      );

      // Convert peerId to bytes32 format for contract call
      const peerIdBytes32 = await peerIdToBytes32(peerId);
      console.log('🔄 getUnclaimedRewards: Converted peerId to bytes32', { peerId, peerIdBytes32 });

      console.log('📞 getUnclaimedRewards: Calling contract with params:', {
        account,
        peerIdBytes32,
        poolId: poolId.toString(),
        contractAddress: chainConfig.contracts.rewardEngine
      });

      console.log('⏳ getUnclaimedRewards: Making read-only contract call...');
      console.log('🔧 getUnclaimedRewards: Final call parameters:', {
        account,
        peerIdBytes32,
        peerIdBytes32Type: typeof peerIdBytes32,
        poolId,
        poolIdType: typeof poolId
      });
      
      // Ensure poolId is a number for the contract call
      const poolIdNumber = parseInt(poolId.toString(), 10);
      
      const result = await readOnlyRewardContract.getUnclaimedRewards(account, peerIdBytes32, poolIdNumber);
      
      console.log('📥 getUnclaimedRewards: Raw contract result:', result);
      console.log('📥 getUnclaimedRewards: Result type:', typeof result);
      console.log('📥 getUnclaimedRewards: Result keys:', Object.keys(result || {}));
      console.log('📥 getUnclaimedRewards: Raw result details:', {
        unclaimedMining: result?.unclaimedMining?.toString(),
        unclaimedStorage: result?.unclaimedStorage?.toString(),
        totalUnclaimed: result?.totalUnclaimed?.toString(),
        resultLength: Array.isArray(result) ? result.length : 'not array',
        result0: Array.isArray(result) ? result[0]?.toString() : 'not array',
        result1: Array.isArray(result) ? result[1]?.toString() : 'not array',
        result2: Array.isArray(result) ? result[2]?.toString() : 'not array'
      });

      // Handle different possible response formats
      let unclaimedMining, unclaimedStorage, totalUnclaimed;
      
      if (Array.isArray(result)) {
        // If result is an array (tuple response)
        console.log('📊 getUnclaimedRewards: Processing array response');
        [unclaimedMining, unclaimedStorage, totalUnclaimed] = result;
      } else if (result && typeof result === 'object') {
        // If result is an object with named properties
        console.log('📊 getUnclaimedRewards: Processing object response');
        unclaimedMining = result.unclaimedMining;
        unclaimedStorage = result.unclaimedStorage;
        totalUnclaimed = result.totalUnclaimed;
      } else {
        console.error('❌ getUnclaimedRewards: Unexpected result format:', result);
        throw new Error('Unexpected contract response format');
      }

      console.log('📊 getUnclaimedRewards: Extracted values:', {
        unclaimedMining: unclaimedMining?.toString(),
        unclaimedStorage: unclaimedStorage?.toString(),
        totalUnclaimed: totalUnclaimed?.toString()
      });

      const formattedResult = {
        unclaimedMining: ethers.utils.formatEther(unclaimedMining || 0),
        unclaimedStorage: ethers.utils.formatEther(unclaimedStorage || 0),
        totalUnclaimed: ethers.utils.formatEther(totalUnclaimed || 0),
      };
      
      console.log('✨ getUnclaimedRewards: Formatted result:', formattedResult);
      return formattedResult;
    } catch (error) {
      console.error('❌ getUnclaimedRewards: Error occurred:', error);
      throw this.handleError(error);
    }
  }

  // Get claimed rewards info for a peerId and poolId
  async getClaimedRewardsInfo(account: string, peerId: string, poolId: string): Promise<{
    lastClaimedTimestamp: number;
    timeSinceLastClaim: number;
  }> {
    try {
      console.log('🔍 getClaimedRewardsInfo: Starting with params:', { account, peerId, poolId, chain: this.chain });
      
      if (!this.readOnlyProvider) {
        console.error('❌ getClaimedRewardsInfo: Read-only provider not initialized!');
        throw new Error('Read-only provider not initialized');
      }

      const chainConfig = getChainConfigByName(this.chain);
      console.log('✅ getClaimedRewardsInfo: Using read-only provider approach');
      console.log('🔗 getClaimedRewardsInfo: Contract address:', chainConfig.contracts.rewardEngine);
      console.log('🔗 getClaimedRewardsInfo: RPC URL:', chainConfig.rpcUrl);

      // Create read-only contract instance for this call
      const readOnlyRewardContract = new ethers.Contract(
        chainConfig.contracts.rewardEngine,
        REWARD_ENGINE_ABI,
        this.readOnlyProvider
      );

      // Convert peerId to bytes32 format for contract call
      const peerIdBytes32 = await peerIdToBytes32(peerId);
      console.log('🔄 getClaimedRewardsInfo: Converted peerId to bytes32', { peerId, peerIdBytes32 });

      console.log('📞 getClaimedRewardsInfo: Calling contract with params:', {
        account,
        peerIdBytes32,
        poolId: poolId.toString(),
        contractAddress: chainConfig.contracts.rewardEngine
      });

      console.log('⏳ getClaimedRewardsInfo: Making read-only contract call...');
      console.log('🔧 getClaimedRewardsInfo: Final call parameters:', {
        account,
        peerIdBytes32,
        peerIdBytes32Type: typeof peerIdBytes32,
        poolId,
        poolIdType: typeof poolId
      });
      
      // Ensure poolId is a number for the contract call
      const poolIdNumber = parseInt(poolId.toString(), 10);
      
      const result = await readOnlyRewardContract.getClaimedRewardsInfo(account, peerIdBytes32, poolIdNumber);
      
      console.log('📥 getClaimedRewardsInfo: Raw contract result:', result);
      console.log('📥 getClaimedRewardsInfo: Raw result details:', {
        lastClaimedTimestamp: result.lastClaimedTimestamp?.toString(),
        timeSinceLastClaim: result.timeSinceLastClaim?.toString()
      });

      const formattedResult = {
        lastClaimedTimestamp: result.lastClaimedTimestamp.toNumber(),
        timeSinceLastClaim: result.timeSinceLastClaim.toNumber(),
      };
      
      console.log('✨ getClaimedRewardsInfo: Formatted result:', formattedResult);
      return formattedResult;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Claim rewards for a peerId and poolId using RewardEngine
  async claimRewardsForPeer(peerId: string, poolId: string): Promise<void> {
    try {
      console.log('🚀 claimRewardsForPeer: Starting claim process', { peerId, poolId });
      
      if (!this.rewardEngineContract) {
        console.error('❌ claimRewardsForPeer: Contract not initialized');
        throw new Error('Contract not initialized');
      }
      
      console.log('✅ claimRewardsForPeer: Contract is initialized');
      console.log('🔍 claimRewardsForPeer: Contract details:', {
        address: this.rewardEngineContract.address,
        signer: !!this.rewardEngineContract.signer,
        provider: !!this.rewardEngineContract.provider
      });

      // Convert peerId to bytes32 format for contract call
      const peerIdBytes32 = await peerIdToBytes32(peerId);
      console.log('🔄 claimRewardsForPeer: Converted peerId to bytes32', { peerId, peerIdBytes32 });
      
      console.log('📋 claimRewardsForPeer: Transaction parameters:', {
        peerIdBytes32,
        poolId,
        gasLimit: METHOD_GAS_LIMITS.claimRewards
      });
      
      console.log('🔗 claimRewardsForPeer: About to call contract.claimRewards...');
      
      if (!this.signer) {
        console.error('❌ claimRewardsForPeer: Signer not available');
        throw new Error('Signer not available');
      }
      
      const chainConfig = getChainConfigByName(this.chain);
      if (!chainConfig) {
        throw new Error(`Invalid chain configuration for ${this.chain}`);
      }
      
      // Clean up any existing MetaMask listeners before transaction
      try {
        const metamaskProvider = this.provider!.provider as any;
        if (metamaskProvider && typeof metamaskProvider.removeAllListeners === 'function') {
          console.log('🧹 claimRewardsForPeer: Cleaning up existing MetaMask listeners');
          metamaskProvider.removeAllListeners();
        }
      } catch (cleanupError) {
        console.warn('⚠️ claimRewardsForPeer: Failed to cleanup MetaMask listeners:', cleanupError);
      }
      
      // Use direct provider request like leavePool does
      const gasHex = ethers.utils.hexlify(METHOD_GAS_LIMITS.claimRewards);
      const rewardEngineAddress = chainConfig.contracts.rewardEngine;
      const iface = this.rewardEngineContract.interface;
      
      console.log('🔧 claimRewardsForPeer: Encoding function data for claimRewardsV2...');
      const data = iface.encodeFunctionData(
        "claimRewardsV2(bytes32,uint32)",
        [peerIdBytes32, Number(poolId)]
      );
      
      console.log('📡 claimRewardsForPeer: Sending transaction via provider request...');
      const rawProvider = this.provider!.provider;
      if (!rawProvider || !rawProvider.request) {
        throw new Error('Raw provider or request method not available');
      }
      
      // Add timeout to handle user interaction in MetaMask
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Transaction request timeout after 60 seconds - user may have cancelled or MetaMask is not responding')), 60000);
      });
      
      const transactionPromise = rawProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: await this.signer.getAddress(),
          to: rewardEngineAddress,
          gas: gasHex,
          data: data,
        }],
      });
      
      console.log('⏰ claimRewardsForPeer: Waiting for user to approve transaction in MetaMask...');
      const txHash = await Promise.race([transactionPromise, timeoutPromise]);
      
      console.log('✅ claimRewardsForPeer: Transaction sent successfully!', { txHash });
      
      // Wait for transaction confirmation
      console.log('⏳ claimRewardsForPeer: Waiting for transaction confirmation...');
      const tx = await this.provider!.getTransaction(txHash);
      if (!tx) {
        throw new Error('Transaction not found');
      }
      
      const receipt = await tx.wait();
      
      console.log('✅ claimRewardsForPeer: Transaction sent successfully!', {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        gasLimit: tx.gasLimit?.toString(),
        gasPrice: tx.gasPrice?.toString()
      });
      
      console.log('🎉 claimRewardsForPeer: Transaction confirmed!', {
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        status: receipt.status
      });
    } catch (error) {
      console.error('💥 claimRewardsForPeer: Error occurred:', error);
      console.error('💥 claimRewardsForPeer: Error details:', {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        reason: (error as any)?.reason,
        stack: error instanceof Error ? error.stack : undefined
      });
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
  // DEPRECATED: Use claimRewardsForPeer(peerId, poolId) instead - V2 contract requires peerId
  async claimRewards(poolId: string): Promise<void> {
    console.warn('claimRewards(poolId) is DEPRECATED. Use claimRewardsForPeer(peerId, poolId) instead.');
    throw new Error('claimRewards(poolId) is deprecated in V2 contract. Use claimRewardsForPeer(peerId, poolId) instead.');
  }

  // DEPRECATED: getRewards does not exist in V2 contract
  // Use getUnclaimedRewards(account, peerId, poolId) or getClaimedRewardsInfo(account, peerId, poolId) instead
  async getRewards(account: string, poolId: string): Promise<RewardInfo> {
    console.warn('getRewards is DEPRECATED and not available in V2 contract. Use getUnclaimedRewards or getClaimedRewardsInfo instead.');
    // Return empty/default values for backward compatibility
    return {
      account: account,
      poolId: poolId,
      amount: '0',
      lastClaimEpoch: 0,
    };
  }

  // Get total rewards claimed by an account using V2 getRewardStatistics
  async getTotalRewards(account: string): Promise<string> {
    try {
      if (!this.readOnlyProvider) throw new Error('Read-only provider not initialized');
      
      const chainConfig = getChainConfigByName(this.chain);
      const readOnlyRewardContract = new ethers.Contract(
        chainConfig.contracts.rewardEngine,
        REWARD_ENGINE_ABI,
        this.readOnlyProvider
      );
      
      // V2 uses getRewardStatistics which returns (totalClaimed, totalDistributed, claimPercentage)
      const result = await readOnlyRewardContract.getRewardStatistics(account);
      return ethers.utils.formatEther(result.totalClaimed || result[0] || 0);
    } catch (error) {
      console.error('getTotalRewards error:', error);
      throw this.handleError(error);
    }
  }

  // DEPRECATED: Use getUnclaimedRewards(account, peerId, poolId) instead - V2 requires peerId
  async getClaimableRewards(account: string, poolId: string): Promise<string> {
    console.warn('getClaimableRewards(account, poolId) is DEPRECATED. Use getUnclaimedRewards(account, peerId, poolId) instead.');
    // Return '0' for backward compatibility - callers should migrate to getUnclaimedRewards
    return '0';
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
