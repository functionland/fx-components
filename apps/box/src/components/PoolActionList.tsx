import React from 'react';
import {
  FxBox,
  FxButton,
  FxCard,
  FxText,
  FxPoolIcon,
} from '@functionland/component-library';
import { usePools } from '../hooks/usePools';
import { useSettingsStore } from '../stores/useSettingsStore';
import { CHAIN_DISPLAY_NAMES } from '../contracts/config';

interface PoolActionListProps {
  onNavigateToPools?: () => void;
  onJoinPool?: () => void;
  onManagePool?: () => void;
}

export const PoolActionList: React.FC<PoolActionListProps> = ({
  onNavigateToPools,
  onJoinPool,
  onManagePool,
}) => {
  const {
    userIsMemberOfAnyPool,
    userMemberPools,
    userActiveRequests,
    pools,
    isReady,
    connectedAccount,
  } = usePools();

  const selectedChain = useSettingsStore((state) => state.selectedChain);

  if (!isReady || !connectedAccount) {
    return (
      <FxCard marginTop="16">
        <FxCard.Title>Pool Actions</FxCard.Title>
        <FxText variant="bodySmallRegular" color="content2" marginTop="8">
          Connect your wallet to see pool actions
        </FxText>
        <FxButton
          marginTop="16"
          onPress={onNavigateToPools}
          iconLeft={<FxPoolIcon />}
        >
          View Pools
        </FxButton>
      </FxCard>
    );
  }

  const activePools = pools.filter(pool => 
    userMemberPools.includes(pool.poolID)
  );

  const pendingRequests = pools.filter(pool => 
    userActiveRequests.includes(pool.poolID)
  );

  return (
    <FxCard marginTop="16">
      <FxCard.Title>Pool Actions</FxCard.Title>
      
      {/* Network Status */}
      <FxBox flexDirection="row" alignItems="center" marginTop="8" marginBottom="16">
        <FxBox
          width="8"
          height="8"
          borderRadius="s"
          backgroundColor={isReady ? 'greenBase' : 'errorBase'}
          marginRight="8"
        />
        <FxText variant="bodyXSRegular" color="content2">
          {CHAIN_DISPLAY_NAMES[selectedChain]}
        </FxText>
      </FxBox>

      {/* User Status */}
      {userIsMemberOfAnyPool ? (
        <FxBox>
          <FxText variant="bodySmallRegular" color="content1" marginBottom="8">
            You are a member of {activePools.length} pool{activePools.length !== 1 ? 's' : ''}
          </FxText>
          {activePools.slice(0, 2).map(pool => (
            <FxBox key={pool.poolID} marginBottom="4">
              <FxText variant="bodyXSRegular" color="content2">
                • {pool.name} (ID: {pool.poolID})
              </FxText>
            </FxBox>
          ))}
          {activePools.length > 2 && (
            <FxText variant="bodyXSRegular" color="content2" marginBottom="8">
              ... and {activePools.length - 2} more
            </FxText>
          )}
        </FxBox>
      ) : pendingRequests.length > 0 ? (
        <FxBox>
          <FxText variant="bodySmallRegular" color="content1" marginBottom="8">
            You have {pendingRequests.length} pending join request{pendingRequests.length !== 1 ? 's' : ''}
          </FxText>
          {pendingRequests.slice(0, 2).map(pool => (
            <FxBox key={pool.poolID} marginBottom="4">
              <FxText variant="bodyXSRegular" color="content2">
                • {pool.name} (ID: {pool.poolID})
              </FxText>
            </FxBox>
          ))}
        </FxBox>
      ) : (
        <FxText variant="bodySmallRegular" color="content2" marginBottom="16">
          You are not a member of any pools
        </FxText>
      )}

      {/* Action Buttons */}
      <FxBox flexDirection="row" flexWrap="wrap" marginTop="16">
        {userIsMemberOfAnyPool ? (
          <>
            <FxButton
              marginRight="8"
              marginBottom="8"
              onPress={onManagePool}
              iconLeft={<FxPoolIcon />}
              variant="inverted"
            >
              Manage Pools
            </FxButton>
            <FxButton
              marginBottom="8"
              onPress={onNavigateToPools}
              variant="inverted"
            >
              View All Pools
            </FxButton>
          </>
        ) : (
          <>
            <FxButton
              marginRight="8"
              marginBottom="8"
              onPress={onJoinPool}
              iconLeft={<FxPoolIcon />}
            >
              Join a Pool
            </FxButton>
            <FxButton
              marginBottom="8"
              onPress={onNavigateToPools}
              variant="inverted"
            >
              Browse Pools
            </FxButton>
          </>
        )}
      </FxBox>
    </FxCard>
  );
};
