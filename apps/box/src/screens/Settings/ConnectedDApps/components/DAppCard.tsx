import React from 'react';
import { GestureResponderEvent, ImageSourcePropType } from 'react-native';
import {
  convertMegabyteToGigabyte,
  FxButton,
  FxCard,
  FxCardProps,
} from '@functionland/component-library';

import DAppHeader from './DAppHeader';
import { TDApp } from '../../../../models';

// Native JavaScript replacement for lodash pick
const pick = <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

type RowDetailsProps = {
  data: Pick<
    TDApp,
    'storageUsed' | 'lastUpdate' | 'name' | 'authorized' | 'bundleId'
  >;
};

type CardDetailsProps = Pick<RowDetailsProps, 'data'> & {
  data: Pick<TDApp, 'name'>;
  onPress: (event: GestureResponderEvent) => void;
};

type DAppCardProps = {
  data: TDApp;
  isDetailed?: boolean;
  imageSrc: ImageSourcePropType;
} & FxCardProps;

export const RowDetails = ({ data }: RowDetailsProps) => {
  return (
    <>
      <FxCard.Row marginTop="24">
        <FxCard.Row.Title>Bundle Id</FxCard.Row.Title>
        <FxCard.Row.Data>{data?.bundleId}</FxCard.Row.Data>
      </FxCard.Row>
      <FxCard.Row>
        <FxCard.Row.Title>Current use</FxCard.Row.Title>
        <FxCard.Row.Data>
          {convertMegabyteToGigabyte(data?.storageUsed || 0)} GB
        </FxCard.Row.Data>
      </FxCard.Row>
      <FxCard.Row>
        <FxCard.Row.Title>Last update</FxCard.Row.Title>
        <FxCard.Row.Data>{new Date(data?.lastUpdate).toDateString()}</FxCard.Row.Data>
      </FxCard.Row>
    </>
  );
};

const CardDetails = ({ data, onPress }: CardDetailsProps) => {
  return (
    <>
      <RowDetails data={data} />
      <FxButton
        marginTop="20"
        onPress={onPress}
      >{`${data.name} settings`}</FxButton>
    </>
  );
};

const DAppCard = ({
  data,
  isDetailed,
  imageSrc,
  onPress,
  ...props
}: DAppCardProps) => {
  if(!data)
    return null;
  return (
    <FxCard marginTop="16" {...props}>
      <DAppHeader imageSrc={imageSrc} name={data.name} tag={data.tag} />
      {isDetailed && (
        <CardDetails
          onPress={onPress}
          data={pick(data, [
            'storageUsed',
            'lastUpdate',
            'name',
            'bundleId',
            'authorized',
          ])}
        />
      )}
    </FxCard>
  );
};

export default DAppCard;
