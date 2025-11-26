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
import { ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFulaBalance, useFormattedFulaBalance } from '../../hooks/useFulaBalance';
import { useClaimableTokens } from '../../hooks/useClaimableTokens';
import { useUserProfileStore } from '../../stores/useUserProfileStore';

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
  const { t } = useTranslation();

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

  // Get manual wallet address
  const manualSignatureWalletAddress = useUserProfileStore(
    (state) => state.manualSignatureWalletAddress
  );

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
    // Only try to connect MetaMask if no account is available (neither MetaMask nor manual signature)
    if (!account && !manualSignatureWalletAddress) {
      try {
        await sdk?.connect();
        queueToast({
          type: 'success',
          title: t('earningCard.walletConnected'),
          message: t('earningCard.walletConnectedMessage'),
        });
      } catch (e: any) {
        queueToast({
          type: 'error',
          title: t('earningCard.walletConnectionFailed'),
          message: typeof e === 'object' && 'message' in e ? e.message : t('earningCard.walletConnectionFailedMessage'),
        });
        return;
      }
    }
    refreshBalance();
    fetchClaimableTokens();
    onRefreshPress?.();
  };

  // Handler for opening claim web portal
  const handleOpenClaimPortal = async () => {
    try {
      await Linking.openURL('https://claim-web.fula.network');
    } catch (error: any) {
      queueToast({
        type: 'error',
        title: t('earningCard.claimFailed'),
        message: 'Unable to open claim portal',
      });
    }
  };

  return (
    <FxCard {...rest}>
      <FxBox flexDirection="row" justifyContent="space-between">
        <FxCard.Title marginBottom="8">{t('earningCard.title')}</FxCard.Title>
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
        <FxCard.Row.Title>{t('earningCard.totalInWallet', { tokenSymbol })}</FxCard.Row.Title>
        <FxCard.Row.Data>
          <FxBox style={styles.totalFulaContainer}>
            {balanceError ? (
              <FxText>{t('earningCard.errorLoadingBalance')}</FxText>
            ) : (
              <FxText style={styles.totalFula}>{formattedBalance}</FxText>
            )}
          </FxBox>
        </FxCard.Row.Data>
      </FxCard.Row>

      <FxCard.Row>
        <FxCard.Row.Title>{t('earningCard.claimableRewards')}</FxCard.Row.Title>
        <FxCard.Row.Data>
          <FxBox style={styles.totalFulaContainer}>
            {claimableError ? (
              <FxText>{t('earningCard.errorLoadingRewards')}</FxText>
            ) : (
              <FxText style={styles.totalFula}>
                {formattedTotalUnclaimed} {tokenSymbol}
              </FxText>
            )}
          </FxBox>
        </FxCard.Row.Data>
      </FxCard.Row>

      <FxCard.Row>
        <FxCard.Row.Title>{t('earningCard.miningRewards')}</FxCard.Row.Title>
        <FxCard.Row.Data>
          <FxBox style={styles.totalFulaContainer}>
            <FxText style={styles.totalFula}>
              {formattedUnclaimedMining} {tokenSymbol}
            </FxText>
          </FxBox>
        </FxCard.Row.Data>
      </FxCard.Row>

      <FxCard.Row>
        <FxCard.Row.Title>{t('earningCard.storageRewards')}</FxCard.Row.Title>
        <FxCard.Row.Data>
          <FxBox style={styles.totalFulaContainer}>
            <FxText style={styles.totalFula}>
              {formattedUnclaimedStorage} {tokenSymbol}
            </FxText>
          </FxBox>
        </FxCard.Row.Data>
      </FxCard.Row>

      <FxCard.Row>
        <FxCard.Row.Title>{t('earningCard.lastClaimed')}</FxCard.Row.Title>
        <FxCard.Row.Data>
          <FxBox style={styles.totalFulaContainer}>
            <FxText style={styles.totalFula}>
              {formattedTimeSinceLastClaim}
            </FxText>
          </FxBox>
        </FxCard.Row.Data>
      </FxCard.Row>

      {(account || manualSignatureWalletAddress) && (
        <FxBox marginTop="12">
          <FxButton
            onPress={handleOpenClaimPortal}
          >
            {t('earningCard.claimRewards')}
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
