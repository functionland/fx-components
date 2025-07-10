import React, { useState } from 'react';
import { useSDK } from '@metamask/sdk-react';
import { Alert } from 'react-native';
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
import { CHAIN_DISPLAY_NAMES } from '../../contracts/config';
import { SupportedChain } from '../../contracts/types';

export const ChainSelectionScreen = () => {
  const { queueToast } = useToast();
  const [authCode, setAuthCode] = useState('');
  const [showAuthInput, setShowAuthInput] = useState(false);

  // MetaMask SDK
  const { sdk, connected, account, connecting, error } = useSDK();

  const handleConnect = async () => {
    try {
      await sdk?.connect();
      queueToast({
        type: 'success',
        title: 'Wallet Connected',
        message: 'MetaMask wallet connected successfully',
      });
    } catch (e: any) {
      queueToast({
        type: 'error',
        title: 'Connection Failed',
        message: typeof e === 'object' && 'message' in e ? e.message : 'Failed to connect wallet',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await sdk?.disconnect();
      queueToast({
        type: 'info',
        title: 'Wallet Disconnected',
        message: 'MetaMask wallet disconnected',
      });
    } catch (e: any) {
      queueToast({
        type: 'error',
        title: 'Disconnect Failed',
        message: typeof e === 'object' && 'message' in e ? e.message : 'Failed to disconnect wallet',
      });
    }
  };


  
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

  const handleChainSelection = (chain: SupportedChain) => {
    if (chain === 'base' && !baseAuthorized) {
      setShowAuthInput(true);
      return;
    }
    
    setSelectedChain(chain);
    queueToast({
      type: 'success',
      title: 'Chain Updated',
      message: `Switched to ${CHAIN_DISPLAY_NAMES[chain]}`,
    });
  };

  const handleBaseAuthorization = () => {
    if (authorizeBase(authCode)) {
      setSelectedChain('base');
      setShowAuthInput(false);
      setAuthCode('');
      queueToast({
        type: 'success',
        title: 'Base Network Authorized',
        message: 'You can now use Base network for pool operations',
      });
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
                onPress={handleDisconnect}
                disabled={connecting}
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
              onPress={handleConnect}
              disabled={!!connecting}
            >
              Connect Wallet
            </FxButton>
          )}
        </FxBox>
        
        <FxBox marginTop="24">
          <FxText variant="bodyMediumRegular" marginBottom="16">
            Select the blockchain network for pool operations:
          </FxText>
          
          {/* Chain Selection Radio Group */}
          <FxRadioButton.Group value={selectedChain} onValueChange={val => handleChainSelection(val as SupportedChain)}>
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
                size="small"
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
