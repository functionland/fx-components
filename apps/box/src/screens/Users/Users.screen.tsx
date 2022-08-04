import {
  FxBox,
  FxButton,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
} from '@functionland/component-library';
import React from 'react';
import { Image, ScrollView } from 'react-native';
import { CopyIcon } from '../../components';
import Clipboard from '@react-native-clipboard/clipboard';

export const UsersScreen = () => {
  return (
    <FxSafeAreaBox marginHorizontal="20" flex={1}>
      <ScrollView>
        <FxSpacer height={56} />
        <UserHeader />
      </ScrollView>
    </FxSafeAreaBox>
  );
};

const UserHeader = () => {
  const did = 'key:z6Mkhsmw8...';

  const copyHandler = () => {
    Clipboard.setString(did);
  };

  return (
    <FxBox alignItems="center">
      <Image source={require('./img/sample.png')} />
      <FxSpacer marginTop="16" />
      <FxText variant="bodyLargeRegular">@username</FxText>
      <FxSpacer marginTop="4" />
      <FxText variant="bodyXSRegular">Constant phrase: bluebird</FxText>
      <FxSpacer marginTop="4" />
      <FxText variant="bodyXSRegular">Connected wallet: TrustWallet</FxText>
      <FxSpacer marginTop="32" />
      <FxBox width="100%">
        <FxButton onPress={copyHandler} size="large" iconLeft={<CopyIcon />}>
          {`DID: ${did}`}
        </FxButton>
      </FxBox>
    </FxBox>
  );
};
