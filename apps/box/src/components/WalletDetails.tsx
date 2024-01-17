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
import { BloxIcon, CopyIcon } from './Icons';
import { useBloxsStore } from '../stores';
import { shallow } from 'zustand/shallow';
import { useSDK } from '@metamask/sdk-react';
import { chainNames } from '../utils/walletConnectConifg';
import { blockchain } from '@functionland/react-native-fula';
interface WalletDetailsProps {
  allowChangeWallet?: boolean;
  showPeerId?: boolean;
  showDID?: boolean;
  showBloxPeerIds?: boolean;
  showNetwork?: boolean;
  showBloxAccount?: boolean;
}
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
  const [signiture, password] = useUserProfileStore((state) => [
    state.signiture,
    state.password,
  ]);
  const { account, chainId, sdk, connected } = useSDK();

  useEffect(() => {
    if (showBloxAccount) {
      updateBloxAccount();
    }
  }, []);

  const updateBloxAccount = async () => {
    const bloxAccount = { account: 'Ccdvdsvdsvs.....' };
    setBloxAccountId(bloxAccount.account);
  };

  const tryConnect = async () => {
    await sdk?.terminate();
    await sdk?.connect();
  };

  const DID = useMemo(() => {
    if (password && signiture) return Helper.getMyDID(password, signiture);
    return null;
  }, [password, signiture]);

  return (
    <FxBox paddingVertical="12" alignItems="center">
      <FxText variant="bodyMediumRegular">Wallet Address</FxText>
      <FxBox marginTop="24" width="100%">
        {connected && account ? (
          <FxButton
            onPress={() => {
              copyToClipboard(account ? account : '');
            }}
            iconLeft={<CopyIcon />}
            flexWrap="wrap"
            paddingHorizontal="32"
            size="large"
          >
            {account}
          </FxButton>
        ) : (
          <FxButton
            onPress={() => {
              tryConnect();
            }}
            flexWrap="wrap"
            paddingHorizontal="32"
            size="large"
            variant="inverted"
            alignContent="center"
          >
            Connect to MetaMask
          </FxButton>
        )}
        {showNetwork && (
          <FxBox>
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
