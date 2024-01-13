import '@walletconnect/react-native-compat';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FxBox,
  FxButton,
  FxHeader,
  FxText,
  useToast,
} from '@functionland/component-library';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { copyToClipboard } from '../utils/clipboard';
import { Helper } from '../utils';
import { CopyIcon } from './Icons';
import { useBloxsStore } from '../stores';
import { shallow } from 'zustand/shallow';
import { useWalletClient, useConfig, useConnect, useAccount } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi-react-native';
interface WalletDetailsProps {
  allowChangeWallet?: boolean;
  showPeerId?: boolean;
  showDID?: boolean;
  showBloxPeerIds?: boolean;
}
export const WalletDetails = ({
  allowChangeWallet,
  showPeerId,
  showDID,
  showBloxPeerIds = false,
}: WalletDetailsProps) => {
  const { queueToast } = useToast();
  const appPeerId = useUserProfileStore((state) => state.appPeerId);
  const [bloxs = {}] = useBloxsStore((state) => [state.bloxs], shallow);
  const bloxsArray = Object.values(bloxs);
  const [signiture, password] = useUserProfileStore((state) => [
    state.signiture,
    state.password,
  ]);
  const { data: walletClient, error } = useWalletClient();
  const { open, close } = useWeb3Modal();
  // const { connectors } = useConfig();
  // const { connect, isSuccess } = useConnect({ connector: connectors[0] });
  // let { address: adr, isConnected } = useAccount();
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');

  // connect();
  useEffect(() => {
    if (error != null || walletClient == null) {
      console.log(error);
      setAddress('');
      setIsConnected(false);
    } else {
      const addr = walletClient?.account.address;
      setAddress(addr ? addr! : '');
      setIsConnected(true);
    }
  }, [walletClient]);

  const DID = useMemo(() => {
    if (password && signiture) return Helper.getMyDID(password, signiture);
    return null;
  }, [password, signiture]);

  const handleChangeWallet = async () => {
    try {
      close();
      open();
    } catch (err) {
      console.log(err);
      queueToast({
        type: 'error',
        title: 'Error',
        message: err?.toString(),
      });
    }
  };

  return (
    <FxBox paddingVertical="12" alignItems="center">
      {isConnected ? (
        <>
          {/* <Image
                        source={
                            walletConnect.peerMeta?.name === 'MetaMask'
                                ? getWalletImage(walletConnect.peerMeta.name)
                                : { uri: walletConnect.peerMeta.icons[0] }
                        }
                        style={styles.image}
                    />
                    <FxText variant="body" textAlign="center">
                        {walletConnect.peerMeta.name}
                    </FxText> */}
          <FxText variant="bodyMediumRegular">Wallet Address</FxText>
          <FxBox marginTop="24" width="100%">
            <FxButton
              onPress={() => copyToClipboard(address)}
              iconLeft={<CopyIcon />}
              flexWrap="wrap"
              paddingHorizontal="32"
              size="large"
            >
              {address}
            </FxButton>
          </FxBox>
        </>
      ) : (
        <FxText variant="body" marginBottom="24" textAlign="center">
          You are not connected to any wallet
        </FxText>
      )}
      {allowChangeWallet && (
        <FxButton
          variant="inverted"
          paddingHorizontal="16"
          marginTop="16"
          onPress={handleChangeWallet}
        >
          Change Wallet
        </FxButton>
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
