import React from 'react';
import { useSDK } from '@metamask/sdk-react';
import {
  FxBox,
  FxCard,
  FxRefreshIcon,
  FxText,
  useFxTheme,
  FxButton,
  useToast,
} from '@functionland/component-library';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useFulaBalance, useFormattedFulaBalance } from '../../hooks/useFulaBalance';
import { useClaimableTokens } from '../../hooks/useClaimableTokens';

type EarningCardProps = React.ComponentProps<typeof FxBox> & {
  data: { totalFula: string };
  loading?: boolean;
  onRefreshPress?: () => void;
};
export const EarningCard = ({
  data,
  loading,
  onRefreshPress,
  ...rest
}: EarningCardProps) => {
  const { colors } = useFxTheme();
  const { queueToast } = useToast();

  // Use the formatted balance hook to get balance data
  const balanceData = useFormattedFulaBalance();
  const {
    formattedBalance,
    loading: balanceLoading,
    tokenSymbol,
    error: balanceError
  } = balanceData;

  // Get refresh function from the base hook
  const { refreshBalance } = useFulaBalance();

  // MetaMask SDK for wallet connection
  const { sdk, account, connecting } = useSDK();

  // Use claimable rewards hook
  const {
    totalUnclaimed,
    unclaimedMining,
    unclaimedStorage,
    lastClaimedTimestamp,
    timeSinceLastClaim,
    loading: claimableLoading,
    error: claimableError,
    canClaim,
    claimTokens,
    formattedTotalUnclaimed,
    formattedUnclaimedMining,
    formattedUnclaimedStorage,
    formattedTimeSinceLastClaim,
    fetchClaimableTokens,
  } = useClaimableTokens();

  // Handler for refresh icon click
  const handleRefresh = async () => {
    if (!account) {
      try {
        await sdk?.connect();
        queueToast({
          type: 'success',
          title: 'Wallet Connected',
          message: 'MetaMask wallet connected successfully',
        });
      } catch (e: any) {
        queueToast({
          type: 'error',
          title: 'Wallet Connection Failed',
          message: typeof e === 'object' && 'message' in e ? e.message : 'Failed to connect wallet',
        });
        return;
      }
    }
    refreshBalance();
    fetchClaimableTokens();
    onRefreshPress?.();
  };

  // Handler for claiming tokens
  const handleClaimTokens = async () => {
    try {
      await claimTokens();
      queueToast({
        type: 'success',
        title: 'Rewards Claimed',
        message: `Successfully claimed ${formattedTotalUnclaimed} tokens`,
      });
      // Refresh balance after claiming
      refreshBalance();
    } catch (error: any) {
      queueToast({
        type: 'error',
        title: 'Claim Failed',
        message: typeof error === 'object' && 'message' in error ? error.message : 'Failed to claim tokens',
      });
    }
  };

  return (
    <FxCard {...rest}>
      <FxBox flexDirection="row" justifyContent="space-between">
        <FxCard.Title marginBottom="8">Rewards</FxCard.Title>
        {(loading || balanceLoading) ? (
          <ActivityIndicator />
        ) : (
          <FxRefreshIcon
            fill={colors.content3}
            onPress={handleRefresh}
            disabled={!!connecting}
          />
        )}
      </FxBox>
      <FxCard.Row>
        <FxCard.Row.Title>Total {tokenSymbol}</FxCard.Row.Title>
        <FxCard.Row.Data>
          <FxBox style={styles.totalFulaContainer}>
            {balanceError ? (
              <FxText>Error loading balance</FxText>
            ) : (
              <FxText style={styles.totalFula}>{formattedBalance}</FxText>
            )}
          </FxBox>
        </FxCard.Row.Data>
      </FxCard.Row>

      <FxCard.Row>
        <FxCard.Row.Title>Claimable Rewards</FxCard.Row.Title>
        <FxCard.Row.Data>
          <FxBox style={styles.totalFulaContainer}>
            {claimableError ? (
              <FxText>Error loading rewards</FxText>
            ) : (
              <FxText style={styles.totalFula}>
                {formattedTotalUnclaimed} {tokenSymbol}
              </FxText>
            )}
          </FxBox>
        </FxCard.Row.Data>
      </FxCard.Row>

      <FxCard.Row>
        <FxCard.Row.Title>Mining Rewards</FxCard.Row.Title>
        <FxCard.Row.Data>
          <FxBox style={styles.totalFulaContainer}>
            <FxText style={styles.totalFula}>
              {formattedUnclaimedMining} {tokenSymbol}
            </FxText>
          </FxBox>
        </FxCard.Row.Data>
      </FxCard.Row>

      <FxCard.Row>
        <FxCard.Row.Title>Storage Rewards</FxCard.Row.Title>
        <FxCard.Row.Data>
          <FxBox style={styles.totalFulaContainer}>
            <FxText style={styles.totalFula}>
              {formattedUnclaimedStorage} {tokenSymbol}
            </FxText>
          </FxBox>
        </FxCard.Row.Data>
      </FxCard.Row>

      <FxCard.Row>
        <FxCard.Row.Title>Last Claimed</FxCard.Row.Title>
        <FxCard.Row.Data>
          <FxBox style={styles.totalFulaContainer}>
            <FxText style={styles.totalFula}>
              {formattedTimeSinceLastClaim}
            </FxText>
          </FxBox>
        </FxCard.Row.Data>
      </FxCard.Row>

      {canClaim && (
        <FxBox marginTop="12">
          <FxButton
            onPress={handleClaimTokens}
            disabled={claimableLoading || !canClaim}
          >
            {claimableLoading ? 'Claiming...' : 'Claim Rewards'}
          </FxButton>
        </FxBox>
      )}
    </FxCard>
  );
};

const styles = StyleSheet.create({
  totalFulaContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalFula: {},
  superscript: {
    fontSize: 10, // Smaller font size for superscript notation
  },
});
