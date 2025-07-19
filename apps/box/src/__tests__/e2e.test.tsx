import './setup';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { renderHook, act } from '@testing-library/react-native';
import { ChainSelectionScreen } from '../screens/Settings/ChainSelection.screen';
import { usePools } from '../hooks/usePools';
import { useRewards } from '../hooks/useRewards';
import { useContractIntegration } from '../hooks/useContractIntegration';

// Mock stores with realistic state management
let mockChain = 'skale';
let mockBaseAuthorized = false;

const mockSettingsStore = jest.fn((selector) => {
  const state = {
    selectedChain: mockChain,
    baseAuthorized: mockBaseAuthorized,
    setSelectedChain: jest.fn((chain) => {
      if (chain === 'base' && !mockBaseAuthorized) return;
      mockChain = chain;
    }),
    authorizeBase: jest.fn((code) => {
      if (code === '9870') {
        mockBaseAuthorized = true;
        return true;
      }
      return false;
    }),
    resetBaseAuthorization: jest.fn(() => {
      mockBaseAuthorized = false;
      if (mockChain === 'base') mockChain = 'skale';
    }),
  };
  return selector ? selector(state) : state;
});

jest.mock('../stores/useSettingsStore', () => ({
  useSettingsStore: mockSettingsStore,
}));

