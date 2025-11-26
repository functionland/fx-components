import React, { useState, useEffect } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useWalletConnection } from '../../hooks/useWalletConnection';
import { useContractIntegration } from '../../hooks/useContractIntegration';
import { useSDK } from '@metamask/sdk-react';
import { useWalletNetwork } from '../../hooks/useWalletNetwork';
import { WalletNotification } from '../../components/WalletNotification';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import {
  FxBox,
  FxButton,
  FxHeader,
  FxSafeAreaBox,
  FxText,
  FxTextInput,
  useToast,
  FxRadioButton,
  FxSpacer,
} from '@functionland/component-library';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { CHAIN_DISPLAY_NAMES, getChainConfigByName } from '../../contracts/config';
import { SupportedChain } from '../../contracts/types';

export const ChainSelectionScreen = () => {
  const { queueToast } = useToast();
  const [authCode, setAuthCode] = useState('');
  const [showAuthInput, setShowAuthInput] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [isEditingWalletAddress, setIsEditingWalletAddress] = useState(false);
  const [walletAddressInput, setWalletAddressInput] = useState('');

  // Wallet connection
  const { connected, account, connecting, connectWallet, disconnectWallet } = useWalletConnection();

  // Contract integration for chain switching (no notification)
  const { switchChain } = useContractIntegration({ showConnectedNotification: false });

  // MetaMask SDK for direct provider access
  const { provider } = useSDK();

  // Network switching functionality
  const { ensureCorrectNetworkConnection } = useWalletNetwork();

  // User profile for manual wallet address
  const [manualSignatureWalletAddress, setManualSignatureWalletAddress] = useUserProfileStore(
    (state) => [state.manualSignatureWalletAddress, state.setManualSignatureWalletAddress]
  );

  // Initialize wallet address input from store
  useEffect(() => {
    if (manualSignatureWalletAddress) {
      setWalletAddressInput(manualSignatureWalletAddress);
    }
  }, [manualSignatureWalletAddress]);

  const [
    selectedChain,
    baseAuthorized,
    setSelectedChain,
    authorizeBase,
    resetBaseAuthorization,
  ] = useSettingsStore((state) => [
    state.selectedChain,
    state.baseAuthorized,
    state.setSelectedChain,
    state.authorizeBase,
    state.resetBaseAuthorization,
  ]);

  const handleChainSelection = async (chain: SupportedChain) => {
    if (chain === 'base' && !baseAuthorized) {
      setShowAuthInput(true);
      return;
    }

    // Always just update the setting - no automatic MetaMask opening
    setSelectedChain(chain);
    
    if (connected && provider) {
      queueToast({
        type: 'success',
        title: 'Chain Updated',
        message: `Switched to ${CHAIN_DISPLAY_NAMES[chain]}. Use the notification below to connect your wallet to this network.`,
      });
    } else {
      queueToast({
        type: 'success',
        title: 'Chain Updated',
        message: `Switched to ${CHAIN_DISPLAY_NAMES[chain]}. Connect your wallet to use this network.`,
      });
    }
  };

  const handleBaseAuthorization = async () => {
    if (authorizeBase(authCode)) {
      setShowAuthInput(false);
      setAuthCode('');

      // Now handle the chain selection with proper switching
      await handleChainSelection('base');
    } else {
      queueToast({
        type: 'error',
        title: 'Invalid Authorization Code',
        message: 'Please enter the correct authorization code',
      });
    }
  };

  const handleResetBaseAuth = () => {
    Alert.alert(
      'Reset Base Authorization',
      'Are you sure you want to reset Base network authorization? You will need to re-enter the authorization code to use Base network again.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetBaseAuthorization();
            queueToast({
              type: 'info',
              title: 'Authorization Reset',
              message: 'Base network authorization has been reset',
            });
          },
        },
      ]
    );
  };

  return (
    <FxSafeAreaBox flex={1} edges={['top']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={true}>
        <FxBox paddingHorizontal="20" paddingVertical="12">
          <FxHeader title="Chain Selection" />

        {/* Wallet Connect/Disconnect Button */}
        <FxBox marginTop="16" marginBottom="8" flexDirection="row" alignItems="center">
          {connected && account ? (
            <>
              <FxButton
                variant="inverted"
                onPress={disconnectWallet}
                disabled={connecting || switching}
                marginRight="8"
              >
                Disconnect Wallet
              </FxButton>
              <FxText variant="bodyXSRegular" color="content2" numberOfLines={1} ellipsizeMode="middle">
                {account}
              </FxText>
            </>
          ) : manualSignatureWalletAddress ? (
            <FxText variant="bodyXSRegular" color="content2">
              Manual wallet stored
            </FxText>
          ) : (
            <FxButton
              onPress={connectWallet}
              disabled={!!connecting || switching}
            >
              {switching ? 'Switching Chain...' : 'Connect Wallet'}
            </FxButton>
          )}
        </FxBox>

        {/* Wallet Account Display/Edit Section */}
        <FxBox
          marginTop="16"
          padding="16"
          backgroundColor="backgroundSecondary"
          borderRadius="m"
          marginBottom="16"
        >
          <FxBox flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="12">
            <FxText variant="bodyMediumRegular">
              Wallet Account
            </FxText>
            {!account && (
              <FxButton
                variant="inverted"
                onPress={() => setIsEditingWalletAddress(!isEditingWalletAddress)}
              >
                {isEditingWalletAddress ? 'Cancel' : 'Edit'}
              </FxButton>
            )}
          </FxBox>

          {/* Display Mode - MetaMask Connected (Read-only) */}
          {account && (
            <FxBox>
              <FxText variant="bodyXSRegular" color="content2" marginBottom="4">
                Connected via MetaMask
              </FxText>
              <FxText variant="bodySmallRegular" numberOfLines={1} ellipsizeMode="middle">
                {account}
              </FxText>
            </FxBox>
          )}

          {/* Display Mode - Manual Signature Stored (Read-only) */}
          {!account && manualSignatureWalletAddress && !isEditingWalletAddress && (
            <FxBox>
              <FxText variant="bodyXSRegular" color="content2" marginBottom="4">
                Manual Signature Wallet
              </FxText>
              <FxText variant="bodySmallRegular" numberOfLines={1} ellipsizeMode="middle">
                {manualSignatureWalletAddress}
              </FxText>
            </FxBox>
          )}

          {/* Display Mode - No Account */}
          {!account && !manualSignatureWalletAddress && !isEditingWalletAddress && (
            <FxBox>
              <FxText variant="bodyXSRegular" color="content2">
                No wallet connected. Connect MetaMask or enter a wallet address manually.
              </FxText>
            </FxBox>
          )}

          {/* Edit Mode - Manual Wallet Address Input */}
          {!account && isEditingWalletAddress && (
            <FxBox>
              <FxTextInput
                placeholder="0x..."
                caption="Wallet Address"
                value={walletAddressInput}
                onChangeText={setWalletAddressInput}
                marginBottom="12"
              />
              <FxBox flexDirection="row" justifyContent="space-between">
                <FxButton
                  variant="inverted"
                  onPress={() => {
                    setIsEditingWalletAddress(false);
                    setWalletAddressInput(manualSignatureWalletAddress || '');
                  }}
                  flex={1}
                  marginRight="8"
                >
                  Cancel
                </FxButton>
                <FxButton
                  onPress={() => {
                    if (walletAddressInput && walletAddressInput.startsWith('0x')) {
                      setManualSignatureWalletAddress(walletAddressInput);
                      setIsEditingWalletAddress(false);
                      queueToast({
                        type: 'success',
                        title: 'Wallet Address Saved',
                        message: 'Your wallet address has been saved',
                      });
                    } else {
                      queueToast({
                        type: 'error',
                        title: 'Invalid Address',
                        message: 'Please enter a valid Ethereum address starting with 0x',
                      });
                    }
                  }}
                  flex={1}
                  marginLeft="8"
                  disabled={!walletAddressInput || !walletAddressInput.startsWith('0x')}
                >
                  Save
                </FxButton>
              </FxBox>
            </FxBox>
          )}
        </FxBox>
        
        {/* Wallet Notification for user-initiated network switching */}
        <WalletNotification compact={true} />
        
        <FxBox marginTop="24">
          <FxText variant="bodyMediumRegular" marginBottom="16">
            Select the blockchain network for pool operations:
          </FxText>
          
          {/* Chain Selection Radio Group */}
          <FxRadioButton.Group
            value={selectedChain}
            onValueChange={(val: any) => handleChainSelection(val as SupportedChain)}
          >
            {/* SKALE Option */}
            <FxBox
              flexDirection="row"
              alignItems="center"
              paddingVertical="12"
              paddingHorizontal="16"
              backgroundColor={selectedChain === 'skale' ? 'backgroundSecondary' : 'transparent'}
              borderRadius="m"
              marginBottom="8"
            >
              <FxRadioButton value="skale" />
              <FxBox marginLeft="12" flex={1}>
                <FxText variant="bodyMediumRegular">
                  {CHAIN_DISPLAY_NAMES.skale}
                </FxText>
                <FxText variant="bodyXSRegular" color="content2" marginTop="4">
                  Default network • Zero gas fees • No authorization required
                </FxText>
              </FxBox>
            </FxBox>

            {/* Base Option */}
            <FxBox
              flexDirection="row"
              alignItems="center"
              paddingVertical="12"
              paddingHorizontal="16"
              backgroundColor={selectedChain === 'base' ? 'backgroundSecondary' : 'transparent'}
              borderRadius="m"
              marginBottom="8"
            >
              <FxRadioButton value="base" />
              <FxBox marginLeft="12" flex={1}>
                <FxText variant="bodyMediumRegular">
                  {CHAIN_DISPLAY_NAMES.base}
                </FxText>
                <FxText variant="bodyXSRegular" color="content2" marginTop="4">
                  Requires authorization code • Gas fees apply
                  {baseAuthorized && ' • Authorized ✓'}
                </FxText>
              </FxBox>
            </FxBox>
          </FxRadioButton.Group>

          {/* Authorization Input */}
          {showAuthInput && (
            <FxBox
              marginTop="16"
              padding="16"
              backgroundColor="backgroundSecondary"
              borderRadius="m"
            >
              <FxText variant="bodyMediumRegular" marginBottom="12">
                Enter Base Network Authorization Code:
              </FxText>
              <FxTextInput
                placeholder="Authorization code"
                value={authCode}
                onChangeText={setAuthCode}
                secureTextEntry
                marginBottom="12"
              />
              <FxBox flexDirection="row" justifyContent="space-between">
                <FxButton
                  variant="inverted"
                  onPress={() => {
                    setShowAuthInput(false);
                    setAuthCode('');
                  }}
                  flex={1}
                  marginRight="8"
                >
                  Cancel
                </FxButton>
                <FxButton
                  onPress={handleBaseAuthorization}
                  flex={1}
                  marginLeft="8"
                  disabled={!authCode.trim()}
                >
                  Authorize
                </FxButton>
              </FxBox>
            </FxBox>
          )}

          {/* Reset Base Authorization */}
          {baseAuthorized && (
            <FxBox marginTop="24">
              <FxButton
                variant="inverted"
                onPress={handleResetBaseAuth}
              >
                Reset Base Authorization
              </FxButton>
            </FxBox>
          )}

          {/* Current Selection Info */}
          <FxBox
            marginTop="24"
            padding="16"
            backgroundColor="backgroundSecondary"
            borderRadius="m"
          >
            <FxText variant="bodyMediumRegular" marginBottom="8">
              Current Selection:
            </FxText>
            <FxText variant="bodyLargeRegular" color="primary">
              {CHAIN_DISPLAY_NAMES[selectedChain]}
            </FxText>
            <FxText variant="bodyXSRegular" color="content2" marginTop="4">
              All pool operations will use this network
            </FxText>
          </FxBox>
        </FxBox>
        </FxBox>
      </ScrollView>
    </FxSafeAreaBox>
  );
};
