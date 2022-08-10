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
import { Friend } from '../../api/users';

type UserCardCondensedProps = FxCardProps & {
  userData: Friend;
};
export const UserCardCondensed = ({
  userData,
  ...rest
}: UserCardCondensedProps) => {
  return (
    <FxCard paddingLeft="32" {...rest}>
      <FxBox flexDirection="row" alignItems="center">
        <Image source={Number(userData.imageUrl)} style={styles.image} />
        <FxSpacer marginLeft="20" />
        <FxBox>
          <FxText variant="bodyLargeRegular" color="content1">
            @{userData.username}
          </FxText>
          <FxText variant="bodyXSRegular" color="content1">
            Normal Use
          </FxText>
          <FxSpacer marginTop="8" />
          <FxBox flexDirection="row">
            <FxTag alignSelf={null}>Multi-System</FxTag>
          </FxBox>
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
