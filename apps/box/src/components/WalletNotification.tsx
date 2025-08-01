import React, { useState } from 'react';
import { FxBox, FxText, FxButton, FxSpacer } from '@functionland/component-library';
import { useWalletConnection } from '../hooks/useWalletConnection';
import { useWalletNetwork } from '../hooks/useWalletNetwork';
import { useContractIntegration } from '../hooks/useContractIntegration';
import { useSDK } from '@metamask/sdk-react';

export type WalletNotificationType = 'connect' | 'network' | 'hidden';

interface WalletNotificationProps {
  onDismiss?: () => void;
  compact?: boolean;
  showOnCorrectState?: boolean; // Show even when wallet is properly connected/on correct network
}

export const WalletNotification: React.FC<WalletNotificationProps> = ({
  onDismiss,
  compact = false,
  showOnCorrectState = false,
}) => {
  const { connected, connectWallet, connecting } = useWalletConnection();
  const { 
    isOnCorrectNetwork, 
    isSwitchingNetwork, 
    ensureCorrectNetworkConnection, 
    targetNetworkName,
    selectedChain 
  } = useWalletNetwork();
  const { initializeContracts } = useContractIntegration();
  const { account } = useSDK();
  const [isLoading, setIsLoading] = useState(false);

  // Determine what type of notification to show
  const getNotificationType = (): WalletNotificationType => {
    if (!connected || !account) {
      return 'connect';
    }
    if (!isOnCorrectNetwork) {
      return 'network';
    }
    return 'hidden';
  };

  const notificationType = getNotificationType();

  // Don't show if everything is correct and showOnCorrectState is false
  if (notificationType === 'hidden' && !showOnCorrectState) {
    return null;
  }

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleNetworkSwitch = async () => {
    try {
      // Use the existing network switching functionality
      await ensureCorrectNetworkConnection();
    } catch (error) {
      console.error('Network switch failed:', error);
    }
  };

  const getNotificationContent = () => {
    switch (notificationType) {
      case 'connect':
        return {
          icon: '🔗',
          title: 'Connect Your Wallet',
          message: 'You need to connect your MetaMask wallet to continue with transactions and view your data.',
          buttonText: 'Connect MetaMask',
          buttonAction: handleConnectWallet,
          isLoading: connecting,
          loadingText: 'Connecting...',
          colorScheme: 'blue' as const,
        };
      
      case 'network':
        const isSkale = selectedChain === 'skale';
        return {
          icon: '🔄',
          title: `Switch to ${targetNetworkName}`,
          message: isSkale 
            ? `Your app is configured for ${targetNetworkName}, but MetaMask is on a different network. We'll help you add ${targetNetworkName} to MetaMask and switch to it.`
            : `Your app is configured for ${targetNetworkName}, but MetaMask is on a different network. Please switch to ${targetNetworkName} to continue.`,
          buttonText: isSkale ? `Add & Switch to ${targetNetworkName}` : `Switch to ${targetNetworkName}`,
          buttonAction: handleNetworkSwitch,
          isLoading: isSwitchingNetwork || isLoading,
          loadingText: isSkale ? 'Adding Network...' : 'Switching...',
          colorScheme: 'orange' as const,
        };
      
      default:
        return null;
    }
  };

  const content = getNotificationContent();
  if (!content) return null;

  if (compact) {
    return (
      <FxBox
        backgroundColor="backgroundSecondary"
        borderColor="border"
        borderWidth={1}
        borderRadius="m"
        padding="12"
        marginBottom="8"
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <FxBox flex={1} marginRight="8">
          <FxText variant="bodySmallRegular" color="content1">
            {content.icon} {content.title}
          </FxText>
        </FxBox>
        <FxButton
          size="large"
          variant="inverted"
          onPress={content.buttonAction}
          disabled={content.isLoading}
        >
          {content.isLoading ? content.loadingText : content.buttonText}
        </FxButton>
      </FxBox>
    );
  }

  return (
    <FxBox
      backgroundColor="backgroundSecondary"
      borderColor="border"
      borderWidth={1}
      borderRadius="l"
      padding="16"
      marginBottom="16"
    >
      <FxBox flexDirection="row" alignItems="flex-start" marginBottom="12">
        <FxText marginRight="12">
          {content.icon}
        </FxText>
        <FxBox flex={1}>
          <FxText variant="bodyMediumRegular" color="content1">
            {content.title}
          </FxText>
        </FxBox>
        {onDismiss && (
          <FxButton
            size="large"
            variant="inverted"
            onPress={onDismiss}
          >
            ✕
          </FxButton>
        )}
      </FxBox>
      
      <FxText variant="bodySmallRegular" color="content2" marginBottom="16">
        {content.message}
      </FxText>

      <FxBox flexDirection="row" justifyContent="flex-start">
        <FxButton
          variant="pressed"
          onPress={content.buttonAction}
          disabled={content.isLoading}
        >
          {content.isLoading ? content.loadingText : content.buttonText}
        </FxButton>
      </FxBox>
    </FxBox>
  );
};
