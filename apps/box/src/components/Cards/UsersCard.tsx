import React from 'react';
import {
  convertMegabyteToGigabyte,
  FxBox,
  FxButton,
  FxCard,
  FxSpacer,
  FxTag,
} from '@functionland/component-library';
import { Image, StyleSheet } from 'react-native';
import moment from 'moment';
import { CardHeader } from './fields/CardHeader';
import { CopyIcon } from '../Icons';
import { CardCarousel } from './fields/CardCarousel';
import { EmptyCard } from './EmptyCard';
import { TFriend } from '../../api/users';
import { getUserUsageDetails } from '../../utils/users';
import { copyToClipboard } from '../../utils/clipboard';

const USER_CARD_HEIGHT = 286;
type UserCardType = React.ComponentProps<typeof FxCard> & {
  data: TFriend;
};
const UserCard = ({ data, ...rest }: UserCardType) => {
  const usageStats = getUserUsageDetails(data);

  return (
    <FxCard {...rest}>
      <FxBox flexDirection="row" alignItems="center">
        <Image source={Number(data.imageUrl)} style={styles.image} />
        <FxSpacer marginLeft="16" />
        <FxBox>
          <FxCard.Title>@{data.username}</FxCard.Title>
          <FxSpacer marginTop="8" />
          <FxBox flexDirection="row">
            <FxTag>Multi-Device</FxTag>
          </FxBox>
        </FxBox>
      </FxBox>
      <FxSpacer marginTop="24" />
      <FxCard.Row>
        <FxCard.Row.Title>Current Usage</FxCard.Row.Title>
        <FxCard.Row.Data>
          {convertMegabyteToGigabyte(usageStats.totalUsage)} GB
        </FxCard.Row.Data>
      </FxCard.Row>
      <FxCard.Row>
        <FxCard.Row.Title>Added</FxCard.Row.Title>
        <FxCard.Row.Data>
          {moment(data.connectionDate).format('MM/DD/YYYY')}
        </FxCard.Row.Data>
      </FxCard.Row>
      <FxSpacer marginTop="12" />
      <FxButton
        onPress={() => copyToClipboard(data.decentralizedId)}
        iconLeft={<CopyIcon />}
      >
        {`DID: ${data.decentralizedId}`}
      </FxButton>
    </FxCard>
  );
};

type TUsersCard = {
  showCardHeader?: boolean;
  data: TFriend[];
};
export const UsersCard = ({ showCardHeader = true, data }: TUsersCard) => {
  return (
    <>
      {showCardHeader && <CardHeader>Friends</CardHeader>}
      {data.length === 0 ? (
        <EmptyCard
          placeholder="No friends added"
          
          addButtonTitle="Add friends"
        />
      ) : (
        <CardCarousel
          data={data}
          renderItem={UserCard}
          height={USER_CARD_HEIGHT}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  image: {
    width: 64,
    height: 64,
  },
});
