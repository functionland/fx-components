import React from 'react';
import { FxBox, FxText, FxButton } from '@functionland/component-library';
import { useWalletNetwork } from '../hooks/useWalletNetwork';

interface NetworkInstructionsProps {
  onDismiss?: () => void;
  showOnCorrectNetwork?: boolean;
}

export const NetworkInstructions: React.FC<NetworkInstructionsProps> = ({ 
  onDismiss,
  showOnCorrectNetwork = false 
}) => {
  const {
    isOnCorrectNetwork,
    isSwitchingNetwork,
    targetNetworkName,
    selectedChain,
  } = useWalletNetwork();

  // Don't show if on correct network unless explicitly requested
  if (isOnCorrectNetwork && !showOnCorrectNetwork) {
    return null;
  }

  const getInstructions = () => {
    if (selectedChain === 'skale') {
      return [
        "Your wallet will open to add SKALE Europa Hub network",
        "Tap 'Add network' when prompted",
        "SKALE will be automatically selected after adding",
        "Return to the app to continue your transaction"
      ];
    } else {
      return [
        "Your wallet will open to switch networks",
        "Select the correct network when prompted",
        "Return to the app to continue your transaction"
      ];
    }
  };

  const instructions = getInstructions();

  return (
    <FxBox
      backgroundColor="backgroundSecondary"
      borderColor="border"
      borderWidth={1}
      borderRadius="m"
      padding="16"
      marginBottom="16"
    >
      <FxText variant="bodyMediumRegular" color="content1" marginBottom="12">
        Wallet Setup Required
      </FxText>
      
      <FxText variant="bodySmallRegular" color="content2" marginBottom="16">
        To use {targetNetworkName} features, we need to set up your wallet:
      </FxText>

      {instructions.map((instruction, index) => (
        <FxBox key={index} flexDirection="row" marginBottom="8">
          <FxText variant="bodySmallRegular" color="content1" marginRight="8">
            {index + 1}.
          </FxText>
          <FxText variant="bodySmallRegular" color="content2">
            {instruction}
          </FxText>
        </FxBox>
      ))}

      {selectedChain === 'skale' && (
        <FxBox
          backgroundColor="backgroundPrimary"
          borderRadius="m"
          padding="12"
          marginTop="12"
          marginBottom="12"
        >
          <FxText variant="bodyXSRegular" color="content2">
            💡 Note: If you see "Return to app" before adding the network, please complete the network setup first, then return to the app.
          </FxText>
        </FxBox>
      )}

      {onDismiss && (
        <FxButton
          size="large"
          variant="inverted"
          onPress={onDismiss}
          marginTop="16"
        >
          Got it
        </FxButton>
      )}
    </FxBox>
  );
};
