import React from 'react';
import { FxBox, FxText } from '@functionland/component-library';
import { Dot } from './Dot';
import { PercentageInput } from './PercentageInput';

type TUsageRow = {
  color: string;
  type: string;
  usage: number;
  percentage: number;
  editable?: boolean;
};

export const UsageRow = ({
  color,
  type,
  usage,
  percentage,
  editable,
}: TUsageRow) => {
  return (
    <FxBox flexDirection="row">
      <FxBox flexDirection="row" flex={1} alignItems="center">
        <Dot color={color} removable={editable} />
        <FxText variant="bodyMediumRegular" color="content1" marginLeft="4">
          {type}
        </FxText>
        <FxText variant="bodyXSRegular" color="border" marginLeft="8">
          {`${usage} GB`}
        </FxText>
      </FxBox>
      <PercentageInput percentage={percentage} />
    </FxBox>
  );
};

type TPersonalUsageRow = {
  color: string;
  type: string;
  usage: number;
  editable?: boolean;
  onRemove?: VoidFunction;
};

export const PersonalUsageRow = ({
  color,
  type,
  usage,
  editable,
  onRemove,
}: TPersonalUsageRow) => {
  return (
    <FxBox flexDirection="row" alignItems="center" paddingVertical="8">
      <FxBox flexDirection="row" flex={1} alignItems="center">
        <Dot color={color} removable={editable} onRemove={onRemove} />
        <FxText variant="bodyMediumRegular" color="content1" marginLeft="4">
          {type}
        </FxText>
      </FxBox>
      <FxText variant="bodyMediumRegular" color="content1" marginLeft="8">
        {`${usage} GB`}
      </FxText>
    </FxBox>
  );
};
