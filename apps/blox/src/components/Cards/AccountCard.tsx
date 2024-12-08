import {
  FxBox,
  FxCard,
  FxCardProps,
  FxSpacer,
  FxTag,
  FxText,
} from '@functionland/component-library';
import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { TAccount } from '../../models/account';

type UserCardCondensedProps = FxCardProps & {
  accountData: TAccount;
};
export const AccountCard = ({
  accountData,
  ...rest
}: UserCardCondensedProps) => {
  return (
    <FxCard paddingHorizontal="16" paddingVertical="16" {...rest}>
      <FxBox flexDirection="row" alignItems="center">
        <Image
          source={Number(require('../../api/mockAssets/sample.png'))}
          style={styles.image}
        />
        <FxSpacer marginLeft="20" />
        <FxBox>
          <FxText variant="bodyLargeRegular" color="content1">
            @{accountData.account}
          </FxText>
        </FxBox>
      </FxBox>
    </FxCard>
  );
};

const styles = StyleSheet.create({
  image: {
    width: 64,
    height: 64,
  },
});
