import React from 'react';
import { CopyIcon } from '../../components';
import { User } from '../../api/users';
import {
  FxBox,
  FxButton,
  FxSpacer,
  FxText,
} from '@functionland/component-library';
import { Image } from 'react-native';
import { copyToClipboard } from '../../utils/clipboard';

type UserHeaderProps = {
  userData: User;
};
export const UserHeader = ({ userData }: UserHeaderProps) => {
  return (
    <FxBox alignItems="center">
      <Image source={Number(userData.imageUrl)} />
      <FxSpacer marginTop="16" />
      <FxText variant="bodyLargeRegular">@{userData.username}</FxText>
      <FxSpacer marginTop="4" />
      <FxText variant="bodyXSRegular">
        Constant phrase: {userData.securityPassphrase}
      </FxText>
      <FxSpacer marginTop="4" />
      <FxText variant="bodyXSRegular">
        Connected wallet: {userData.walletName}
      </FxText>
      <FxSpacer marginTop="32" />
      <FxBox width="100%">
        <FxButton
          onPress={() => copyToClipboard(userData.decentralizedId)}
          size="large"
          iconLeft={<CopyIcon />}
        >
          {`DID: ${userData.decentralizedId}`}
        </FxButton>
      </FxBox>
    </FxBox>
  );
};
