import React from 'react';
import { CopyIcon } from '../../components';
import { TUser } from '../../api/users';
import {
  FxAvatar,
  FxBox,
  FxButton,
  FxSpacer,
  FxText,
} from '@functionland/component-library';
import { copyToClipboard } from '../../utils/clipboard';
import { WalletDetails } from '../../components/WalletDetails';

type UserHeaderProps = {
  userData: TUser;
};
export const UserHeader = ({ userData }: UserHeaderProps) => {
  return (
    <FxBox alignItems="center">
      <FxAvatar source={Number(userData.imageUrl)} size="xl" />
      {/* <FxSpacer marginTop="16" />
      <FxText variant="bodyLargeRegular">@{userData.username}</FxText>
      <FxSpacer marginTop="4" /> */}
      {/* <FxText variant="bodyXSRegular">
        Constant phrase: {userData.securityPassphrase}
      </FxText>
      <FxSpacer marginTop="4" />
      <FxText variant="bodyXSRegular">
        Connected wallet: {userData.walletName}
      </FxText> */}
      <FxBox paddingVertical="20">
        <WalletDetails
          showDID={true}
          showNetwork={false}
          showBloxAccount={true}
          showPeerId={true}
          showBloxPeerIds={false}
        />
      </FxBox>
      {/* <FxBox width="100%">
        <FxButton
          onPress={() => copyToClipboard(userData.decentralizedId)}
          size="large"
          iconLeft={<CopyIcon />}
        >
          {`DID: ${userData.decentralizedId}`}
        </FxButton>
      </FxBox> */}
    </FxBox>
  );
};
