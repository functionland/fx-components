import React from 'react';
import { FxBox, FxText, FxButton } from '@functionland/component-library';
import { useWalletNetwork } from '../hooks/useWalletNetwork';

interface NetworkStatusProps {
  showSwitchButton?: boolean;
  compact?: boolean;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({ 
  showSwitchButton = true, 
  compact = false 
}) => {
  const {
    isOnCorrectNetwork,
    isSwitchingNetwork,
    ensureCorrectNetworkConnection,
    targetNetworkName,
    selectedChain,
  } = useWalletNetwork();

  const handleNetworkSwitch = async () => {
    await ensureCorrectNetworkConnection();
  };

  // Don't show anything if we're on the correct network
  if (isOnCorrectNetwork) {
    return null;
  }

  if (compact) {
    return (
      <FxBox
        backgroundColor="warning.50"
        borderColor="warning.200"
        borderWidth={1}
        borderRadius="md"
        padding={2}
        marginBottom={2}
      >
        <FxText fontSize="sm" color="warning.800">
          Switch to {targetNetworkName} in your wallet
        </FxText>
      </FxBox>
    );
  }

  return (
    <FxBox
      backgroundColor="warning.50"
      borderColor="warning.200"
      borderWidth={1}
      borderRadius="md"
      padding={4}
      marginBottom={4}
    >
      <FxText fontSize="md" fontWeight="semibold" color="warning.800" marginBottom={2}>
        Network Mismatch
      </FxText>
      <FxText fontSize="sm" color="warning.700" marginBottom={3}>
        Your app is set to {targetNetworkName}, but your wallet is on a different network.
        Please switch to {targetNetworkName} to continue.
      </FxText>
      
      {showSwitchButton && (
        <FxButton
          size="sm"
          variant="outline"
          colorScheme="warning"
          onPress={handleNetworkSwitch}
          isLoading={isSwitchingNetwork}
          loadingText="Switching..."
        >
          Switch to {targetNetworkName}
        </FxButton>
      )}
    </FxBox>
  );
};
