import React, { useState, useEffect } from 'react';
import { FxBox, FxText, FxButton, FxSpacer } from '@functionland/component-library';
import { useWalletConnection } from '../hooks/useWalletConnection';
import { useWalletNetwork } from '../hooks/useWalletNetwork';
import { useContractIntegration } from '../hooks/useContractIntegration';
import { useSDK } from '@metamask/sdk-react';
import { useUserProfileStore } from '../stores/useUserProfileStore';

export type WalletNotificationType = 'connect' | 'network' | 'hidden';

interface WalletNotificationProps {
  onDismiss?: () => void;
  compact?: boolean;
  showOnCorrectState?: boolean; // Show even when wallet is properly connected/on correct network
  hideOnLoading?: boolean; // Hide during external loading states (e.g., pools loading)
}

export const WalletNotification: React.FC<WalletNotificationProps> = ({
  onDismiss,
  compact = false,
  showOnCorrectState = false,
  hideOnLoading = true,
}) => {
  const { connected, connectWallet, connecting } = useWalletConnection();
  const { 
    isOnCorrectNetwork, 
    isSwitchingNetwork, 
    ensureCorrectNetworkConnection, 
    targetNetworkName,
    selectedChain 
  } = useWalletNetwork();
  const { initializeContracts, isInitializing } = useContractIntegration();
  const { account } = useSDK();
  const manualSignatureWalletAddress = useUserProfileStore((state) => state.manualSignatureWalletAddress);
  const [isLoading, setIsLoading] = useState(false);
  const [showAfterDelay, setShowAfterDelay] = useState(false);
  const [postLoadingDelay, setPostLoadingDelay] = useState(false);

  // Determine if we have any account (MetaMask or manual signature)
  const hasAnyAccount = connected && account || manualSignatureWalletAddress;

  // Add delay before showing connect wallet notification to prevent flicker
  useEffect(() => {
    if (!hasAnyAccount) {
      // Start timer to show connect notification after delay
      const timer = setTimeout(() => {
        setShowAfterDelay(true);
      }, 1500); // 1.5 second delay
      
      return () => clearTimeout(timer);
    } else {
      // Wallet is connected, show immediately
      setShowAfterDelay(true);
    }
  }, [hasAnyAccount]);

  // Don't show notification during contract initialization to prevent flicker
  const isContractInitializing = isInitializing || false;

  // Add stabilization period to prevent flicker during rapid state changes
  useEffect(() => {
    if (hideOnLoading) {
      // Set delay whenever there are any loading/initialization states
      if (isContractInitializing || isSwitchingNetwork || connecting) {
        setPostLoadingDelay(true);
      } else {
        // Add stabilization delay after loading states clear
        const timer = setTimeout(() => {
          setPostLoadingDelay(false);
        }, 1500); // 1.5 second stabilization period
        
        return () => clearTimeout(timer);
      }
    } else {
      setPostLoadingDelay(false);
    }
  }, [hideOnLoading, isContractInitializing, isSwitchingNetwork, connecting]);

  // Determine what type of notification to show
  const getNotificationType = (): WalletNotificationType => {
    // If MetaMask is connected, check network
    if (connected && account) {
      if (!isOnCorrectNetwork) {
        return 'network';
      }
      return 'hidden';
    }
    
    // If MetaMask is not connected but we have a stored wallet address, don't show connect notification
    // (user is using manual signature, so MetaMask connection is optional)
    if (manualSignatureWalletAddress) {
      return 'hidden';
    }
    
    // No account at all, show connect notification after delay
    return showAfterDelay ? 'connect' : 'hidden';
  };

  const notificationType = getNotificationType();

  // Don't show if everything is correct and showOnCorrectState is false
  if (notificationType === 'hidden' && !showOnCorrectState) {
    return null;
  }

  // Don't show during contract initialization or post-loading delay to prevent flicker
  if ((isContractInitializing || postLoadingDelay) && hideOnLoading) {
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
      setIsLoading(true);
      const result = await ensureCorrectNetworkConnection();
      // If the switch came back as pending (MetaMask didn't switch),
      // the AppState foreground listener in useWalletNetwork will
      // re-check and update isOnCorrectNetwork automatically.
      if (!result.success) {
        console.log('Network switch result:', result);
      }
    } catch (error) {
      console.error('Network switch failed:', error);
    } finally {
      setIsLoading(false);
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
