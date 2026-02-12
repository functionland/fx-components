import '@walletconnect/react-native-compat';
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  FxBox,
  FxButton,
  FxHeader,
  FxBottomSheetModalMethods,
  FxText,
  useToast,
  FxRefreshIcon,
  FxSafeAreaBox,
  FxPressableOpacity,
  useFxTheme,
} from '@functionland/component-library';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { copyToClipboard } from '../utils/clipboard';
import { Helper } from '../utils';
import { BloxIcon, CopyIcon, ExternalLinkIcon } from './Icons';
import { useBloxsStore } from '../stores';
import { useWallet } from '../hooks/useWallet';
import { chainNames } from '../utils/walletConnectConifg';
import { fula, blockchain, fxblox } from '@functionland/react-native-fula';
import { useContractIntegration } from '../hooks/useContractIntegration';
import { CHAIN_DISPLAY_NAMES } from '../contracts/config';
import { useFulaBalance } from '../hooks/useFulaBalance';
import { Linking, ActivityIndicator } from 'react-native';
import {
  AccountOptionsSheet,
  AccountOptionsType,
} from '../components/AccountOptionsSheet';

interface WalletDetailsProps {
  allowChangeWallet?: boolean;
  showPeerId?: boolean;
  showDID?: boolean;
  showBloxPeerIds?: boolean;
  showNetwork?: boolean;
}

