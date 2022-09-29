import React from 'react';
import { StyleSheet } from 'react-native';
import {
  FxBox,
  FxCard,
  FxHorizontalRule,
  FxVerticalRule,
  FxText,
} from '@functionland/component-library';
import { CardHeader } from './fields/CardHeader';

type EarningCardType = React.ComponentProps<typeof FxCard> & {
  totalFula: number;
};

export const EarningCard = ({ totalFula }: EarningCardType) => {
  return (
    <>
      <CardHeader>Earning</CardHeader>
      <FxCard padding="0">
        <FxBox alignItems="center">
          <FxText variant="bodySmallRegular" color="content3">
            Total Fula
          </FxText>
          <FxBox flexDirection="row" marginTop="16">
            <FxText style={styles.totalFulaText}>{totalFula}</FxText>
          </FxBox>
          <FxText variant="bodySmallRegular" color="content3">
            Home Blox Setup
          </FxText>
        </FxBox>
        <FxHorizontalRule marginTop="16" marginBottom="16" />
        <FxBox flexDirection="row">
          <FxBox flex={1} alignItems="center">
            <FxText variant="bodySmallRegular" color="content3">
              24h change
            </FxText>
            <FxText variant="bodyLargeRegular" marginTop="8">
              +10.342%
            </FxText>
          </FxBox>
          <FxVerticalRule />
          <FxBox flex={1} alignItems="center">
            <FxText variant="bodySmallRegular" color="content3">
              7d change
            </FxText>
            <FxText variant="bodyLargeRegular" marginTop="8">
              +18.721%
            </FxText>
          </FxBox>
        </FxBox>
      </FxCard>
    </>
  );
};

const styles = StyleSheet.create({
  totalFulaText: {
    fontSize: 40,
    lineHeight: 40,
    fontFamily: 'OpenSans-Regular',
  },
});
