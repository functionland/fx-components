import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { ContractService } from './contractService';
import { SupportedChain } from './types';
import { useSDK } from '@metamask/sdk-react';
import { useToast } from '@functionland/component-library';

interface ContractServiceContextType {
  contractService: ContractService | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  connectedAccount: string | null;
  currentChain: SupportedChain | null;
  initializeService: (chain: SupportedChain) => Promise<void>;
  switchChain: (chain: SupportedChain) => Promise<void>;
  resetService: () => void;
}

const ContractServiceContext = createContext<ContractServiceContextType | null>(null);

interface ContractServiceProviderProps {
  children: React.ReactNode;
}

export const ContractServiceProvider: React.FC<ContractServiceProviderProps> = ({ children }) => {
  const { provider, account } = useSDK();
  const { queueToast } = useToast();
  
  const [contractService, setContractService] = useState<ContractService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
  const [currentChain, setCurrentChain] = useState<SupportedChain | null>(null);

  const resetService = useCallback(() => {
    setContractService(null);
    setIsInitialized(false);
    setIsInitializing(false);
    setError(null);
    setConnectedAccount(null);
    setCurrentChain(null);
  }, []);

  const initializeService = useCallback(async (chain: SupportedChain) => {
    if (!provider || !account) {
      throw new Error('Provider and account are required');
    }

    setIsInitializing(true);
    setError(null);

    try {
      // Create new service instance instead of using singleton
      const service = new ContractService(chain);
      await service.initialize(provider);
      
      const connectedAcc = await service.getConnectedAccount();
      
      setContractService(service);
      setConnectedAccount(connectedAcc);
      setCurrentChain(chain);
      setIsInitialized(true);
      
      // Note: Notification is handled by the main useContractIntegration hook in Blox screen
    } catch (error: any) {
      console.error('Contract service initialization failed:', error);
      setError(error.message || 'Failed to initialize contract service');
      
      queueToast({
        type: 'error',
        title: 'Contract Connection Failed',
        message: error.message || 'Failed to connect to contracts',
      });
      
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, [provider, account, queueToast]);

  const switchChain = useCallback(async (newChain: SupportedChain) => {
    if (!contractService) {
      throw new Error('Contract service not initialized');
    }

    try {
      await contractService.switchChain(newChain);
      setCurrentChain(newChain);
      
      queueToast({
        type: 'success',
        title: 'Chain Switched',
        message: `Switched to ${newChain}`,
      });
    } catch (error: any) {
      console.error('Chain switch failed:', error);
      
      queueToast({
        type: 'error',
        title: 'Chain Switch Failed',
        message: error.message || 'Failed to switch chains',
      });
      
      throw error;
    }
  }, [contractService, queueToast]);

  // Reset service when provider or account changes
  useEffect(() => {
    if (!provider || !account) {
      resetService();
    }
  }, [provider, account, resetService]);

  const contextValue: ContractServiceContextType = {
    contractService,
    isInitialized,
    isInitializing,
    error,
    connectedAccount,
    currentChain,
    initializeService,
    switchChain,
    resetService,
  };

  return (
    <ContractServiceContext.Provider value={contextValue}>
      {children}
    </ContractServiceContext.Provider>
  );
};

export const useContractService = (): ContractServiceContextType => {
  const context = useContext(ContractServiceContext);
  if (!context) {
    throw new Error('useContractService must be used within a ContractServiceProvider');
  }
  return context;
};

// Hook for easier contract operations
export const useContractOperations = () => {
  const { contractService, isInitialized, connectedAccount } = useContractService();
  const { queueToast } = useToast();

  const executeOperation = useCallback(async (
    operation: () => Promise<any>,
    operationName: string
  ): Promise<any | null> => {
    if (!isInitialized || !contractService) {
      queueToast({
        type: 'error',
        title: 'Contract Not Ready',
        message: 'Please connect your wallet and initialize contracts first',
      });
      return null;
    }

    try {
      const result = await operation();
      queueToast({
        type: 'success',
        title: 'Transaction Successful',
        message: `${operationName} completed successfully`,
      });
      return result;
    } catch (error: any) {
      console.error(`${operationName} failed:`, error);
      
      let errorMessage = error.message || `${operationName} failed`;
      
      if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for transaction';
      } else if (error.code === 'USER_REJECTED') {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.reason) {
        errorMessage = error.reason;
      }

      queueToast({
        type: 'error',
        title: 'Transaction Failed',
        message: errorMessage,
      });
      
      return null;
    }
  }, [isInitialized, contractService, queueToast]);

  return {
    contractService,
    isInitialized,
    connectedAccount,
    executeOperation,
    isReady: isInitialized && !!contractService,
    canExecute: isInitialized && !!contractService && !!connectedAccount,
  };
};
