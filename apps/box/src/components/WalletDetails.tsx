import '@walletconnect/react-native-compat';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  FxBox,
  FxButton,
  FxHeader,
  FxBottomSheetModalMethods,
  FxText,
  useToast,
  FxRefreshIcon,
  FxSafeAreaBox,
} from '@functionland/component-library';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { copyToClipboard } from '../utils/clipboard';
import { Helper } from '../utils';
import { BloxIcon, CopyIcon, ExternalLinkIcon } from './Icons';
import { useBloxsStore } from '../stores';
import { useSDK } from '@metamask/sdk-react';
import { chainNames } from '../utils/walletConnectConifg';
import { fula, blockchain, fxblox } from '@functionland/react-native-fula';
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
  const [bloxs = {}] = useBloxsStore((state) => [state.bloxs]);
  const bloxsArray = Object.values(bloxs);
  const [loading, setLoading] = useState(false);
  const [bloxAccountId, setBloxAccountId] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const resetChainShown = useRef(false);
  const [
    signiture,
    password,
    address,
    isFulaReady,
    appPeerId,
    checkBloxConnection,
  ] = useUserProfileStore((state) => [
    state.signiture,
    state.password,
    state.address,
    state.fulaIsReady,
    state.appPeerId,
    state.checkBloxConnection,
  ]);
  const { account, chainId } = useSDK();
  const accountOptionsSheetRef = useRef<FxBottomSheetModalMethods>(null);
  const { queueToast } = useToast();

  const checkFulaReadiness = useUserProfileStore(
    (state) => state.checkFulaReadiness
  );

  useEffect(() => {
    checkFulaReadiness();
  }, [checkFulaReadiness]);

  useEffect(() => {
    console.log('inside account useEffect');
    const updateData = async () => {
      if (address) {
        setWalletAddress(address);
      } else {
        setWalletAddress('');
      }
    };

    updateData();
  }, [address]);
  const updateAccountId = async () => {
    try {
      setLoading(true);
      setBloxAccountId('Waiting for connection');
      await fula.isReady(false);
      if (isFulaReady) {
        const connectionStatus = await checkBloxConnection(6, 10);
        if (connectionStatus) {
          setBloxAccountId('Connected to blox');
          await updateBloxAccount();
        } else {
          setBloxAccountId('Not Connected to blox');
        }
      } else {
        setBloxAccountId('Fula is not ready');
      }
    } catch (error) {
      setBloxAccountId('Couldnot Connect to blox');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('inside account useEffect');
    updateAccountId();
  }, [isFulaReady]);

  const handleAccountOptionSelect = async (type: AccountOptionsType) => {
    accountOptionsSheetRef?.current?.close();
    switch (type) {
      case 'RESET-CHAIN':
        if (isFulaReady) {
          console.log('resetting chain request');
          try {
            console.log('checking blox connection');
            const connectionStatus = await checkBloxConnection();
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

  const updateBloxAccount = async () => {
    blockchain
      .getAccount()
      .then((bloxAccount) => {
        setBloxAccountId(bloxAccount.account);
      })
      .catch((e) => {
        console.log('Inside the updateBloxAccount');
        console.log(e);
        const err = e.message || e.toString();
        if (err.includes('failed to dial')) {
          console.log("The string contains 'failed to dial'.");
          setBloxAccountId('Connection to Blox not established');
        } else if (err.includes('blockchain call error')) {
          setBloxAccountId('Error with blockhain.');
          if (!resetChainShown.current) {
            showAccountModal();
          }
        } else {
          console.log("The string does not contain 'failed to dial'.");
          setBloxAccountId(e.message || e.toString());
        }
      });
  };
  const showAccountModal = () => {
    resetChainShown.current = true;
    accountOptionsSheetRef?.current?.present();
  };
  const onRefreshPress = () => {
    resetChainShown.current = false;
    updateAccountId();
  };

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
                color="white"
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
                const baseUrl = 'https://fund.functionyard.fula.network/';
                const url = bloxAccountId.startsWith('5')
                  ? `${baseUrl}?accountId=${bloxAccountId}`
                  : baseUrl;
                Linking.openURL(url);
              }}
              iconLeft={<ExternalLinkIcon />}
              flexWrap="wrap"
              paddingHorizontal="32"
              size="large"
              disabled={!bloxAccountId.startsWith('5')}
            >
              Join Fula Testnet
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
              {`PeerId:${appPeerId}`}
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
