import React, { useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, Alert } from 'react-native';
import Reanimated from 'react-native-reanimated';
import {
  FxBox,
  FxButton,
  FxCard,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
  useToast,
} from '@functionland/component-library';
import { useRoute, useNavigation } from '@react-navigation/native';
import { usePools } from '../../hooks/usePools';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { CHAIN_DISPLAY_NAMES } from '../../contracts/config';
import MyLoader from '../../components/ContentLoader';

interface JoinRequestsRouteParams {
  poolId: string;
}

interface JoinRequestItem {
  account: string;
  poolId: string;
  timestamp: number;
  approvals: number;
  rejections: number;
  status: number; // 1=pending, 2=approved, 3=rejected/cancelled
  peerId: string;
}

export const JoinRequestsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { poolId } = route.params as JoinRequestsRouteParams;
  const { queueToast } = useToast();
  
  const [refreshing, setRefreshing] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    pools,
    contractService,
    isReady,
    connectedAccount,
    userMemberPools,
    voteJoinRequest,
  } = usePools();

  const selectedChain = useSettingsStore((state) => state.selectedChain);
  const pool = pools.find(p => p.poolID === poolId);
  const userIsMember = userMemberPools.includes(poolId);

  useEffect(() => {
    if (isReady && contractService && poolId && userIsMember) {
      loadJoinRequests();
    }
  }, [isReady, contractService, poolId, userIsMember]);

  const loadJoinRequests = async () => {
    if (!contractService) return;
    
    setLoading(true);
    try {
      // This would need to be implemented in the contract service
      // For now, we'll use a placeholder
      // const requests = await contractService.getJoinRequests(poolId);
      setJoinRequests([]);
      
    } catch (error) {
      console.error('Error loading join requests:', error);
      queueToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load join requests',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (requestAccount: string, approve: boolean) => {
    Alert.alert(
      'Vote Confirmation',
      `Are you sure you want to ${approve ? 'approve' : 'reject'} this join request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Approve' : 'Reject',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            setRefreshing(true);
            try {
              const result = await voteJoinRequest(poolId, requestAccount, approve);
              if (result !== null) {
                queueToast({
                  type: 'success',
                  title: 'Vote Submitted',
                  message: `You have ${approve ? 'approved' : 'rejected'} the join request`,
                });
                await loadJoinRequests();
              }
            } catch (error) {
              queueToast({
                type: 'error',
                title: 'Vote Failed',
                message: 'Failed to submit vote',
              });
            } finally {
              setRefreshing(false);
            }
          },
        },
      ]
    );
  };

  if (!userIsMember) {
    return (
      <FxSafeAreaBox flex={1} edges={['top']}>
        <FxBox flex={1} justifyContent="center" alignItems="center" padding="20">
          <FxText variant="bodyLargeRegular" textAlign="center" marginBottom="16">
            Access Denied
          </FxText>
          <FxText variant="bodySmallRegular" color="content2" textAlign="center">
            You must be a member of this pool to view join requests
          </FxText>
        </FxBox>
      </FxSafeAreaBox>
    );
  }

  if (!pool) {
    return (
      <FxSafeAreaBox flex={1} edges={['top']}>
        <FxBox flex={1} justifyContent="center" alignItems="center">
          <FxText variant="bodyLargeRegular">Pool not found</FxText>
        </FxBox>
      </FxSafeAreaBox>
    );
  }

  return (
    <FxSafeAreaBox flex={1} edges={['top']}>
      <Reanimated.ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadJoinRequests}
          />
        }
        contentContainerStyle={styles.container}
      >
        {/* Header */}
        <FxCard marginBottom="16">
          <FxCard.Title>Join Requests for {pool.name}</FxCard.Title>
          <FxSpacer marginTop="8" />
          <FxText variant="bodySmallRegular" color="content2">
            Pool ID: {poolId} • Network: {CHAIN_DISPLAY_NAMES[selectedChain]}
          </FxText>
        </FxCard>

        {/* Join Requests List */}
        {loading ? (
          <MyLoader />
        ) : joinRequests.length > 0 ? (
          joinRequests.map((request, index) => (
            <FxCard key={`${request.account}-${index}`} marginBottom="16">
              <FxBox
                flexDirection="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <FxBox flex={1}>
                  <FxText variant="bodyMediumRegular" marginBottom="8">
                    Join Request #{index + 1}
                  </FxText>
                  <FxText
                    variant="bodySmallRegular"
                    color="content2"
                    marginBottom="4"
                  >
                    Account: {request.account.slice(0, 6)}...
                    {request.account.slice(-4)}
                  </FxText>
                  <FxText
                    variant="bodySmallRegular"
                    color="content2"
                    marginBottom="4"
                  >
                    Peer ID: {request.peerId.slice(0, 8)}...
                    {request.peerId.slice(-8)}
                  </FxText>
                  <FxText
                    variant="bodySmallRegular"
                    color="content2"
                    marginBottom="8"
                  >
                    Submitted:{' '}
                    {new Date(request.timestamp * 1000).toLocaleDateString()}
                  </FxText>

                  <FxBox flexDirection="row" marginBottom="16">
                    <FxBox marginRight="16">
                      <FxText variant="bodyXSRegular" color="greenBase">
                        Approvals: {request.approvals}
                      </FxText>
                    </FxBox>
                    <FxBox>
                      <FxText variant="bodyXSRegular" color="errorBase">
                        Rejections: {request.rejections}
                      </FxText>
                    </FxBox>
                  </FxBox>

                  {request.status === 1 && ( // Pending
                    <FxBox flexDirection="row">
                      <FxButton
                        onPress={() => handleVote(request.account, true)}
                        marginRight="8"
                        size="small"
                        variant="inverted"
                      >
                        Approve
                      </FxButton>
                      <FxButton
                        onPress={() => handleVote(request.account, false)}
                        size="small"
                        variant="inverted"
                      >
                        Reject
                      </FxButton>
                    </FxBox>
                  )}

                  {request.status === 2 && (
                    <FxText variant="bodySmallRegular" color="greenBase">
                      ✓ Approved
                    </FxText>
                  )}

                  {request.status === 3 && (
                    <FxText variant="bodySmallRegular" color="errorBase">
                      ✗ Rejected/Cancelled
                    </FxText>
                  )}
                </FxBox>
              </FxBox>
            </FxCard>
          ))
        ) : (
          <FxCard>
            <FxBox padding="20" alignItems="center">
              <FxText variant="bodyLargeRegular" marginBottom="8">
                No Join Requests
              </FxText>
              <FxText
                variant="bodySmallRegular"
                color="content2"
                textAlign="center"
              >
                There are currently no pending join requests for this pool
              </FxText>
            </FxBox>
          </FxCard>
        )}

        {/* Placeholder message for development */}
        <FxCard marginTop="16">
          <FxBox
            padding="16"
            backgroundColor="backgroundSecondary"
            borderRadius="m"
          >
            <FxText
              variant="bodySmallRegular"
              color="content2"
              textAlign="center"
            >
              Note: Join request management is currently in development. This
              screen will show actual join requests once the backend integration
              is complete.
            </FxText>
          </FxBox>
        </FxCard>
      </Reanimated.ScrollView>
    </FxSafeAreaBox>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
});
