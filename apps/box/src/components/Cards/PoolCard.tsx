import React, { useState, useEffect, useRef } from 'react';
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
import { useWallet } from '../../hooks/useWallet';
import { PoolApiService } from '../../services/poolApiService';
import { getContractService } from '../../contracts/contractService';
import { ethers } from 'ethers';
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
  const joinCancelledRef = useRef(false);
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { queueToast } = useToast();
  const { account } = useWallet();
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);
  const bloxsForCluster = useBloxsStore((state) => state.bloxs);
  const bloxsConnectionStatus = useBloxsStore((state) => state.bloxsConnectionStatus);
  const selectedChain = useSettingsStore((state) => state.selectedChain);
  const bloxsPropertyInfo = useBloxsStore((state) => state.bloxsPropertyInfo);
  const isPC = currentBloxPeerId
    && bloxsPropertyInfo?.[currentBloxPeerId]?.containerInfo_fula?.image?.includes('_amd64');
  // Use ipfs-cluster peerID for pool API operations
  // Do not fall back to kubo peerId — it is wrong for on-chain operations
  const storedClusterPeerId = currentBloxPeerId ? bloxsForCluster[currentBloxPeerId]?.clusterPeerId : undefined;
  const clusterPeerId = (storedClusterPeerId && storedClusterPeerId !== currentBloxPeerId)
    ? storedClusterPeerId
    : undefined;
  const joinPool = usePoolsStore((state) => state.joinPool);
  const forceRejoinPool = usePoolsStore((state) => state.forceRejoinPool);

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

    // Build confirmation message — for PC, include required token amount
    let confirmMessage = `Are you sure you want to join pool: ${pool.name} on ${selectedChain} for Blox: ${currentBloxPeerId}?`;

    if (isPC) {
      try {
        console.log('handleJoinPool: PC mode, fetching required tokens for pool', pool.poolID, 'chain', selectedChain);
        const service = getContractService(selectedChain);
        const requiredTokens = await service.getRequiredTokens(pool.poolID);
        console.log('handleJoinPool: requiredTokens result:', requiredTokens);
        const formattedTokens = ethers.utils.formatEther(requiredTokens);
        confirmMessage = `Joining pool "${pool.name}" requires locking ${formattedTokens} FULA tokens.\n\nYou will be asked to approve the token transfer, then confirm the join transaction.\n\nContinue?`;
      } catch (err) {
        console.error('Failed to get required tokens:', err);
      }
    }

    // Show confirmation dialog
    Alert.alert(
      'Join Pool',
      confirmMessage,
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

  const cancelJoining = () => {
    joinCancelledRef.current = true;
    if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
    setIsJoining(false);
    queueToast({
      type: 'info',
      title: 'Cancelled',
      message: 'Join operation cancelled. You can retry.',
    });
  };

  const performJoinPool = async () => {
    joinCancelledRef.current = false;
    setIsJoining(true);
    // Safety timeout: reset isJoining after 120s
    joinTimeoutRef.current = setTimeout(() => {
      if (!joinCancelledRef.current) {
        setIsJoining(false);
        queueToast({ type: 'warning', title: 'Timeout', message: 'Join operation timed out. Check your transaction status and retry if needed.' });
      }
    }, 120000);
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

      // Step 2: Join the pool
      let apiTransactionHash: string | undefined;
      if (!joinState.step2Complete) {
        try {
          if (isPC) {
            // PC: Direct smart contract interaction
            console.log('Step 2: Direct contract joinPool (PC mode)...');
            const service = getContractService(selectedChain);
            await service.ensureTokenApproval(pool.poolID);
            await service.joinPool(pool.poolID, clusterPeerId);
            newJoinState.step2Complete = true;
            newJoinState.step2Error = undefined;
            console.log('Step 2: Contract joinPool succeeded');
          } else {
            // Armbian: API server call (unchanged)
            console.log('Step 2: Calling API joinPool...');
            const request = {
              peerId: clusterPeerId,
              kuboPeerId: currentBloxPeerId,
              account: account,
              chain: selectedChain,
              poolId: poolId,
            };

            const response = await PoolApiService.joinPool(request);

            if (response.status === 'ok') {
              newJoinState.step2Complete = true;
              newJoinState.step2Error = undefined;
              apiTransactionHash = response.transactionHash;
              console.log('Step 2: API joinPool succeeded');
            } else {
              throw new Error(response.msg || 'Join request failed');
            }
          }
        } catch (error) {
          console.error('Step 2 failed:', error);
          newJoinState.step2Error = error instanceof Error ? error.message : String(error);
        }
      }

      // Save state
      setJoinState(newJoinState);
      await saveJoinState(newJoinState);

      // Show appropriate message based on results
      if (newJoinState.step1Complete && newJoinState.step2Complete) {
        // Both steps succeeded
        const txMsg = apiTransactionHash
          ? `Transaction: ${apiTransactionHash.slice(0, 10)}...`
          : 'You are now a member of the pool!';
        queueToast({
          type: 'success',
          title: 'Pool Joined Successfully',
          message: txMsg,
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
      if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
      if (!joinCancelledRef.current) setIsJoining(false);
    }
  };

  const handleResendJoin = async () => {
    // Only perform step 2 since step 1 is already complete
    joinCancelledRef.current = false;
    setIsJoining(true);
    joinTimeoutRef.current = setTimeout(() => {
      if (!joinCancelledRef.current) {
        setIsJoining(false);
        queueToast({ type: 'warning', title: 'Timeout', message: 'Join operation timed out. Check your transaction status and retry if needed.' });
      }
    }, 120000);
    let newJoinState = { ...joinState };

    try {
      if (isPC) {
        // PC: Direct smart contract interaction
        console.log('Re-send: Direct contract joinPool (PC mode)...');
        const service = getContractService(selectedChain);
        await service.ensureTokenApproval(pool.poolID);
        await service.joinPool(pool.poolID, clusterPeerId);

        newJoinState.step2Complete = true;
        newJoinState.step2Error = undefined;

        setJoinState(newJoinState);
        await saveJoinState(newJoinState);

        queueToast({
          type: 'success',
          title: 'Pool Joined Successfully',
          message: 'You are now a member of the pool!',
        });

        const key = `joinState_${pool.poolID}_${currentBloxPeerId}`;
        await AsyncStorage.removeItem(key);
      } else {
        // Armbian: API server call (unchanged)
        const request = {
          peerId: clusterPeerId,
          kuboPeerId: currentBloxPeerId,
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

          const txMsg = response.transactionHash
            ? `Transaction: ${response.transactionHash.slice(0, 10)}...`
            : 'You are now a member of the pool!';
          queueToast({
            type: 'success',
            title: 'Pool Joined Successfully',
            message: txMsg,
          });

          const key = `joinState_${pool.poolID}_${currentBloxPeerId}`;
          await AsyncStorage.removeItem(key);
        } else {
          throw new Error(response.msg || 'Join request failed');
        }
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
      if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
      if (!joinCancelledRef.current) setIsJoining(false);
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
          isJoining
            ? cancelJoining
            : joinState.step2Complete
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
        disabled={!isJoining && !isBloxConnected && !joinState.step2Complete}
      >
        {isJoining
          ? 'Cancel'
          : joinState.step2Complete
            ? 'Leave Pool'
            : !isBloxConnected
              ? 'Blox Disconnected'
              : joinState.step1Complete && !joinState.step2Complete
                ? (isPC ? 'Re-send (Contract)' : 'Re-send Join')
                : (isPC ? 'Join (Contract)' : 'Join')
        }
      </FxButton>
    )}

    {/* Show join status if there are partial states */}
    {isDetailed && !isJoined && !isRequested && (joinState.step1Complete || joinState.step2Complete) && (
      <FxBox marginTop="8" padding="8" backgroundColor="backgroundSecondary" borderRadius="s">
        <FxText variant="bodyXSRegular" color="content2">
          Join Status:
        </FxText>
        <FxText variant="bodyXSRegular" color={joinState.step1Complete ? 'greenBase' : 'errorBase'}>
          • Blox Configuration: {joinState.step1Complete ? '✓ Complete' : '✗ Pending'}
        </FxText>
        {joinState.step1Error && (
          <FxText variant="bodyXSRegular" color="errorBase" marginTop="4">
            Blox Error: {joinState.step1Error}
          </FxText>
        )}
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

    {/* Force rejoin - re-sends pool ID to blox config without contract interaction */}
    {isDetailed && isJoined && (
      <FxButton
        onPress={async () => {
          try {
            await forceRejoinPool(parseInt(pool.poolID, 10));
            queueToast({
              type: 'success',
              title: 'Pool Rejoined',
              message: `Pool ID ${pool.poolID} has been re-set on your Blox.`,
            });
          } catch (error) {
            console.error('Force rejoin error:', error);
            queueToast({
              type: 'error',
              title: 'Rejoin Failed',
              message: error instanceof Error ? error.message : 'Failed to rejoin pool on Blox.',
            });
          }
        }}
        flexWrap="wrap"
        paddingHorizontal="16"
        marginRight="8"
        marginBottom="8"
        variant="inverted"
      >
        Force Rejoin
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
