import {
  FxBox,
  FxButtonGroup,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
} from '@functionland/component-library';
import { HeaderText } from '../../../components/Text';
import React from 'react';

const ITEMS = ['first', 'second', 'third', 'fourth'];

export const ButtonGroupDemoScreen = () => {
  const [selectedIdx, setSelectedIdx] = React.useState<number>(0);
  const buttonGroupSelect = (idx: number) => {
    setSelectedIdx(idx);
  };

  return (
    <FxSafeAreaBox marginHorizontal="20" flex={1}>
      <HeaderText>Button Groups</HeaderText>
      <FxSpacer marginTop="16" />
      <FxButtonGroup
        items={ITEMS}
        selectedIdx={selectedIdx}
        onSelect={buttonGroupSelect}
      />
      <FxBox alignItems="center" justifyContent="center" flex={1}>
        <FxText variant="h300">{ITEMS[selectedIdx]}</FxText>
      </FxBox>
    </FxSafeAreaBox>
  );
};
