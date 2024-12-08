import {
  FxBox,
  FxButtonGroup,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
} from '@functionland/component-library';
import { HeaderText, SubHeaderText } from '../../../components/Text';
import React from 'react';

const ITEMS = ['first', 'second', 'third', 'fourth'];

export const ButtonGroupDemoScreen = () => {
  const [enabledSelIdx, setEnabledSelIdx] = React.useState<number>(0);
  const buttonGroupSelect = (idx: number) => {
    setEnabledSelIdx(idx);
  };

  return (
    <FxSafeAreaBox marginHorizontal="20" flex={1}>
      <HeaderText>Button Groups</HeaderText>
      <FxSpacer marginTop="16" />
      <SubHeaderText>Disabled</SubHeaderText>
      <FxButtonGroup
        items={ITEMS}
        selectedIdx={0}
        onSelect={() => null}
        disabled={true}
      />
      <FxSpacer marginTop="16" />
      <SubHeaderText>Enabled</SubHeaderText>
      <FxButtonGroup
        items={ITEMS}
        selectedIdx={enabledSelIdx}
        onSelect={buttonGroupSelect}
      />
      <FxBox alignItems="center" justifyContent="center" flex={1}>
        <FxText variant="h300">{ITEMS[enabledSelIdx]}</FxText>
      </FxBox>
    </FxSafeAreaBox>
  );
};
