import {
  FxBox,
  FxSafeAreaBox,
  FxSpacer,
  FxTabs,
  FxText,
} from '@functionland/component-library';
import React from 'react';

const TAB_ITEMS = ['first', 'second'];

export const TabsDemoScreen = () => {
  const [selectedIdx, setSelectedIdx] = React.useState<number>(0);

  const selectHandler = (idx: number) => {
    setSelectedIdx(idx);
  };

  return (
    <FxSafeAreaBox marginHorizontal="20" flex={1}>
      <FxText variant="h200">Tabs Demo</FxText>
      <FxSpacer marginTop="16" />
      <FxTabs
        items={TAB_ITEMS}
        selectedIdx={selectedIdx}
        onSelect={selectHandler}
      />
      <FxBox alignItems="center" justifyContent="center" flex={1}>
        <FxText variant="h300">{TAB_ITEMS[selectedIdx]}</FxText>
      </FxBox>
    </FxSafeAreaBox>
  );
};
