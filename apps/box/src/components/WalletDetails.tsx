import '@walletconnect/react-native-compat';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FxBox,
  FxButton,
  FxHeader,
  FxOpenInIcon,
  FxText,
  useToast,
} from '@functionland/component-library';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { copyToClipboard } from '../utils/clipboard';
import { Helper } from '../utils';
import { BloxIcon, CopyIcon, ExternalLinkIcon } from './Icons';
import { useBloxsStore } from '../stores';
import { useSDK } from '@metamask/sdk-react';
import { chainNames } from '../utils/walletConnectConifg';
import { fula, blockchain } from '@functionland/react-native-fula';
import { Linking } from 'react-native';
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
  showDID,
  showBloxPeerIds = false,
}: WalletDetailsProps) => {
  const [bloxs = {}] = useBloxsStore((state) => [state.bloxs]);
  const bloxsArray = Object.values(bloxs);
  const [bloxAccountId, setBloxAccountId] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [signiture, password, address, isFulaReady, appPeerId] =
    useUserProfileStore((state) => [
      state.signiture,
      state.password,
      state.address,
      state.fulaIsReady,
      state.appPeerId,
    ]);
  const { account, chainId } = useSDK();

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

  useEffect(() => {
    console.log('inside account useEffect');
    const updateData = async () => {
      setBloxAccountId('Waiting for fula transfer protocol');
      await fula.isReady();
      if (isFulaReady) {
        setBloxAccountId('Connecting to blox');
        await updateBloxAccount();
      }
    };

    updateData();
  }, [isFulaReady]);

  const updateBloxAccount = async () => {
    blockchain
      .getAccount()
      .then((bloxAccount) => {
        setBloxAccountId(bloxAccount.account);
      })
      .catch((e) => {
        console.log('Inside the updateBloxAccount');
        console.log(e);
        setBloxAccountId(e.message || e.toString());
      });
  };

  const DID = useMemo(() => {
    if (password && signiture) return Helper.getMyDID(password, signiture);
    return null;
  }, [password, signiture]);

  return (
    <FxBox paddingVertical="12" alignItems="center">
      <FxText variant="h300">Account Details</FxText>
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
                <FxBox style={{ flex: 1, width: 250 }}>
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
  );
};
