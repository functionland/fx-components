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
import { shallow } from 'zustand/shallow';
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
  showBloxAccount?: boolean;
}
const useFulaReady = (initialDelay = 1000, maxAttempts = 5) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const intervalId = setInterval(async () => {
      const ready = await fula.isReady();
      if (ready || attempts >= maxAttempts) {
        clearInterval(intervalId);
        setIsReady(ready);
      }
      attempts++;
    }, initialDelay);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [initialDelay, maxAttempts]);

  return isReady;
};
export const WalletDetails = ({
  allowChangeWallet,
  showNetwork = true,
  showPeerId,
  showBloxAccount = false,
  showDID,
  showBloxPeerIds = false,
}: WalletDetailsProps) => {
  const appPeerId = useUserProfileStore((state) => state.appPeerId);
  const [bloxs = {}] = useBloxsStore((state) => [state.bloxs], shallow);
  const bloxsArray = Object.values(bloxs);
  const [bloxAccountId, setBloxAccountId] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [signiture, password, address] = useUserProfileStore((state) => [
    state.signiture,
    state.password,
    state.address,
  ]);
  const { account, chainId } = useSDK();

  const isFulaReady = useFulaReady();

  useEffect(() => {
    console.log('inside account useEffect');
    const updateData = async () => {
      if (address) {
        setWalletAddress(address);
      } else if (account) {
        setWalletAddress(account);
      } else {
        // Handle case where both address and account are not available
        setWalletAddress('');
      }
    };
  
    updateData();
  }, [account, address]);

  useEffect(() => {
    console.log('inside account useEffect');
    const updateData = async () => {
      await fula.isReady();
      if (isFulaReady && showBloxAccount) {
        await updateBloxAccount();
      }
    };
  
    updateData();
  }, [showBloxAccount, isFulaReady]);
  

  const updateBloxAccount = async () => {
    const bloxAccount = await blockchain.getAccount();
    setBloxAccountId(bloxAccount.account);
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
      {bloxAccountId && showBloxAccount && (
        <FxBox marginTop="24" width="100%">
          <FxButton
            onPress={() => copyToClipboard(bloxAccountId)}
            iconLeft={<CopyIcon />}
            flexWrap="wrap"
            paddingHorizontal="32"
            size="large"
          >
            Blox account: {bloxAccountId}
          </FxButton>
        </FxBox>
      )}
      {bloxAccountId && showBloxAccount && (
        <FxBox marginTop="24" width="100%">
          <FxButton
            onPress={() => Linking.openURL('https://fund.functionyard.fula.network/?accountId='+bloxAccountId)}
            iconLeft={<ExternalLinkIcon />}
            flexWrap="wrap"
            paddingHorizontal="32"
            size="large"
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
