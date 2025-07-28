import React, { useState, useEffect } from 'react';
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
import { usePoolsStore } from '../../stores/usePoolsStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useSDK } from '@metamask/sdk-react';
import { PoolApiService } from '../../services/poolApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [joinState, setJoinState] = useState<{
    step1Complete: boolean;
    step2Complete: boolean;
    step1Error?: string;
    step2Error?: string;
  }>({ step1Complete: false, step2Complete: false });

  const { queueToast } = useToast();
  const { account } = useSDK();
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);
  const bloxsConnectionStatus = useBloxsStore((state) => state.bloxsConnectionStatus);
  const selectedChain = useSettingsStore((state) => state.selectedChain);
  const joinPool = usePoolsStore((state) => state.joinPool);

  // Check if Blox is connected
  const isBloxConnected = currentBloxPeerId &&
    bloxsConnectionStatus[currentBloxPeerId] === 'CONNECTED';

  // Load join state from storage on mount
  useEffect(() => {
    const loadJoinState = async () => {
      try {
        const key = `joinState_${pool.poolID}_${currentBloxPeerId}`;
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const parsedState = JSON.parse(stored);
          setJoinState(parsedState);
        }
      } catch (error) {
        console.error('Error loading join state:', error);
      }
    };

    if (currentBloxPeerId) {
      loadJoinState();
    }
  }, [pool.poolID, currentBloxPeerId]);

  // Save join state to storage
  const saveJoinState = async (state: typeof joinState) => {
    try {
      const key = `joinState_${pool.poolID}_${currentBloxPeerId}`;
      await AsyncStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving join state:', error);
    }
  };

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
            await performJoinPool();
          },
        },
      ]
    );
  };

  const performJoinPool = async () => {
    setIsJoining(true);
    const poolId = parseInt(pool.poolID, 10);
    let newJoinState = { ...joinState };

    try {
      // Step 1: Call Blox join pool method (if not already completed)
      if (!joinState.step1Complete) {
        try {
          console.log('Step 1: Calling Blox joinPool method...');
          const response = await joinPool(poolId);
          console.log('Step 1: Blox joinPool response:', response);

          newJoinState.step1Complete = true;
          newJoinState.step1Error = undefined;
          console.log('Step 1: Blox joinPool succeeded');
        } catch (error) {
          console.error('Step 1: Blox joinPool failed:', error);
          newJoinState.step1Error = error instanceof Error ? error.message : String(error);
          // Continue to step 2 even if step 1 fails
        }
      }

      // Step 2: Call API to join the pool (always execute)
      if (!joinState.step2Complete) {
        try {
          console.log('Step 2: Calling API joinPool...');
          const request = {
            peerId: currentBloxPeerId,
            account: account,
            chain: selectedChain,
            poolId: poolId,
          };

          const response = await PoolApiService.joinPool(request);

          if (response.status === 'ok') {
            newJoinState.step2Complete = true;
            newJoinState.step2Error = undefined;
            console.log('Step 2: API joinPool succeeded');
          } else {
            throw new Error(response.msg || 'Join request failed');
          }
        } catch (error) {
          console.error('Step 2: API joinPool failed:', error);
          newJoinState.step2Error = error instanceof Error ? error.message : String(error);
        }
      }

      // Save state
      setJoinState(newJoinState);
      await saveJoinState(newJoinState);

      // Show appropriate message based on results
      if (newJoinState.step1Complete && newJoinState.step2Complete) {
        // Both steps succeeded
        queueToast({
          type: 'success',
          title: 'Pool Joined Successfully',
          message: 'You are now a member of the pool!',
        });
        // Clear the stored state since join is complete
        const key = `joinState_${pool.poolID}_${currentBloxPeerId}`;
        await AsyncStorage.removeItem(key);
      } else if (!newJoinState.step1Complete && newJoinState.step2Complete) {
        // Step 1 failed but step 2 succeeded
        queueToast({
          type: 'warning',
          title: 'Join Request Submitted',
          message: 'Your join request has been submitted. It may take up to 1 hour to get processed.',
        });
      } else if (newJoinState.step1Complete && !newJoinState.step2Complete) {
        // Step 1 succeeded but step 2 failed
        queueToast({
          type: 'warning',
          title: 'Partial Join Complete',
          message: 'Blox configuration updated. Click "Re-send Join" to complete the process.',
        });
      } else {
        // Both steps failed
        const errorMessage = newJoinState.step2Error || newJoinState.step1Error || 'Join failed';

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
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleResendJoin = async () => {
    // Only perform step 2 (API call) since step 1 is already complete
    setIsJoining(true);
    let newJoinState = { ...joinState };

    try {
      const request = {
        peerId: currentBloxPeerId,
        account: account,
        chain: selectedChain,
        poolId: parseInt(pool.poolID, 10),
      };

      const response = await PoolApiService.joinPool(request);

      if (response.status === 'ok') {
        newJoinState.step2Complete = true;
        newJoinState.step2Error = undefined;

        setJoinState(newJoinState);
        await saveJoinState(newJoinState);

        queueToast({
          type: 'success',
          title: 'Pool Joined Successfully',
          message: 'You are now a member of the pool!',
        });

        // Clear the stored state since join is complete
        const key = `joinState_${pool.poolID}_${currentBloxPeerId}`;
        await AsyncStorage.removeItem(key);
      } else {
        throw new Error(response.msg || 'Join request failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      newJoinState.step2Error = errorMessage;
      setJoinState(newJoinState);
      await saveJoinState(newJoinState);

      queueToast({
        type: 'error',
        title: 'Re-send Join Failed',
        message: errorMessage,
      });
    } finally {
      setIsJoining(false);
    }
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

    {/* Join/Leave button - enhanced with state management */}
    {isDetailed && !isRequested && (
      <FxButton
        onPress={
          joinState.step2Complete
            ? async () => {
                await leavePool(parseInt(pool.poolID, 10));
                // Clear join state when leaving pool
                const key = `joinState_${pool.poolID}_${currentBloxPeerId}`;
                await AsyncStorage.removeItem(key);
                setJoinState({ step1Complete: false, step2Complete: false });
              }
            : joinState.step1Complete && !joinState.step2Complete
              ? handleResendJoin
              : handleJoinPool
        }
        flexWrap="wrap"
        paddingHorizontal="16"
        iconLeft={<FxPoolIcon />}
        disabled={isJoining || (!isBloxConnected && !joinState.step2Complete)}
      >
        {isJoining
          ? 'Processing...'
          : joinState.step2Complete
            ? 'Leave Pool'
            : !isBloxConnected
              ? 'Blox Disconnected'
              : joinState.step1Complete && !joinState.step2Complete
                ? 'Re-send Join'
                : 'Join'
        }
      </FxButton>
    )}

    {/* Show join status if there are partial states */}
    {isDetailed && !isJoined && !isRequested && (joinState.step1Complete || joinState.step2Complete) && (
      <FxBox marginTop="8" padding="8" backgroundColor="backgroundSecondary" borderRadius="s">
        <FxText variant="bodyXSRegular" color="content2">
          Join Status:
        </FxText>
        <FxText variant="bodyXSRegular" color={joinState.step2Complete ? 'greenBase' : 'errorBase'}>
          • Pool Registration: {joinState.step2Complete ? '✓ Complete' : '✗ Pending'}
        </FxText>
        {joinState.step2Error && (
          <FxText variant="bodyXSRegular" color="errorBase" marginTop="4">
            API Error: {joinState.step2Error}
          </FxText>
        )}
      </FxBox>
    )}

    {/* Cancel join request button */}
    {isDetailed && isRequested && !isJoined && (
      <FxButton
        onPress={async () => {
          await cancelJoinPool(parseInt(pool.poolID, 10));
          // Clear join state when canceling request
          const key = `joinState_${pool.poolID}_${currentBloxPeerId}`;
          await AsyncStorage.removeItem(key);
          setJoinState({ step1Complete: false, step2Complete: false });
        }}
        flexWrap="wrap"
        paddingHorizontal="16"
        marginRight="8"
        marginBottom="8"
        variant="inverted"
      >
        Cancel Request
      </FxButton>
    )}

    {/* Leave pool button */}
    {isDetailed && isJoined && (
      <FxButton
        onPress={async () => {
          await leavePool(parseInt(pool.poolID, 10));
          // Clear join state when leaving pool
          const key = `joinState_${pool.poolID}_${currentBloxPeerId}`;
          await AsyncStorage.removeItem(key);
          setJoinState({ step1Complete: false, step2Complete: false });
        }}
        flexWrap="wrap"
        paddingHorizontal="16"
        marginRight="8"
        marginBottom="8"
        variant="inverted"
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
