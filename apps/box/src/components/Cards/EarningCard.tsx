import React from 'react';
import {
  FxBox,
  FxCard,
  FxRefreshIcon,
  FxText,
  useFxTheme,
} from '@functionland/component-library';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';

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
  return (
    <FxCard
      {...rest}
      onLongPress={() => bottomSheetRef.current?.present()}
      delayLongPress={200}
    >
      <FxBox flexDirection="row" justifyContent="space-between">
        <FxCard.Title marginBottom="8">Earning</FxCard.Title>
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