export const WalletDetails = ({
  allowChangeWallet,
  showNetwork = true,
  showPeerId,
  showDID = true,
  showBloxPeerIds = false,
}: WalletDetailsProps) => {
  const bloxs = useBloxsStore((state) => state.bloxs);
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);
  const bloxsArray = Object.values(bloxs || {});
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [userHasExplicitlyConnected, setUserHasExplicitlyConnected] = useState(false);

  const signiture = useUserProfileStore((state) => state.signiture);
  const password = useUserProfileStore((state) => state.password);
  const address = useUserProfileStore((state) => state.address);
  const fulaIsReady = useUserProfileStore((state) => state.fulaIsReady);
  const appPeerId = useUserProfileStore((state) => state.appPeerId);

  const getContractRewards = useUserProfileStore((state) => state.getContractRewards);
  const selectedChain = useSettingsStore((state) => state.selectedChain);
  const { account, chainId, provider, connected, open } = useWallet();
  const { isInitialized: contractInitialized } = useContractIntegration();
  const { queueToast } = useToast();
  const { colors } = useFxTheme();

  const checkFulaReadiness = useUserProfileStore(
    (state) => state.checkFulaReadiness
  );

  useEffect(() => {
    checkFulaReadiness();
  }, []); // Remove dependency to prevent infinite loop

  // Check if wallet is already connected on mount
  useEffect(() => {
    if (account && provider && !userHasExplicitlyConnected) {
      setUserHasExplicitlyConnected(true);
    }
  }, [account, provider, userHasExplicitlyConnected]);

  useEffect(() => {
    console.log('inside account useEffect1');
    const updateData = async () => {
      if (address) {
        setWalletAddress(address);
      } else {
        setWalletAddress('');
      }
    };

    updateData();
  }, [address]);


  const calledRef = useRef(false); // Track if retry has already happened
  const connectWallet = useCallback(async () => {
    try {
      await open({ view: 'Connect' });
      setUserHasExplicitlyConnected(true);
      queueToast({
        type: 'success',
        title: 'Wallet Connected',
        message: 'Wallet connected successfully',
      });
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      queueToast({
        type: 'error',
        title: 'Connection Failed',
        message: error.message || 'Failed to connect wallet. Please try again.',
      });
    }
  }, [open, queueToast]);

  const onRefreshPress = useCallback(async () => {
    calledRef.current = false; // Reset the retry flag
    setLoading(true);

    try {
      // Try to connect wallet if not connected or if connection was lost
      if (!connected || !account || !address) {
        await connectWallet();
      } else {
        // If already connected, just refresh the data
        queueToast({
          type: 'info',
          title: 'Refreshed',
          message: 'Account details refreshed',
        });
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setLoading(false);
    }
  }, [connected, account, address, connectWallet, queueToast]);

  const DID = useMemo(() => {
    if (password && signiture) return Helper.getMyDID(password, signiture);
    return null;
  }, [password, signiture]);

  return (
    <FxSafeAreaBox>
      <FxBox paddingVertical="12" alignItems="center">
        <FxBox
          width="100%"
          flexDirection="row"
          alignItems="center"
          paddingVertical="12"
        >
          <FxText variant="h300" textAlign="center">
            Account Details
          </FxText>
          {loading ? (
            <ActivityIndicator />
          ) : (
            onRefreshPress && (
              <FxPressableOpacity
                onPress={onRefreshPress}
                disabled={loading}
                style={{
                  position: 'absolute',
                  right: 0,
                  padding: 8, // Larger touch target for iOS
                  borderRadius: 8,
                  backgroundColor: loading ? 'rgba(0,0,0,0.1)' : 'transparent',
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // iOS touch target expansion
              >
                <FxRefreshIcon
                  fill={colors.content3}
                />
              </FxPressableOpacity>
            )
          )}
        </FxBox>
        <FxBox width="100%">
          {walletAddress && (
            <FxBox marginTop="24" width="100%">
              <FxButton
                onPress={() => copyToClipboard(walletAddress)}
                iconLeft={<CopyIcon />}
                flexWrap="wrap"
                paddingHorizontal="32"
                size="large"
              >
                {walletAddress}
              </FxButton>
            </FxBox>
          )}
          {showNetwork && (
            <FxBox marginTop="24">
              <FxText variant="h300" textAlign="center">
                Network
              </FxText>
              <FxText textAlign="center" marginTop="8">
                {chainId ? chainNames[chainId] : 'Unknown'}
              </FxText>
            </FxBox>
          )}
          {/* Contract Status */}
          <FxBox marginTop="24">
            <FxText variant="h300" textAlign="center">
              Pool Contracts
            </FxText>
            <FxBox flexDirection="row" alignItems="center" justifyContent="center" marginTop="8">
              <FxBox
                width="8"
                height="8"
                borderRadius="s"
                backgroundColor={contractInitialized ? 'greenBase' : 'errorBase'}
                marginRight="8"
              />
              <FxText textAlign="center" color={contractInitialized ? 'greenBase' : 'errorBase'}>
                {contractInitialized
                  ? `Connected to ${CHAIN_DISPLAY_NAMES[selectedChain]}`
                  : 'Not Connected'
                }
              </FxText>
            </FxBox>
            {contractInitialized && account && (
              <FxBox marginTop="8">
                <FxText variant="bodySmallRegular" textAlign="center" color="content2">
                  Wallet: {account.slice(0, 6)}...{account.slice(-4)}
                </FxText>
              </FxBox>
            )}
          </FxBox>
        </FxBox>
        {password && signiture && showDID && (
          <FxBox marginTop="24" width="100%">
            <FxButton
              onPress={() => copyToClipboard(DID)}
              iconLeft={<CopyIcon />}
              flexWrap="wrap"
              paddingHorizontal="32"
              size="large"
            >
              {DID}
            </FxButton>
          </FxBox>
        )}

        {appPeerId && showPeerId && (
          <FxBox marginTop="24" width="100%">
            <FxButton
              onPress={() => copyToClipboard(appPeerId)}
              iconLeft={<CopyIcon />}
              flexWrap="wrap"
              paddingHorizontal="32"
              size="large"
            >
              {`App PeerId:${appPeerId}`}
            </FxButton>
          </FxBox>
        )}
        {bloxsArray.length > 0 && showBloxPeerIds && (
          <>
            <FxHeader
              alignSelf="flex-start"
              marginTop="20"
              title="Bloxs' PeerId"
            />
            <FxBox marginTop="24" width="100%">
              {bloxsArray?.map((blox, index) => (
                <FxButton
                  key={index}
                  onPress={() => copyToClipboard(blox.peerId)}
                  iconLeft={<CopyIcon />}
                  flexWrap="wrap"
                  paddingHorizontal="32"
                >
                  <FxBox flex={1} width={250}>
                    <FxText
                      ellipsizeMode="tail"
                      numberOfLines={1}
                      style={{ width: 250 }}
                    >{`${blox.name}:${blox.peerId}`}</FxText>
                  </FxBox>
                </FxButton>
              ))}
            </FxBox>
          </>
        )}
      </FxBox>
    </FxSafeAreaBox>
  );
};
