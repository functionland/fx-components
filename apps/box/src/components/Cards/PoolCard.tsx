import React, { useState } from 'react';
import {
  FxBox,
  FxButton,
  FxCard,
  FxPoolIcon,
  FxSpacer,
  FxTag,
  FxText,
  useToast,
} from '@functionland/component-library';
import { Alert } from 'react-native';
import { TPool } from '../../models';
import { useBloxsStore } from '../../stores/useBloxsStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useSDK } from '@metamask/sdk-react';
import { PoolApiService } from '../../services/poolApiService';

type PoolCardType = React.ComponentProps<typeof FxCard> & {
  pool: TPool;
  isDetailed: boolean;
  isRequested: boolean;
  isJoined: boolean;
  numVotes: number;
  numVoters: number;
  leavePool: (poolID: number) => Promise<void>;
  cancelJoinPool: (poolID: number) => Promise<void>;
};

const DetailInfo = ({
  pool,
  isDetailed,
  isRequested,
  isJoined,
  numVotes,
  numVoters,
  leavePool,
  cancelJoinPool,
}: {
  pool: TPool;
  isDetailed?: boolean;
  isRequested: boolean;
  isJoined: boolean;
  numVotes: number;
  numVoters: number;
  leavePool: (poolID: number) => Promise<void>;
  cancelJoinPool: (poolID: number) => Promise<void>;
}) => {
  const [isJoining, setIsJoining] = useState(false);
  const { queueToast } = useToast();
  const { account } = useSDK();
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);
  const bloxsConnectionStatus = useBloxsStore((state) => state.bloxsConnectionStatus);
  const selectedChain = useSettingsStore((state) => state.selectedChain);

  // Check if Blox is connected
  const isBloxConnected = currentBloxPeerId &&
    bloxsConnectionStatus[currentBloxPeerId] === 'CONNECTED';

  const handleJoinPool = async () => {
    // Check if wallet is connected
    if (!account) {
      queueToast({
        type: 'error',
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet first.',
      });
      return;
    }

    // Check if we have the required data
    if (!currentBloxPeerId) {
      queueToast({
        type: 'error',
        title: 'Blox Peer ID Missing',
        message: 'Blox peer ID is not available.',
      });
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      'Join Pool',
      `Are you sure you want to join pool: ${pool.name} on ${selectedChain} for Blox: ${currentBloxPeerId}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Join',
          onPress: async () => {
            setIsJoining(true);
            try {
              // Call ONLY the API to join the pool (no contract call)
              const request = {
                peerId: currentBloxPeerId,
                account: account,
                chain: selectedChain,
                poolId: parseInt(pool.poolID, 10),
              };

              const response = await PoolApiService.joinPool(request);

              if (response.status === 'ok') {
                queueToast({
                  type: 'success',
                  title: 'Pool Join Requested',
                  message: response.msg || 'Your join request has been submitted successfully.',
                });
              } else {
                throw new Error(response.msg || 'Join request failed');
              }
            } catch (error) {
              console.error('Error joining pool:', error);

              // Check for specific error messages
              const errorMessage = error instanceof Error ? error.message : String(error);

              if (errorMessage.includes('401') || errorMessage.includes('not registered')) {
                Alert.alert(
                  'Blox Not Registered',
                  'Your Blox is not registered. Please contact sales@fx.land or register your Blox.',
                  [
                    {
                      text: 'Contact Sales',
                      onPress: () => {
                        // Could open email client
                      },
                    },
                    {
                      text: 'Register Blox',
                      onPress: () => {
                        // Navigate to Users tab - this would need navigation prop
                      },
                    },
                    {
                      text: 'OK',
                      style: 'cancel',
                    },
                  ]
                );
              } else {
                queueToast({
                  type: 'error',
                  title: 'Join Pool Failed',
                  message: errorMessage,
                });
              }
            } finally {
              setIsJoining(false);
            }
          },
        },
      ]
    );
  };

  return (
    <FxBox>
      <FxSpacer marginTop="24" />
      <FxCard.Row>
        <FxCard.Row.Title>Location</FxCard.Row.Title>
        <FxCard.Row.Data>{pool.region}</FxCard.Row.Data>
      </FxCard.Row>

      <FxCard.Row>
        <FxCard.Row.Title>Blox Status</FxCard.Row.Title>
        <FxCard.Row.Data>
          {isBloxConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </FxCard.Row.Data>
      </FxCard.Row>

    {isJoined && (
      <FxCard.Row>
        <FxCard.Row.Title>Status</FxCard.Row.Title>
        <FxCard.Row.Data>Joined</FxCard.Row.Data>
      </FxCard.Row>
    )}

    {isRequested && !isJoined && (
      <FxCard.Row>
        <FxCard.Row.Title>Status</FxCard.Row.Title>
        <FxCard.Row.Data>
          Requested (votes: {numVotes}/{numVoters})
        </FxCard.Row.Data>
      </FxCard.Row>
    )}

    {/* Join button */}
    {isDetailed && !isJoined && !isRequested && (
      <FxButton
        onPress={handleJoinPool}
        flexWrap="wrap"
        paddingHorizontal="16"
        iconLeft={<FxPoolIcon />}
        disabled={isJoining || !isBloxConnected}
      >
        {isJoining ? 'Joining...' : !isBloxConnected ? 'Blox Disconnected' : 'Join'}
      </FxButton>
    )}

    {/* Cancel join request button */}
    {isDetailed && isRequested && !isJoined && (
      <FxButton
        onPress={() => cancelJoinPool(parseInt(pool.poolID, 10))}
        flexWrap="wrap"
        paddingHorizontal="16"
        marginRight="8"
        marginBottom="8"
        variant="destructive"
      >
        Cancel Request
      </FxButton>
    )}

    {/* Leave pool button */}
    {isDetailed && isJoined && (
      <FxButton
        onPress={() => leavePool(parseInt(pool.poolID, 10))}
        flexWrap="wrap"
        paddingHorizontal="16"
        marginRight="8"
        marginBottom="8"
        variant="destructive"
      >
        Leave Pool
      </FxButton>
    )}

    {/* Voting status */}
    {isDetailed && isJoined && (
      <FxCard.Row>
        <FxCard.Row.Title>Voting status</FxCard.Row.Title>
        <FxCard.Row.Data>
          {numVotes}/{numVoters}
        </FxCard.Row.Data>
      </FxCard.Row>
    )}
    </FxBox>
  );
};

export const PoolCard = ({
  pool,
  isDetailed,
  isRequested,
  isJoined,
  numVotes,
  numVoters,
  leavePool,
  cancelJoinPool,
  ...rest
}: PoolCardType) => {
  return (
    <FxCard marginTop="16" {...rest}>
      <FxBox flexDirection="row" alignItems="center">
        <FxBox>
          <FxCard.Title>{pool.name}</FxCard.Title>
          <FxText variant="bodyXSRegular">ID: {pool.poolID}</FxText>
          <FxSpacer marginTop="16" />
          <FxBox flexDirection="row">
            <FxTag>Home Blox Setup</FxTag>
          </FxBox>
        </FxBox>
      </FxBox>
      {isDetailed && (
        <DetailInfo
          pool={pool}
          isDetailed={isDetailed}
          isRequested={isRequested}
          isJoined={isJoined}
          numVotes={numVotes}
          numVoters={numVoters}
          leavePool={leavePool}
          cancelJoinPool={cancelJoinPool}
        />
      )}
    </FxCard>
  );
};
