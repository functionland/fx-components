import React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useWalletInfo } from '@reown/appkit-react-native';
import {
  FxBox,
  FxCard,
  FxRefreshIcon,
  FxText,
  useFxTheme,
  FxButton,
  useToast,
} from '@functionland/component-library';
import { ActivityIndicator, StyleSheet, Linking, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFulaBalance, useFormattedFulaBalance } from '../../hooks/useFulaBalance';
import { useClaimableTokens } from '../../hooks/useClaimableTokens';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useBloxsStore } from '../../stores/useBloxsStore';
import { copyToClipboard } from '../../utils/clipboard';

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

  // Wallet connection
  const { account, connecting, open, connected } = useWallet();
  const { walletInfo } = useWalletInfo();

  // Get manual wallet address
  const manualSignatureWalletAddress = useUserProfileStore(
    (state) => state.manualSignatureWalletAddress
  );

  // Get selected chain and current Blox peerId for claim portal
  const selectedChain = useSettingsStore((state) => state.selectedChain);
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);
  const bloxs = useBloxsStore((state) => state.bloxs);
  // Use ipfs-cluster peerID for claim portal URL
  const clusterPeerId = currentBloxPeerId
    ? (bloxs[currentBloxPeerId]?.clusterPeerId || currentBloxPeerId)
    : undefined;

  // Determine connected wallet address (connected wallet or manual signature, empty string if neither)
  const walletAddress = account || manualSignatureWalletAddress || '';
  const walletDisplay = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : '';

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
    // Only try to connect wallet if no account is available (neither wallet nor manual signature)
    if (!account && !manualSignatureWalletAddress) {
      try {
        await open({ view: 'Connect' });
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

  // Build the claim URL with network, peerId, and wallet parameters
  const buildClaimUrl = () => {
    const claimDomain = 'claim-web.fula.network';
    const params = new URLSearchParams();
    params.append('network', selectedChain);
    if (clusterPeerId) {
      params.append('peerId', clusterPeerId);
    }
    if (walletAddress) {
      params.append('wallet', walletAddress);
    }
    return { claimDomain, queryString: params.toString() };
  };

  // Build a deep link URL to open in the connected wallet's dApp browser
  const buildWalletDappLink = (fullUrl: string): string | null => {
    if (!connected || !walletInfo?.name) return null;
    const name = walletInfo.name.toLowerCase();
    if (name.includes('metamask')) {
      return `https://metamask.app.link/dapp/${fullUrl.replace(/^https?:\/\//, '')}`;
    }
    if (name.includes('trust')) {
      return `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(fullUrl)}`;
    }
    if (name.includes('coinbase')) {
      return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(fullUrl)}`;
    }
    return null;
  };

  // Check if we can open the claim URL in the wallet's dApp browser
  const canOpenInWallet = connected && walletInfo?.name && buildWalletDappLink('https://example.com') !== null;

  // Handler for opening claim web portal in wallet's dApp browser
  const handleOpenClaimPortal = async () => {
    try {
      const { claimDomain, queryString } = buildClaimUrl();
      const fullUrl = `https://${claimDomain}?${queryString}`;
      const walletLink = buildWalletDappLink(fullUrl);
      if (walletLink) {
        await Linking.openURL(walletLink);
      }
    } catch (error: any) {
      queueToast({
        type: 'error',
        title: t('earningCard.claimFailed'),
        message: 'Unable to open claim portal',
      });
    }
  };

  // Handler for copying claim link and prompting user to open in wallet browser
  const handleCopyClaimLink = () => {
    const { claimDomain, queryString } = buildClaimUrl();
    const claimLink = `https://${claimDomain}?${queryString}`;
    copyToClipboard(claimLink);
    Alert.alert(
      t('earningCard.linkCopied'),
      t('earningCard.openInWalletInstructions'),
      [{ text: t('earningCard.gotIt') }]
    );
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

      {walletDisplay ? (
        <FxCard.Row>
          <FxCard.Row.Title>{t('earningCard.wallet')}</FxCard.Row.Title>
          <FxCard.Row.Data>
            <FxText>{walletDisplay}</FxText>
          </FxCard.Row.Data>
        </FxCard.Row>
      ) : null}

      <FxBox marginTop="12">
        {canOpenInWallet && (
          <FxButton onPress={handleOpenClaimPortal}>
            {t('earningCard.claimRewards')}
          </FxButton>
        )}
        <FxButton
          variant="inverted"
          marginTop={canOpenInWallet ? "8" : "0"}
          onPress={handleCopyClaimLink}
        >
          {t('earningCard.copyClaimLink')}
        </FxButton>
      </FxBox>
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
