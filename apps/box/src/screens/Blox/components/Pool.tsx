import React from 'react';
import { CardHeader } from '../../../components/Cards/fields/CardHeader';
import { PoolCard } from '../../../components/Cards/PoolCard';
import { EmptyCard } from '../../../components/Cards/EmptyCard';
import { TPool } from '../../../api/pool';

type TPoolProps = {
  pool: TPool | undefined | null;
};

export const Pool = ({ pool }: TPoolProps) => {
  return (
    <>
      <CardHeader>Pool</CardHeader>
      {pool ? (
        <PoolCard
          pool={pool}
          marginTop="0"
          isDetailed={true}
          isRequested={false}
          isJoined={false}
          numVotes={0}
          numVoters={0}
          leavePool={async () => {}}
          cancelJoinPool={async () => {}}
        />
      ) : (
        <EmptyCard
          placeholder="This device isn’t joined to a pool"
          showAddButton
          addButtonTitle="Join pool (auto)"
        />
      )}
    </>
  );
};
