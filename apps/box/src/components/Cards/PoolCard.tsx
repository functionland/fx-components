import React from 'react';
import {
  FxBox,
  FxButton,
  FxCard,
  FxSpacer,
  FxTag,
  FxText,
} from '@functionland/component-library';
import moment from 'moment';
import { TPool } from '../../models';

type PoolCardType = React.ComponentProps<typeof FxCard> & {
  pool: TPool;
  isDetailed?: boolean;
  isRequested: boolean;
  isJoined: boolean;
  numVotes: number;
  numVoters: number;
  leavePool: (poolID: number) => Promise<void>;
  joinPool: (poolID: number) => Promise<void>;
};

const DetailInfo = ({
  pool,
  isDetailed,
  isRequested,
  isJoined,
  numVotes,
  numVoters,
  leavePool,
  joinPool,
}: {
  pool: TPool;
  isDetailed?: boolean;
  isRequested: boolean;
  isJoined: boolean;
  numVotes: number;
  numVoters: number;
  leavePool: (poolID: number) => Promise<void>;
  joinPool: (poolID: number) => Promise<void>;
}) => (
  <FxBox>
    <FxSpacer marginTop="24" />
    <FxCard.Row>
      <FxCard.Row.Title>Location</FxCard.Row.Title>
      <FxCard.Row.Data>{pool.region}</FxCard.Row.Data>
    </FxCard.Row>
    <FxCard.Row>
      <FxCard.Row.Title>Join date</FxCard.Row.Title>
      <FxCard.Row.Data>
        {moment(pool.connectionDate).format('MM/DD/YYYY')}
      </FxCard.Row.Data>
    </FxCard.Row>
    <FxSpacer marginTop="24" />
    {isDetailed && isRequested && isJoined && (
      <FxButton
        onPress={() => leavePool(parseInt(pool.poolID, 10))}
        flexWrap="wrap"
      >
        Leave
      </FxButton>
    )}
    {isDetailed && !isRequested && !isJoined && (
      <FxButton
        onPress={() => joinPool(parseInt(pool.poolID, 10))}
        flexWrap="wrap"
      >
        Join
      </FxButton>
    )}
    {isDetailed && !isRequested && isJoined && (
      <FxCard.Row.Data>
        Voting status: {numVotes}/{numVoters}
      </FxCard.Row.Data>
    )}
  </FxBox>
);

export const PoolCard = ({
  pool,
  isDetailed,
  isRequested,
  isJoined,
  numVotes,
  numVoters,
  leavePool,
  joinPool,
  ...rest
}: PoolCardType) => {
  return (
    <FxCard marginTop="16" {...rest}>
      <FxBox flexDirection="row" alignItems="center">
        <FxBox>
          <FxCard.Title>{pool.name}</FxCard.Title>
          <FxText variant="bodyXSRegular">ID: {pool.poolID}</FxText>
          <FxSpacer marginTop="16" />
          <FxBox flexDirection="row">
            <FxTag>Home Blox Setup</FxTag>
          </FxBox>
        </FxBox>
      </FxBox>
      {isDetailed && (
        <DetailInfo
          pool={pool}
          isDetailed={isDetailed}
          isRequested={isRequested}
          isJoined={isJoined}
          numVotes={numVotes}
          numVoters={numVoters}
          leavePool={leavePool}
          joinPool={joinPool}
        />
      )}
    </FxCard>
  );
};
