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
import { TPool } from '../../api/pool';

type PoolCardType = React.ComponentProps<typeof FxCard> & {
  pool: TPool;
  isDetailed?: boolean;
  isRequested: boolean;
  isJoined: boolean;
  leavePool: ({ poolID }: { poolID: number }) => Promise<void>;
  joinPool: ({ poolID }: { poolID: number }) => Promise<void>;
};

const DetailInfo = ({
  pool,
  isDetailed,
  isRequested,
  isJoined,
  leavePool,
  joinPool,
}: {
  pool: TPool;
  isDetailed?: boolean;
  isRequested: boolean;
  isJoined: boolean;
  leavePool: ({ poolID }: { poolID: number }) => Promise<void>;
  joinPool: ({ poolID }: { poolID: number }) => Promise<void>;
}) => (
  <FxBox>
    <FxSpacer marginTop="24" />
    <FxCard.Row>
      <FxCard.Row.Title>Location</FxCard.Row.Title>
      <FxCard.Row.Data>{pool.location}</FxCard.Row.Data>
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
        onPress={() => leavePool({ poolID: parseInt(pool.poolId, 10) })}
        flexWrap="wrap"
      >
        Leave
      </FxButton>
    )}
    {isDetailed && !isRequested && !isJoined && (
      <FxButton
        onPress={() => joinPool({ poolID: parseInt(pool.poolId, 10) })}
        flexWrap="wrap"
      >
        Join
      </FxButton>
    )}
    {isDetailed && !isRequested && isJoined && (
      <FxButton>Check status...</FxButton>
    )}
  </FxBox>
);

export const PoolCard = ({
  pool,
  isDetailed,
  isRequested,
  isJoined,
  leavePool,
  joinPool,
  ...rest
}: PoolCardType) => {
  return (
    <FxCard marginTop="16" {...rest}>
      <FxBox flexDirection="row" alignItems="center">
        <FxBox>
          <FxCard.Title>{pool.poolId}</FxCard.Title>
          <FxText variant="bodyXSRegular">Public</FxText>
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
          leavePool={leavePool}
          joinPool={joinPool}
        />
      )}
    </FxCard>
  );
};
