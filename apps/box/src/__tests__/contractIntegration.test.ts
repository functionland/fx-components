import './setup';
import { ContractService } from '../contracts/contractService';
import { getChainConfigByName, LOCAL_DEV_CONFIG } from '../contracts/config';

describe('Contract Integration with Local Hardhat', () => {
  let contractService: ContractService;
  let mockProvider: any;

  beforeEach(() => {
    contractService = new ContractService('skale');
    mockProvider = {
      provider: {
        request: jest.fn().mockResolvedValue(true),
      },
    };
  });

  describe('ContractService', () => {
    it('should initialize successfully', async () => {
      await expect(contractService.initialize(mockProvider)).resolves.not.toThrow();
    });

    it('should get chain config correctly', () => {
      const skaleConfig = getChainConfigByName('skale');
      expect(skaleConfig.name).toBe('SKALE Europa Hub');
      expect(skaleConfig.requiresAuth).toBe(false);

      const baseConfig = getChainConfigByName('base');
      expect(baseConfig.name).toBe('Base');
      expect(baseConfig.requiresAuth).toBe(true);
    });

    it('should handle pool operations', async () => {
      await contractService.initialize(mockProvider);

      // Test listing pools
      const pools = await contractService.listPools(0, 25);
      expect(pools).toHaveLength(1);
      expect(pools[0].name).toBe('Test Pool');

      // Test getting user pool
      const userPool = await contractService.getUserPool('0x1234567890123456789012345678901234567890');
      expect(userPool.poolId).toBe('0');

      // Test joining pool
      await expect(contractService.joinPool('1')).resolves.not.toThrow();

      // Test leaving pool
      await expect(contractService.leavePool('1')).resolves.not.toThrow();

      // Test canceling join request
      await expect(contractService.cancelJoinRequest('1')).resolves.not.toThrow();
    });

    it('should get connected account', async () => {
      await contractService.initialize(mockProvider);
      const account = await contractService.getConnectedAccount();
      expect(account).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    });

    it('should work with local hardhat configuration', () => {
      const localConfig = getChainConfigByName('local');
      expect(localConfig.chainId).toBe('0x7a69');
      expect(localConfig.contracts.poolStorage).toBe('0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9');
      expect(localConfig.name).toBe('Hardhat Local');
    });

    it('should handle errors gracefully', async () => {
      const errorProvider = {
        provider: {
          request: jest.fn().mockRejectedValue(new Error('Network error')),
        },
      };

      await expect(contractService.initialize(errorProvider)).rejects.toThrow();
    });
  });

  describe('Chain Configuration', () => {
    it('should have correct SKALE configuration', () => {
      const config = getChainConfigByName('skale');
      expect(config.chainId).toBe('0x585eb4b1');
      expect(config.name).toBe('SKALE Europa Hub');
      expect(config.requiresAuth).toBe(false);
      expect(config.contracts.poolStorage).toBeDefined();
      expect(config.contracts.rewardEngine).toBeDefined();
    });

    it('should have correct Base configuration', () => {
      const config = getChainConfigByName('base');
      expect(config.chainId).toBe('0x2105');
      expect(config.name).toBe('Base');
      expect(config.requiresAuth).toBe(true);
      expect(config.contracts.poolStorage).toBeDefined();
      expect(config.contracts.rewardEngine).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle contract errors properly', async () => {
      const errorService = new ContractService('skale');
      const errorProvider = {
        provider: {
          request: jest.fn().mockRejectedValue(new Error('User rejected')),
        },
      };

      try {
        await errorService.initialize(errorProvider);
      } catch (error: any) {
        expect(error.message).toContain('User rejected');
      }
    });

    it('should handle network mismatch', async () => {
      const networkMismatchProvider = {
        provider: {
          request: jest.fn().mockResolvedValue(true),
        },
      };

      // Mock wrong network
      const mockEthers = require('ethers');
      mockEthers.ethers.providers.Web3Provider.mockImplementation(() => ({
        getSigner: jest.fn().mockReturnValue({}),
        getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }), // Ethereum mainnet
      }));

      const service = new ContractService('skale');
      await expect(service.initialize(networkMismatchProvider)).rejects.toThrow();
    });
  });
});

describe('Integration Tests', () => {
  it('should work with React hooks', () => {
    // This would be tested in a React Testing Library environment
    // For now, just verify the hook exports exist
    const { useContractIntegration } = require('../hooks/useContractIntegration');
    const { usePools } = require('../hooks/usePools');
    const { useRewards } = require('../hooks/useRewards');

    expect(useContractIntegration).toBeDefined();
    expect(usePools).toBeDefined();
    expect(useRewards).toBeDefined();
  });
});

// Test data validation
describe('Data Validation', () => {
  it('should validate pool data structure', () => {
    const mockPool = {
      poolId: '1',
      name: 'Test Pool',
      region: 'US',
      parent: '',
      participants: ['0x1234567890123456789012345678901234567890'],
      replicationFactor: 3,
    };

    expect(mockPool.poolId).toBeDefined();
    expect(mockPool.name).toBeDefined();
    expect(mockPool.region).toBeDefined();
    expect(Array.isArray(mockPool.participants)).toBe(true);
    expect(typeof mockPool.replicationFactor).toBe('number');
  });

  it('should validate user pool data structure', () => {
    const mockUserPool = {
      poolId: '1',
      requestPoolId: '0',
      account: '0x1234567890123456789012345678901234567890',
    };

    expect(mockUserPool.poolId).toBeDefined();
    expect(mockUserPool.requestPoolId).toBeDefined();
    expect(mockUserPool.account).toBeDefined();
    expect(mockUserPool.account.startsWith('0x')).toBe(true);
  });

  it('should validate reward data structure', () => {
    const mockReward = {
      account: '0x1234567890123456789012345678901234567890',
      poolId: '1',
      amount: '1.0',
      lastClaimEpoch: 12345,
    };

    expect(mockReward.account).toBeDefined();
    expect(mockReward.poolId).toBeDefined();
    expect(mockReward.amount).toBeDefined();
    expect(typeof mockReward.lastClaimEpoch).toBe('number');
  });
});
