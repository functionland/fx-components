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
  useFxTheme,
} from '@functionland/component-library';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { copyToClipboard } from '../utils/clipboard';
import { Helper } from '../utils';
import { BloxIcon, CopyIcon, ExternalLinkIcon } from './Icons';
import { useBloxsStore } from '../stores';
import { useSDK } from '@metamask/sdk-react';
import { chainNames } from '../utils/walletConnectConifg';
import { fula, blockchain, fxblox } from '@functionland/react-native-fula';
import { useContractService } from '../contracts/contractService';
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
  const [bloxAccountId, setBloxAccountId] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [contractInitialized, setContractInitialized] = useState(false);
  const [userHasExplicitlyConnected, setUserHasExplicitlyConnected] = useState(false);
  const resetChainShown = useRef(false);

  const signiture = useUserProfileStore((state) => state.signiture);
  const password = useUserProfileStore((state) => state.password);
  const address = useUserProfileStore((state) => state.address);
  const fulaIsReady = useUserProfileStore((state) => state.fulaIsReady);
  const appPeerId = useUserProfileStore((state) => state.appPeerId);

  const getContractRewards = useUserProfileStore((state) => state.getContractRewards);
  const selectedChain = useSettingsStore((state) => state.selectedChain);
  const { account, chainId, provider } = useSDK();
  const { initializeService } = useContractService();
  const accountOptionsSheetRef = useRef<FxBottomSheetModalMethods>(null);
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

  // Initialize contract service when wallet is connected and user has explicitly connected
  // DISABLED to prevent automatic MetaMask calls
  // useEffect(() => {
  //   const initializeContracts = async () => {
  //     // Only initialize if user has explicitly connected their wallet
  //     if (account && provider && selectedChain && userHasExplicitlyConnected) {
  //       try {
  //         // Get the current functions from their sources to avoid dependency issues
  //         const currentGetContractRewards = useUserProfileStore.getState().getContractRewards;

  //         await initializeService(selectedChain);
  //         setContractInitialized(true);

  //         // Try to get contract rewards
  //         try {
  //           await currentGetContractRewards();
  //         } catch (error) {
  //           console.log('Could not get contract rewards:', error);
  //         }

  //         queueToast({
  //           type: 'success',
  //           title: 'Contract Connected',
  //           message: `Connected to ${CHAIN_DISPLAY_NAMES[selectedChain]} contracts`,
  //         });
  //       } catch (error) {
  //         console.error('Contract initialization failed:', error);
  //         setContractInitialized(false);
  //         queueToast({
  //           type: 'error',
  //           title: 'Contract Connection Failed',
  //           message: error.message || 'Failed to connect to contracts',
  //         });
  //       }
  //     } else {
  //       setContractInitialized(false);
  //     }
  //   };

  //   initializeContracts();
  // }, [account, provider, selectedChain, userHasExplicitlyConnected, initializeService, queueToast]);

  const calledRef = useRef(false); // Track if retry has already happened

  const showAccountModal = useCallback(() => {
    resetChainShown.current = true;
    accountOptionsSheetRef?.current?.present();
  }, []);

  const handleBloxAccountError = useCallback((e: any) => {
    const err = e.message || e.toString();
    if (err.includes('failed to dial')) {
      setBloxAccountId('Connection to Blox not established');
    } else if (err.includes('blockchain call error')) {
      setBloxAccountId('Error with blockhain.');
      if (!resetChainShown.current) {
        showAccountModal();
      }
    } else {
      setBloxAccountId(err);
    }
  }, [showAccountModal]);

  const updateAccountId = useCallback(async () => {
    if (calledRef.current) return; // Avoid looping

    try {
      setLoading(true);
      setBloxAccountId('Waiting for connection');

      if (fulaIsReady) {
        // Get the current checkBloxConnection function from the store
        const currentCheckBloxConnection = useUserProfileStore.getState().checkBloxConnection;
        const connectionStatus = await currentCheckBloxConnection();
        if (connectionStatus) {
          setBloxAccountId('Connected to blox');
          try {
            const bloxAccount = await blockchain.getAccount();
            setBloxAccountId(bloxAccount.account);
          } catch (e) {
            handleBloxAccountError(e);
          }
        } else {
          setBloxAccountId('Not Connected to blox');
        }
      } else {
        if (password && signiture && currentBloxPeerId && !calledRef.current) {
          calledRef.current = true; // prevent infinite retry
          await Helper.initFula({
            password: password,
            signiture: signiture,
            bloxPeerId: currentBloxPeerId,
          });
          await updateAccountId();
        } else {
          setBloxAccountId('Fula is not ready');
        }
      }
    } catch (error) {
      setBloxAccountId(error.message);
    } finally {
      setLoading(false);
    }
  }, [fulaIsReady, password, signiture, currentBloxPeerId, handleBloxAccountError]);

  useEffect(() => {
    console.log('useEffect triggered - updateAccountId dependency changed');
    console.log('Current updateAccountId function:', updateAccountId.toString().substring(0, 100));
    updateAccountId();
  }, [updateAccountId]);

  const handleAccountOptionSelect = async (type: AccountOptionsType) => {
    accountOptionsSheetRef?.current?.close();
    switch (type) {
      case 'RESET-CHAIN':
        if (fulaIsReady) {
          console.log('resetting chain request');
          try {
            console.log('checking blox connection');
            const currentCheckBloxConnection = useUserProfileStore.getState().checkBloxConnection;
            const connectionStatus = await currentCheckBloxConnection();
            if (connectionStatus) {
              const eraseRes = await fxblox.eraseBlData();
              console.log(eraseRes.msg);
              queueToast({
                type: 'info',
                title: 'Reset chain Data',
                message:
                  eraseRes.msg || 'Your Blox does not support this command!',
              });
            }
          } catch (error) {
            console.log('handleAccountOptionSelect:checkBloxConnection', error);
          }
        } else {
          console.log('fula is not ready');
        }
        break;
      default:
        break;
    }
  };
  const connectWallet = useCallback(async () => {
    try {
      if (provider) {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setUserHasExplicitlyConnected(true);
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  }, [provider]);

  const onRefreshPress = useCallback(() => {
    resetChainShown.current = false;
    calledRef.current = false; // Reset the retry flag
    updateAccountId();
    // Also try to connect wallet if not already connected
    if (!userHasExplicitlyConnected && provider) {
      connectWallet();
    }
  }, [updateAccountId, userHasExplicitlyConnected, provider, connectWallet]);

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
              <FxRefreshIcon
                fill={colors.content3}
                onPress={onRefreshPress}
                style={{ position: 'absolute', right: 0 }}
              />
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
          </FxBox>
        </FxBox>
        {bloxAccountId && (
          <FxBox marginTop="24" width="100%">
            <FxButton
              onPress={() => copyToClipboard(bloxAccountId)}
              iconLeft={<CopyIcon />}
              flexWrap="wrap"
              paddingHorizontal="32"
              size="large"
              disabled={!bloxAccountId.startsWith('5')}
            >
              Blox account: {bloxAccountId}
            </FxButton>
          </FxBox>
        )}
        {bloxAccountId !== undefined && (
          <FxBox marginTop="24" width="100%">
            <FxButton
              onPress={() => {
                Linking.openURL('https://pools.fx.land/');
              }}
              iconLeft={<ExternalLinkIcon />}
              flexWrap="wrap"
              paddingHorizontal="32"
              size="large"
            >
              Register Blox on Mainnet
            </FxButton>
          </FxBox>
        )}
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
      <AccountOptionsSheet
        ref={accountOptionsSheetRef}
        onSelected={handleAccountOptionSelect}
      />
    </FxSafeAreaBox>
  );
};
