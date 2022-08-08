import React from 'react';
import {
  convertMegabyteToGigabyte,
  FxBox,
  FxButton,
  FxCard,
  FxSpacer,
  FxTag,
  FxText,
} from '@functionland/component-library';
import { CardRow, CardRowData, CardRowTitle } from './fields/CardRow';
import { Image, StyleSheet } from 'react-native';
import { CopyIcon } from '../Icons';
import Clipboard from '@react-native-clipboard/clipboard';
import { CardCarousel } from './fields/CardCarousel';
import { Friend } from '../../api/users';
import { getUserUsageDetails } from '../../utils/users';

const USER_CARD_HEIGHT = 286;
type UserCardType = React.ComponentProps<typeof FxCard> & {
  data: Friend;
};
const UserCard = ({ data, ...rest }: UserCardType) => {
  const usageStats = getUserUsageDetails(data);

  const copyHandler = () => {
    Clipboard.setString(data.decentralizedId);
  };

  return (
    <FxCard {...rest}>
      <FxBox flexDirection="row" alignItems="center">
        <Image source={Number(data.imageUrl)} style={styles.image} />
        <FxSpacer marginLeft="16" />
        <FxBox>
          <FxText variant="bodyLargeRegular" color="content1">
            @{data.username}
          </FxText>
          <FxSpacer marginTop="8" />
          <FxBox flexDirection="row">
            <FxTag>Multi-Device</FxTag>
          </FxBox>
        </FxBox>
      </FxBox>
      <FxSpacer marginTop="24" />
      <CardRow>
        <CardRowTitle>Current Usage</CardRowTitle>
        <CardRowData>
          {convertMegabyteToGigabyte(usageStats.totalUsage)} GB
        </CardRowData>
      </CardRow>
      <CardRow>
        <CardRowTitle>Added</CardRowTitle>
        <CardRowData>{new Date(data.connectionDate).toISOString()}</CardRowData>
      </CardRow>
      <FxSpacer marginTop="12" />
      <FxButton onPress={copyHandler} iconLeft={<CopyIcon />}>
        {`DID: ${data.decentralizedId}`}
      </FxButton>
    </FxCard>
  );
};

const ENTRIES: number[] = [1, 2, 3, 4];

type UsersCardCarouselProps = {
  data: Friend[];
};
export const UsersCardCarousel = ({ data }: UsersCardCarouselProps) => {
  return (
    <FxBox>
      {data.length === 0 ? (
        <FxBox
          alignItems="center"
          borderColor="backgroundSecondary"
          borderRadius="s"
          borderStyle="dashed"
          borderWidth={1}
          height={USER_CARD_HEIGHT}
          justifyContent="center"
          paddingHorizontal="24"
        >
          <FxText
            color="content1"
            variant="bodyMediumRegular"
            textAlign="center"
          >
            No "connected devices"
          </FxText>
        </FxBox>
      ) : ENTRIES.length === 1 ? (
        <UserCard data={data[0]} />
      ) : (
        <CardCarousel
          data={data}
          renderItem={UserCard}
          height={USER_CARD_HEIGHT}
        />
      )}
    </FxBox>
  );
};

const styles = StyleSheet.create({
  image: {
    width: 64,
    height: 64,
  },
});
