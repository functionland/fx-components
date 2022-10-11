import React from 'react';
import { CardHeader } from '../../../components/Cards/fields/CardHeader';
import { PoolCard } from '../../../components/Cards/PoolCard';
import { TPool } from '../../../api/pool';

type TPoolProps = {
  pool: TPool;
};

export const Pool = ({ pool }: TPoolProps) => {
  return (
    <>
      <CardHeader>Pool</CardHeader>
      <PoolCard pool={pool} marginTop="0" isDetailed />
    </>
  );
};