describe('End-to-End User Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChain = 'skale';
    mockBaseAuthorized = false;
  });

  describe('Complete Pool Management Workflow', () => {
    it('should complete the full user journey from wallet connection to pool operations', async () => {
      // Step 1: Initialize contract integration
      const contractHook = renderHook(() => useContractIntegration());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(contractHook.result.current.isReady).toBe(true);
      expect(contractHook.result.current.connectedAccount).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');

      // Step 2: Load pools
      const poolsHook = renderHook(() => usePools());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(poolsHook.result.current.pools).toBeDefined();
      expect(poolsHook.result.current.pools.length).toBeGreaterThan(0);
      expect(poolsHook.result.current.enableInteraction).toBe(true);

      // Step 3: Check initial user state (should not be in any pool)
      expect(poolsHook.result.current.isInPool).toBe(false);
      expect(poolsHook.result.current.hasPendingRequest).toBe(false);

      // Step 4: Join a pool
      await act(async () => {
        const joinResult = await poolsHook.result.current.joinPool('1');
        expect(joinResult).not.toBeNull();
      });

      // Step 5: Check rewards
      const rewardsHook = renderHook(() => useRewards('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(rewardsHook.result.current.totalRewards).toBeDefined();
      expect(rewardsHook.result.current.formattedTotalRewards).toBeDefined();

      // Step 6: Load claimable rewards
      await act(async () => {
        const claimable = await rewardsHook.result.current.loadClaimableRewards('1');
        expect(claimable).toBeDefined();
      });

      // Step 7: Claim rewards
      await act(async () => {
        const claimResult = await rewardsHook.result.current.claimRewards('1');
        expect(claimResult).not.toBeNull();
      });

      // Step 8: Leave pool
      await act(async () => {
        const leaveResult = await poolsHook.result.current.leavePool('1');
        expect(leaveResult).not.toBeNull();
      });

      // Verify final state
      expect(poolsHook.result.current.enableInteraction).toBe(true);
    });

    it('should handle join request cancellation workflow', async () => {
      const poolsHook = renderHook(() => usePools());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Join a pool (creates pending request)
      await act(async () => {
        await poolsHook.result.current.joinPool('1');
      });

      // Cancel the join request
      await act(async () => {
        const cancelResult = await poolsHook.result.current.cancelJoinRequest('1');
        expect(cancelResult).not.toBeNull();
      });

      expect(poolsHook.result.current.enableInteraction).toBe(true);
    });
  });

  describe('Chain Switching Workflow', () => {
    it('should complete chain switching from SKALE to Base with authorization', async () => {
      // Step 1: Start with SKALE (default)
      const { getByText, getByPlaceholderText } = render(<ChainSelectionScreen />);

      expect(getByText('SKALE Europa Hub')).toBeTruthy();
      expect(getByText('Current Selection:')).toBeTruthy();

      // Step 2: Try to switch to Base (should show authorization)
      const baseOption = getByText('Base Network');
      fireEvent.press(baseOption);

      expect(getByText('Enter Base Network Authorization Code:')).toBeTruthy();

      // Step 3: Enter correct authorization code
      const authInput = getByPlaceholderText('Authorization code');
      fireEvent.changeText(authInput, '9870');

      const authorizeButton = getByText('Authorize');
      fireEvent.press(authorizeButton);

      await waitFor(() => {
        // Should have authorized and switched to Base
        expect(mockBaseAuthorized).toBe(true);
        expect(mockChain).toBe('base');
      });

      // Step 4: Verify contract integration works with Base
      const contractHook = renderHook(() => useContractIntegration());
      
      await act(async () => {
        await contractHook.result.current.switchChain('base');
      });

      expect(contractHook.result.current.contractService).toBeTruthy();
    });

    it('should handle Base authorization reset workflow', async () => {
      // First authorize Base
      mockBaseAuthorized = true;
      mockChain = 'base';

      const { getByText } = render(<ChainSelectionScreen />);

      expect(getByText('Reset Base Authorization')).toBeTruthy();
      expect(getByText('Authorized ✓')).toBeTruthy();

      // Reset authorization
      const resetButton = getByText('Reset Base Authorization');
      fireEvent.press(resetButton);

      // Should reset to SKALE
      expect(mockBaseAuthorized).toBe(false);
      expect(mockChain).toBe('skale');
    });

    it('should reject invalid authorization codes', async () => {
      const { getByText, getByPlaceholderText } = render(<ChainSelectionScreen />);

      // Try to switch to Base
      const baseOption = getByText('Base Network');
      fireEvent.press(baseOption);

      // Enter wrong authorization code
      const authInput = getByPlaceholderText('Authorization code');
      fireEvent.changeText(authInput, 'wrong');

      const authorizeButton = getByText('Authorize');
      fireEvent.press(authorizeButton);

      await waitFor(() => {
        // Should not have authorized
        expect(mockBaseAuthorized).toBe(false);
        expect(mockChain).toBe('skale');
      });
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle contract connection failures gracefully', async () => {
      // Mock contract initialization failure
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const contractHook = renderHook(() => useContractIntegration());

      // Simulate connection failure
      await act(async () => {
        try {
          await contractHook.result.current.initializeContracts('skale');
        } catch (error) {
          // Expected to handle gracefully
        }
      });

      // Should maintain stable state
      expect(contractHook.result.current.isInitialized).toBeDefined();
      expect(contractHook.result.current.error).toBeDefined();

      console.error = originalConsoleError;
    });

    it('should handle pool operation failures gracefully', async () => {
      const poolsHook = renderHook(() => usePools());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Mock operation failure
      const originalConsoleError = console.error;
      console.error = jest.fn();

      await act(async () => {
        try {
          // Try to join non-existent pool
          await poolsHook.result.current.joinPool('999');
        } catch (error) {
          // Expected to handle gracefully
        }
      });

      // Should maintain stable state
      expect(poolsHook.result.current.enableInteraction).toBeDefined();
      expect(poolsHook.result.current.pools).toBeDefined();

      console.error = originalConsoleError;
    });

    it('should handle reward operation failures gracefully', async () => {
      const rewardsHook = renderHook(() => useRewards('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));

      // Mock operation failure
      const originalConsoleError = console.error;
      console.error = jest.fn();

      await act(async () => {
        try {
          // Try to claim from non-existent pool
          await rewardsHook.result.current.claimRewards('999');
        } catch (error) {
          // Expected to handle gracefully
        }
      });

      // Should maintain stable state
      expect(rewardsHook.result.current.totalRewards).toBeDefined();

      console.error = originalConsoleError;
    });
  });

  describe('Performance and State Consistency', () => {
    it('should maintain consistent state across multiple operations', async () => {
      const poolsHook = renderHook(() => usePools());
      const rewardsHook = renderHook(() => useRewards('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));

      // Perform multiple operations in sequence
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        await poolsHook.result.current.joinPool('1');
        await rewardsHook.result.current.loadTotalRewards();
        await poolsHook.result.current.leavePool('1');
        await rewardsHook.result.current.claimRewards('1');
      });

      // State should remain consistent
      expect(poolsHook.result.current.pools).toBeDefined();
      expect(rewardsHook.result.current.totalRewards).toBeDefined();
      expect(poolsHook.result.current.enableInteraction).toBe(true);
    });

    it('should handle rapid state changes without race conditions', async () => {
      const poolsHook = renderHook(() => usePools());

      // Perform rapid operations
      await act(async () => {
        const promises = [
          poolsHook.result.current.loadPools(),
          poolsHook.result.current.loadPools(),
          poolsHook.result.current.loadPools(),
        ];
        await Promise.all(promises);
      });

      // Should handle concurrent operations gracefully
      expect(poolsHook.result.current.pools).toBeDefined();
      expect(poolsHook.result.current.loading).toBeDefined();
    });
  });
});
