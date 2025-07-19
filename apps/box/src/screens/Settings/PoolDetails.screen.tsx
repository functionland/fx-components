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
  FxPoolIcon,
} from '@functionland/component-library';
import { useRoute, useNavigation } from '@react-navigation/native';
import { usePools } from '../../hooks/usePools';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { CHAIN_DISPLAY_NAMES } from '../../contracts/config';
import MyLoader from '../../components/ContentLoader';

interface PoolDetailsRouteParams {
  poolId: string;
}

export const PoolDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { poolId } = route.params as PoolDetailsRouteParams;
  const { queueToast } = useToast();
  
  const [refreshing, setRefreshing] = useState(false);
  const [poolMembers, setPoolMembers] = useState<string[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    pools,
    contractService,
    isReady,
    connectedAccount,
    userIsMemberOfAnyPool,
    userMemberPools,
    leavePoolViaAPI,
    joinPoolViaAPI,
  } = usePools();

  const selectedChain = useSettingsStore((state) => state.selectedChain);

  const pool = pools.find(p => p.poolID === poolId);
  const userIsMember = userMemberPools.includes(poolId);

  useEffect(() => {
    if (isReady && contractService && poolId) {
      loadPoolDetails();
    }
  }, [isReady, contractService, poolId]);

  const loadPoolDetails = async () => {
    if (!contractService) return;
    
    setLoading(true);
    try {
      // Load pool members
      const members = await contractService.getPoolMembers(poolId);
      setPoolMembers(members);

      // Load join requests (this would need to be implemented in contract service)
      // For now, we'll use a placeholder
      setJoinRequests([]);
      
    } catch (error) {
      console.error('Error loading pool details:', error);
      queueToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load pool details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPool = async () => {
    if (!pool) return;

    Alert.alert(
      'Join Pool Confirmation',
      `Are you sure you want to join pool "${pool.name}" on ${CHAIN_DISPLAY_NAMES[selectedChain]}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async () => {
            setRefreshing(true);
            try {
              const result = await joinPoolViaAPI(poolId, pool.name);
              if (result.success) {
                queueToast({
                  type: 'success',
                  title: 'Join Request Sent',
                  message: result.message,
                });
                await loadPoolDetails();
              } else {
                queueToast({
                  type: 'error',
                  title: 'Join Failed',
                  message: result.message,
                });
              }
            } catch (error) {
              queueToast({
                type: 'error',
                title: 'Error',
                message: 'Failed to join pool',
              });
            } finally {
              setRefreshing(false);
            }
          },
        },
      ]
    );
  };

  const handleLeavePool = async () => {
    if (!pool) return;

    Alert.alert(
      'Leave Pool Confirmation',
      `Are you sure you want to leave pool "${pool.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setRefreshing(true);
            try {
              const result = await leavePoolViaAPI(poolId);
              if (result.success) {
                queueToast({
                  type: 'success',
                  title: 'Left Pool',
                  message: result.message,
                });
                navigation.goBack();
              } else {
                queueToast({
                  type: 'error',
                  title: 'Leave Failed',
                  message: result.message,
                });
              }
            } catch (error) {
              queueToast({
                type: 'error',
                title: 'Error',
                message: 'Failed to leave pool',
              });
            } finally {
              setRefreshing(false);
            }
          },
        },
      ]
    );
  };

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
            onRefresh={loadPoolDetails}
          />
        }
        contentContainerStyle={styles.container}
      >
        {/* Pool Info */}
        <FxCard marginBottom="16">
          <FxCard.Title>{pool.name}</FxCard.Title>
          <FxSpacer marginTop="16" />
          <FxCard.Row>
            <FxCard.Row.Title>Pool ID</FxCard.Row.Title>
            <FxCard.Row.Data>{pool.poolID}</FxCard.Row.Data>
          </FxCard.Row>
          <FxCard.Row>
            <FxCard.Row.Title>Region</FxCard.Row.Title>
            <FxCard.Row.Data>{pool.region}</FxCard.Row.Data>
          </FxCard.Row>
          <FxCard.Row>
            <FxCard.Row.Title>Network</FxCard.Row.Title>
            <FxCard.Row.Data>{CHAIN_DISPLAY_NAMES[selectedChain]}</FxCard.Row.Data>
          </FxCard.Row>
          <FxCard.Row>
            <FxCard.Row.Title>Members</FxCard.Row.Title>
            <FxCard.Row.Data>{poolMembers.length}</FxCard.Row.Data>
          </FxCard.Row>
          {pool.maxMembers && (
            <FxCard.Row>
              <FxCard.Row.Title>Max Members</FxCard.Row.Title>
              <FxCard.Row.Data>{pool.maxMembers}</FxCard.Row.Data>
            </FxCard.Row>
          )}
          {pool.requiredTokens && (
            <FxCard.Row>
              <FxCard.Row.Title>Required Tokens</FxCard.Row.Title>
              <FxCard.Row.Data>{pool.requiredTokens} FULA</FxCard.Row.Data>
            </FxCard.Row>
          )}
        </FxCard>

        {/* Action Buttons */}
        <FxBox flexDirection="row" flexWrap="wrap" marginBottom="16">
          {userIsMember ? (
            <FxButton
              onPress={handleLeavePool}
              variant="destructive"
              marginRight="8"
              marginBottom="8"
            >
              Leave Pool
            </FxButton>
          ) : (
            <FxButton
              onPress={handleJoinPool}
              iconLeft={<FxPoolIcon />}
              marginRight="8"
              marginBottom="8"
            >
              Join Pool
            </FxButton>
          )}
        </FxBox>

        {/* Members List */}
        <FxCard marginBottom="16">
          <FxCard.Title>Members ({poolMembers.length})</FxCard.Title>
          <FxSpacer marginTop="16" />
          {loading ? (
            <MyLoader />
          ) : poolMembers.length > 0 ? (
            poolMembers.map((member, index) => (
              <FxBox key={member} marginBottom="8">
                <FxText variant="bodySmallRegular">
                  {member.slice(0, 6)}...{member.slice(-4)}
                  {member === connectedAccount && ' (You)'}
                </FxText>
              </FxBox>
            ))
          ) : (
            <FxText variant="bodySmallRegular" color="content2">
              No members found
            </FxText>
          )}
        </FxCard>

        {/* Join Requests - placeholder for future implementation */}
        {userIsMember && (
          <FxCard>
            <FxCard.Title>Join Requests</FxCard.Title>
            <FxSpacer marginTop="16" />
            <FxText variant="bodySmallRegular" color="content2">
              Join request management coming soon
            </FxText>
          </FxCard>
        )}
      </Reanimated.ScrollView>
    </FxSafeAreaBox>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
});
