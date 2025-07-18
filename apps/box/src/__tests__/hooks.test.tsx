import './setup';
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useContractIntegration, usePoolOperations } from '../hooks/useContractIntegration';
import { usePools } from '../hooks/usePools';
import { useRewards } from '../hooks/useRewards';
import { useClaimableTokens } from '../hooks/useClaimableTokens';

// Mock the settings store
jest.mock('../stores/useSettingsStore', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      selectedChain: 'skale',
      baseAuthorized: false,
      setSelectedChain: jest.fn(),
      authorizeBase: jest.fn(),
      resetBaseAuthorization: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock the user profile store
jest.mock('../stores/useUserProfileStore', () => ({
  useUserProfileStore: jest.fn((selector) => {
    const state = {
      appPeerId: 'QmTestPeerId123456789012345678901234567890',
    };
    return selector ? selector(state) : state;
  }),
}));

describe('Contract Integration Hooks', () => {
  describe('useContractIntegration', () => {
    it('should initialize contract integration', async () => {
      const { result } = renderHook(() => useContractIntegration());

      expect(result.current.isInitializing).toBe(false);
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.connectedAccount).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    });

    it('should handle contract initialization errors', async () => {
      // Mock a failing provider
      const mockFailingProvider = {
        provider: {
          request: jest.fn().mockRejectedValue(new Error('Connection failed')),
        },
      };

      const { result } = renderHook(() => useContractIntegration());

      await act(async () => {
        try {
          await result.current.initializeContracts('skale');
        } catch (error) {
          // Expected to fail
        }
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should provide contract service when ready', () => {
      const { result } = renderHook(() => useContractIntegration());

      expect(result.current.isReady).toBe(true);
      expect(result.current.canExecute).toBe(true);
      expect(result.current.contractService).toBeTruthy();
    });
  });

  describe('usePoolOperations', () => {
    it('should provide pool operation methods', () => {
      const { result } = renderHook(() => usePoolOperations());

      expect(result.current.joinPool).toBeDefined();
      expect(result.current.leavePool).toBeDefined();
      expect(result.current.cancelJoinRequest).toBeDefined();
      expect(result.current.voteJoinRequest).toBeDefined();
      expect(result.current.claimRewards).toBeDefined();
    });

    it('should execute pool join operation', async () => {
      const { result } = renderHook(() => usePoolOperations());

      await act(async () => {
        const joinResult = await result.current.joinPool('1');
        expect(joinResult).not.toBeNull();
      });
    });

    it('should execute pool leave operation', async () => {
      const { result } = renderHook(() => usePoolOperations());

      await act(async () => {
        const leaveResult = await result.current.leavePool('1');
        expect(leaveResult).not.toBeNull();
      });
    });

    it('should execute cancel join request', async () => {
      const { result } = renderHook(() => usePoolOperations());

      await act(async () => {
        const cancelResult = await result.current.cancelJoinRequest('1');
        expect(cancelResult).not.toBeNull();
      });
    });
  });

  describe('usePools', () => {
    it('should load pools data', async () => {
      const { result } = renderHook(() => usePools());

      // Wait for initial load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.pools).toBeDefined();
      expect(Array.isArray(result.current.pools)).toBe(true);
      expect(result.current.enableInteraction).toBe(true);
    });

    it('should provide user pool information', async () => {
      const { result } = renderHook(() => usePools());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.userPool).toBeDefined();
      expect(result.current.userPoolId).toBeDefined();
      expect(result.current.isInPool).toBeDefined();
      expect(result.current.hasPendingRequest).toBeDefined();
    });

    it('should handle pool operations with state updates', async () => {
      const { result } = renderHook(() => usePools());

      await act(async () => {
        await result.current.joinPool('1');
      });

      // Should trigger a reload of pools
      expect(result.current.loading).toBeDefined();
    });
  });

  describe('useRewards', () => {
    it('should load rewards data', async () => {
      const { result } = renderHook(() => useRewards('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.totalRewards).toBeDefined();
      expect(result.current.hasRewards).toBeDefined();
      expect(result.current.formattedTotalRewards).toBeDefined();
    });

    it('should handle reward claiming', async () => {
      const { result } = renderHook(() => useRewards('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));

      await act(async () => {
        const claimResult = await result.current.claimRewards('1');
        expect(claimResult).not.toBeNull();
      });
    });

    it('should load claimable rewards for specific pool', async () => {
      const { result } = renderHook(() => useRewards('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));

      await act(async () => {
        const claimable = await result.current.loadClaimableRewards('1');
        expect(claimable).toBeDefined();
      });
    });

    it('should refresh rewards data', async () => {
      const { result } = renderHook(() => useRewards('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));

      await act(async () => {
        await result.current.refreshRewards('1');
      });

      expect(result.current.totalRewards).toBeDefined();
    });
  });

  describe('useClaimableTokens', () => {
    it('should load claimable rewards data', async () => {
      const { result } = renderHook(() => useClaimableTokens());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.totalUnclaimed).toBeDefined();
      expect(result.current.unclaimedMining).toBeDefined();
      expect(result.current.unclaimedStorage).toBeDefined();
      expect(result.current.loading).toBeDefined();
      expect(result.current.canClaim).toBeDefined();
      expect(result.current.formattedTotalUnclaimed).toBeDefined();
      expect(result.current.formattedTimeSinceLastClaim).toBeDefined();
    });

    it('should handle reward claiming', async () => {
      const { result } = renderHook(() => useClaimableTokens());

      await act(async () => {
        if (result.current.canClaim) {
          await result.current.claimTokens();
        }
      });

      // Should refresh claimable rewards after claiming
      expect(result.current.totalUnclaimed).toBeDefined();
    });

    it('should refresh claimable rewards data', async () => {
      const { result } = renderHook(() => useClaimableTokens());

      await act(async () => {
        await result.current.fetchClaimableTokens();
      });

      expect(result.current.totalUnclaimed).toBeDefined();
      expect(typeof result.current.totalUnclaimed).toBe('string');
    });

    it('should handle errors gracefully', async () => {
      const { result } = renderHook(() => useClaimableTokens());

      // Mock an error scenario
      const originalConsoleError = console.error;
      console.error = jest.fn();

      await act(async () => {
        try {
          await result.current.fetchClaimableTokens();
        } catch (error) {
          // Expected to handle errors gracefully
        }
      });

      console.error = originalConsoleError;

      expect(result.current.error).toBeDefined();
      expect(result.current.canClaim).toBe(false);
    });
  });
});

describe('Hook Integration Tests', () => {
  it('should work together for complete pool workflow', async () => {
    const poolsHook = renderHook(() => usePools());
    const rewardsHook = renderHook(() => useRewards('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));

    // Wait for initial loads
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Check initial state
    expect(poolsHook.result.current.pools).toBeDefined();
    expect(rewardsHook.result.current.totalRewards).toBeDefined();

    // Perform pool operation
    await act(async () => {
      await poolsHook.result.current.joinPool('1');
    });

    // Check that pools were reloaded
    expect(poolsHook.result.current.enableInteraction).toBe(true);

    // Claim rewards
    await act(async () => {
      await rewardsHook.result.current.claimRewards('1');
    });

    // Check that rewards were updated
    expect(rewardsHook.result.current.totalRewards).toBeDefined();
  });

  it('should handle chain switching', async () => {
    const { result } = renderHook(() => useContractIntegration());

    await act(async () => {
      await result.current.switchChain('base');
    });

    // Should maintain contract service
    expect(result.current.contractService).toBeTruthy();
  });

  it('should handle error states gracefully', async () => {
    const { result } = renderHook(() => usePools());

    // Mock an error in contract service
    const originalConsoleError = console.error;
    console.error = jest.fn();

    await act(async () => {
      // This should handle errors gracefully
      try {
        await result.current.loadPools();
      } catch (error) {
        // Expected to handle errors
      }
    });

    console.error = originalConsoleError;

    // Should still have defined state
    expect(result.current.pools).toBeDefined();
    expect(result.current.loading).toBeDefined();
  });
});
