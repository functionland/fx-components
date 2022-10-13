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
};

const DetailInfo = ({ pool }: { pool: TPool }) => (
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
    <FxButton>Change pool</FxButton>
  </FxBox>
);

export const PoolCard = ({ pool, isDetailed, ...rest }: PoolCardType) => {
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
      {isDetailed && <DetailInfo pool={pool} />}
    </FxCard>
  );
};
