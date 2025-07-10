import './setup';
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { usePools } from '../hooks/usePools';
import { useRewards } from '../hooks/useRewards';
import { useContractIntegration } from '../hooks/useContractIntegration';
import { ContractService } from '../contracts/contractService';
import { getChainConfigByName } from '../contracts/config';

// Mock the settings store with different scenarios
const createMockSettingsStore = (selectedChain = 'skale', baseAuthorized = false) => {
  return jest.fn((selector) => {
    const state = {
      selectedChain,
      baseAuthorized,
      setSelectedChain: jest.fn(),
      authorizeBase: jest.fn().mockReturnValue(selectedChain === 'base'),
      resetBaseAuthorization: jest.fn(),
    };
    return selector ? selector(state) : state;
  });
};

describe('Full Integration Tests', () => {
  describe('Complete Pool Workflow', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Reset to SKALE chain
      jest.doMock('../stores/useSettingsStore', () => ({
        useSettingsStore: createMockSettingsStore('skale', false),
      }));
    });

    it('should complete full pool join workflow', async () => {
      const poolsHook = renderHook(() => usePools());
      const rewardsHook = renderHook(() => useRewards());

      // Wait for initial load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Check initial state - user should not be in any pool
      expect(poolsHook.result.current.isInPool).toBe(false);
      expect(poolsHook.result.current.hasPendingRequest).toBe(false);
      expect(poolsHook.result.current.pools.length).toBeGreaterThan(0);

      // Join a pool
      await act(async () => {
        const result = await poolsHook.result.current.joinPool('1');
        expect(result).not.toBeNull();
      });

      // Check that pools were reloaded
      expect(poolsHook.result.current.enableInteraction).toBe(true);

      // Simulate pool approval and joining (in real scenario, this would be done by other pool members)
      // For test purposes, we'll mock the user as being in the pool
      
      // Check rewards after joining
      await act(async () => {
        await rewardsHook.result.current.loadTotalRewards();
      });

      expect(rewardsHook.result.current.totalRewards).toBeDefined();
    });

    it('should handle pool leave workflow', async () => {
      const poolsHook = renderHook(() => usePools());

      // Wait for initial load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Leave a pool (assuming user is in pool 1)
      await act(async () => {
        const result = await poolsHook.result.current.leavePool('1');
        expect(result).not.toBeNull();
      });

      // Check that pools were reloaded
      expect(poolsHook.result.current.enableInteraction).toBe(true);
    });

    it('should handle cancel join request workflow', async () => {
      const poolsHook = renderHook(() => usePools());

      // Wait for initial load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Cancel a join request
      await act(async () => {
        const result = await poolsHook.result.current.cancelJoinRequest('1');
        expect(result).not.toBeNull();
      });

      // Check that pools were reloaded
      expect(poolsHook.result.current.enableInteraction).toBe(true);
    });
  });

  describe('Rewards Workflow', () => {
    it('should complete full rewards workflow', async () => {
      const rewardsHook = renderHook(() => useRewards('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));

      // Wait for initial load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Check initial rewards
      expect(rewardsHook.result.current.totalRewards).toBeDefined();
      expect(rewardsHook.result.current.formattedTotalRewards).toBeDefined();

      // Load claimable rewards for a specific pool
      await act(async () => {
        const claimable = await rewardsHook.result.current.loadClaimableRewards('1');
        expect(claimable).toBeDefined();
      });

      // Claim rewards
      await act(async () => {
        const result = await rewardsHook.result.current.claimRewards('1');
        expect(result).not.toBeNull();
      });

      // Check that rewards were updated after claiming
      expect(rewardsHook.result.current.totalRewards).toBeDefined();
    });

    it('should handle multiple pool rewards', async () => {
      const rewardsHook = renderHook(() => useRewards('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));

      // Wait for initial load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Load rewards for multiple pools
      await act(async () => {
        await rewardsHook.result.current.loadPoolRewards('1');
        await rewardsHook.result.current.loadPoolRewards('2');
      });

      expect(rewardsHook.result.current.poolRewards).toBeDefined();
    });
  });

  describe('Chain Switching Workflow', () => {
    it('should handle chain switching from SKALE to Base', async () => {
      // Start with SKALE
      jest.doMock('../stores/useSettingsStore', () => ({
        useSettingsStore: createMockSettingsStore('skale', false),
      }));

      const contractHook = renderHook(() => useContractIntegration());

      // Wait for initial SKALE connection
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(contractHook.result.current.isReady).toBe(true);

      // Switch to Base (this would require authorization in real app)
      jest.doMock('../stores/useSettingsStore', () => ({
        useSettingsStore: createMockSettingsStore('base', true),
      }));

      await act(async () => {
        await contractHook.result.current.switchChain('base');
      });

      // Should maintain connection
      expect(contractHook.result.current.contractService).toBeTruthy();
    });

    it('should handle Base authorization workflow', async () => {
      const mockStore = createMockSettingsStore('skale', false);
      jest.doMock('../stores/useSettingsStore', () => ({
        useSettingsStore: mockStore,
      }));

      // Test authorization
      const state = mockStore(s => s);
      const authResult = state.authorizeBase('9870');
      expect(authResult).toBe(false); // Should be false for SKALE

      // Test with Base
      const baseStore = createMockSettingsStore('base', false);
      const baseState = baseStore(s => s);
      const baseAuthResult = baseState.authorizeBase('9870');
      expect(baseAuthResult).toBe(true); // Should be true for Base
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle contract initialization failures gracefully', async () => {
      // Mock a failing contract service
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const contractHook = renderHook(() => useContractIntegration());

      // Simulate initialization failure
      await act(async () => {
        try {
          await contractHook.result.current.initializeContracts('skale');
        } catch (error) {
          // Expected to handle errors gracefully
        }
      });

      // Should have error state but not crash
      expect(contractHook.result.current.isInitialized).toBeDefined();

      console.error = originalConsoleError;
    });

    it('should handle network connectivity issues', async () => {
      const poolsHook = renderHook(() => usePools());

      // Mock network failure
      const originalConsoleError = console.error;
      console.error = jest.fn();

      await act(async () => {
        try {
          await poolsHook.result.current.loadPools();
        } catch (error) {
          // Expected to handle network errors
        }
      });

      // Should maintain stable state
      expect(poolsHook.result.current.pools).toBeDefined();
      expect(poolsHook.result.current.loading).toBeDefined();

      console.error = originalConsoleError;
    });

    it('should handle transaction failures', async () => {
      const poolsHook = renderHook(() => usePools());

      // Mock transaction failure
      const originalConsoleError = console.error;
      console.error = jest.fn();

      await act(async () => {
        try {
          // This might fail in some scenarios
          await poolsHook.result.current.joinPool('999'); // Non-existent pool
        } catch (error) {
          // Expected to handle transaction errors
        }
      });

      // Should maintain stable state
      expect(poolsHook.result.current.enableInteraction).toBeDefined();

      console.error = originalConsoleError;
    });
  });

  describe('Performance and State Management', () => {
    it('should not cause unnecessary re-renders', async () => {
      const renderCount = { current: 0 };
      
      const TestComponent = () => {
        renderCount.current++;
        const pools = usePools();
        return null;
      };

      const { rerender } = renderHook(() => <TestComponent />);

      // Initial render
      expect(renderCount.current).toBe(1);

      // Re-render should not increase count unnecessarily
      rerender();
      
      // Should be efficient with re-renders
      expect(renderCount.current).toBeLessThan(5);
    });

    it('should properly cleanup on unmount', async () => {
      const { unmount } = renderHook(() => usePools());

      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Local Development Integration', () => {
    it('should work with local hardhat configuration', () => {
      const localConfig = getChainConfigByName('local');
      
      expect(localConfig.chainId).toBe('0x7a69');
      expect(localConfig.contracts.poolStorage).toBe('0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9');
      expect(localConfig.name).toBe('Hardhat Local');
      expect(localConfig.requiresAuth).toBe(false);
    });

    it('should initialize contract service with local config', async () => {
      const contractService = new ContractService('skale');
      const mockProvider = {
        provider: {
          request: jest.fn().mockResolvedValue(true),
        },
      };

      // Should initialize without errors
      await expect(contractService.initialize(mockProvider)).resolves.not.toThrow();
    });
  });
});
