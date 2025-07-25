import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useWalletConnection } from '../../hooks/useWalletConnection';
import { useContractIntegration } from '../../hooks/useContractIntegration';
import { useSDK } from '@metamask/sdk-react';
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

  // Wallet connection
  const { connected, account, connecting, connectWallet, disconnectWallet } = useWalletConnection();

  // Contract integration for chain switching (no notification)
  const { switchChain } = useContractIntegration({ showConnectedNotification: false });

  // MetaMask SDK for direct provider access
  const { provider } = useSDK();


  
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

    // If wallet is connected, we need to handle chain switching properly
    if (connected && provider) {
      setSwitching(true);
      try {
        // First update the settings store
        setSelectedChain(chain);

        // Then trigger chain switch in MetaMask and contracts
        await switchChain(chain);

        queueToast({
          type: 'success',
          title: 'Chain Updated',
          message: `Successfully switched to ${CHAIN_DISPLAY_NAMES[chain]}`,
        });
      } catch (error: any) {
        console.error('Chain switch error:', error);

        // If chain switch failed, revert the settings
        // Don't revert here, let user try again or reconnect manually

        queueToast({
          type: 'error',
          title: 'Chain Switch Failed',
          message: error.message || 'Failed to switch chains. You may need to reconnect your wallet.',
        });
      } finally {
        setSwitching(false);
      }
    } else {
      // If wallet not connected, just update the setting
      setSelectedChain(chain);
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
          ) : (
            <FxButton
              onPress={connectWallet}
              disabled={!!connecting || switching}
            >
              {switching ? 'Switching Chain...' : 'Connect Wallet'}
            </FxButton>
          )}
        </FxBox>
        
        <FxBox marginTop="24">
          <FxText variant="bodyMediumRegular" marginBottom="16">
            Select the blockchain network for pool operations:
          </FxText>
          
          {/* Chain Selection Radio Group */}
          <FxRadioButton.Group
            value={selectedChain}
            onValueChange={(val) => handleChainSelection(val as SupportedChain)}
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
    </FxSafeAreaBox>
  );
};
