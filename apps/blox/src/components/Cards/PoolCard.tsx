import React from 'react';
import {
  FxBox,
  FxButton,
  FxCard,
  FxPoolIcon,
  FxSpacer,
  FxTag,
  FxText,
} from '@functionland/component-library';
import { TPool } from '../../models';

type PoolCardType = React.ComponentProps<typeof FxCard> & {
  pool: TPool;
  isDetailed: boolean;
  isRequested: boolean;
  isJoined: boolean;
  numVotes: number;
  numVoters: number;
  leavePool: (poolID: number) => Promise<void>;
  // Undefined meaning we should not show it!
  joinPool?: (poolID: number) => Promise<void>;
  cancelJoinPool: (poolID: number) => Promise<void>;
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
  cancelJoinPool,
}: {
  pool: TPool;
  isDetailed?: boolean;
  isRequested: boolean;
  isJoined: boolean;
  numVotes: number;
  numVoters: number;
  leavePool: (poolID: number) => Promise<void>;
  joinPool?: (poolID: number) => Promise<void>;
  cancelJoinPool: (poolID: number) => Promise<void>;
}) => (
  <FxBox>
    <FxSpacer marginTop="24" />
    <FxCard.Row>
      <FxCard.Row.Title>Location</FxCard.Row.Title>
      <FxCard.Row.Data>{pool.region}</FxCard.Row.Data>
    </FxCard.Row>
    {isJoined && (
      <FxCard.Row>
        <FxCard.Row.Title>Status </FxCard.Row.Title>
        <FxCard.Row.Data>Joined</FxCard.Row.Data>
      </FxCard.Row>
    )}
    {isRequested && !isJoined && (
      <FxCard.Row>
        <FxCard.Row.Title>Status </FxCard.Row.Title>
        <FxCard.Row.Data>
          Requested (votes: {numVotes}/{numVoters})
        </FxCard.Row.Data>
      </FxCard.Row>
    )}
    {isDetailed && isJoined && (
      <FxButton
        onPress={() => leavePool(parseInt(pool.poolID, 10))}
        flexWrap="wrap"
        paddingHorizontal="16"
        iconLeft={<FxPoolIcon />}
      >
        Leave
      </FxButton>
    )}
    {isDetailed && isRequested && !isJoined && (
      <FxButton
        onPress={() => cancelJoinPool(parseInt(pool.poolID, 10))}
        flexWrap="wrap"
        paddingHorizontal="16"
        iconLeft={<FxPoolIcon />}
      >
        Cancel
      </FxButton>
    )}
    {isDetailed && !(isRequested && isJoined) && joinPool !== undefined && (
      <FxButton
        onPress={() => joinPool(parseInt(pool.poolID, 10))}
        flexWrap="wrap"
        paddingHorizontal="16"
        iconLeft={<FxPoolIcon />}
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
  cancelJoinPool,
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
          cancelJoinPool={cancelJoinPool}
        />
      )}
    </FxCard>
  );
};
