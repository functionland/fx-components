import React, { useState } from 'react';
import { useSDK } from '@metamask/sdk-react';
import {
  FxBox,
  FxCard,
  FxRefreshIcon,
  FxText,
  useFxTheme,
  FxBottomSheetModal,
  FxButton,
  useToast,
  FxMoveIcon,
  FxTextInput,
  FxCopyIcon,
  FxPressableOpacity,
} from '@functionland/component-library';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { copyFromClipboard } from '../../utils/clipboard';
import { useFulaBalance, useFormattedFulaBalance } from '../../hooks/useFulaBalance';
import { useContractIntegration } from '../../hooks/useContractIntegration';

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
  const bottomSheetRef = React.useRef<BottomSheetModalMethods>(null);
  const { totalFula } = data;
  const { colors } = useFxTheme();
  const { queueToast } = useToast();
  const [wallet, setWallet] = useState<string>('');
  const chain = 'mumbai';

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
  const { sdk, connected, account, connecting } = useSDK();

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
    onRefreshPress?.();
  };

  // Use contract integration for blockchain operations
  const { contractService } = useContractIntegration();

  const handlePaste = async () => {
    const text = await copyFromClipboard();
    setWallet(text);
  };
  return (
    <FxCard
      {...rest}
      onLongPress={() => bottomSheetRef.current?.present()}
      delayLongPress={200}
    >
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
      <FxBottomSheetModal ref={bottomSheetRef} title="Token Transfer">
        <FxBox
          height={200}
          justifyContent="center"
          alignItems="center"
          paddingHorizontal="20"
        >
          <FxBox flexDirection="row" alignItems="center" paddingHorizontal="20">
            <FxBox borderWidth={1} flex={1} borderColor="content3">
              <FxText>
                {wallet && wallet !== ''
                  ? wallet
                  : 'Copy the wallet address and paste it here using the icon ->'}
              </FxText>
            </FxBox>
            <FxCopyIcon fill={colors.content3} onPress={handlePaste} />
          </FxBox>

          <FxText>
            Make sure all details are correct, Any wrong transfers cannot be
            retrieved
          </FxText>
          <FxButton
            onPress={() => {
              console.log({ totalFula, wallet, chain });
              if (wallet && totalFula && totalFula !== '0') {
                Alert.alert(
                  'Transfer to Mumbai wallet',
                  `Do you confirm that the destination wallet is a Mumbai wallet and totally owned by you?`,
                  [
                    {
                      text: 'Yes',
                      onPress: async () => {
                        try {
                          if (contractService) {
                            await contractService.transferFulaToken(wallet, totalFula);
                            console.log('transfer sent');
                            queueToast({
                              type: 'success',
                              title: 'Transfer Successful',
                              message:
                                'Tokens have been transferred to your wallet successfully.',
                            });
                            bottomSheetRef.current?.dismiss();
                          }
                        } catch (error) {
                          console.error('Transfer failed:', error);
                          queueToast({
                            type: 'error',
                            title: 'Transfer Failed',
                            message: 'Failed to transfer tokens. Please try again.',
                          });
                        }
                      },
                      style: 'destructive',
                    },
                    {
                      text: 'No',
                      style: 'cancel',
                    },
                  ]
                );
              }
            }}
            flexWrap="wrap"
            paddingHorizontal="16"
            iconLeft={<FxMoveIcon />}
          >
            Transfer
          </FxButton>
        </FxBox>
      </FxBottomSheetModal>
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
