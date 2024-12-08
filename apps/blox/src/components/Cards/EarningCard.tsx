import React, { useState } from 'react';
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
import { blockchain } from '@functionland/react-native-fula';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { copyFromClipboard } from '../../utils/clipboard';

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
        {loading ? (
          <ActivityIndicator />
        ) : (
          onRefreshPress && (
            <FxRefreshIcon fill={colors.content3} onPress={onRefreshPress} />
          )
        )}
      </FxBox>
      {totalFula !== undefined && (
        <FxCard.Row>
          <FxCard.Row.Title>Total fula</FxCard.Row.Title>
          <FxCard.Row.Data>
            <FxBox style={styles.totalFulaContainer}>
              {totalFula === 'NaN' ? (
                <FxText>0</FxText>
              ) : (
                <FxText style={styles.totalFula}>{totalFula}</FxText>
              )}
              <FxText style={styles.superscript}> (x10⁻¹⁸)</FxText>
            </FxBox>
          </FxCard.Row.Data>
        </FxCard.Row>
      )}
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
                      onPress: () => {
                        blockchain
                          .transferToFula(totalFula, wallet, chain)
                          .then(() => {
                            console.log('transfer sent');
                            queueToast({
                              type: 'success',
                              title: 'Request Sent',
                              message:
                                'You should see the tokens in your wallet in a few seconds. The amount shown in x(10 to -18)',
                            });
                          });
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
