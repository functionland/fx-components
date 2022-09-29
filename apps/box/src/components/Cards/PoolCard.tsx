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
import { CardHeader } from './fields/CardHeader';
import { Pool } from '../../api/pool';

type PoolCardType = React.ComponentProps<typeof FxCard> & {
  pool: Pool;
};
export const PoolCard = ({ pool, ...rest }: PoolCardType) => {
  return (
    <>
      <CardHeader>Pool</CardHeader>
      <FxCard {...rest}>
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
      </FxCard>
    </>
  );
};
