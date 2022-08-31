import {
  FxBox,
  FxSafeAreaBox,
  FxSpacer,
  FxTabs,
  FxText,
} from '@functionland/component-library';
import { HeaderText, SubHeaderText } from '../../../components/Text';
import React from 'react';

const TAB_ITEMS = ['first', 'second', 'third', 'fourth'];

export const TabsDemoScreen = () => {
  const [fixedIdx, setFixedIdx] = React.useState<number>(2);
  const [autoIdx, setAutoIdx] = React.useState<number>(0);

  return (
    <FxSafeAreaBox marginHorizontal="20" flex={1}>
      <HeaderText>Tabs Demo</HeaderText>
      <FxSpacer marginTop="16" />
      <FxBox flex={1}>
        <SubHeaderText>Fixed width tabs</SubHeaderText>
        <FxTabs
          items={TAB_ITEMS}
          selectedIdx={fixedIdx}
          onSelect={(idx) => setFixedIdx(idx)}
          animate={true}
          variant="fixed"
        />
        <FxBox alignItems="center" justifyContent="center" flex={1}>
          <FxText variant="h300">{TAB_ITEMS[fixedIdx]}</FxText>
        </FxBox>
      </FxBox>
      <FxBox flex={1}>
        <SubHeaderText>Auto width tabs</SubHeaderText>
        <FxTabs
          items={TAB_ITEMS}
          selectedIdx={autoIdx}
          onSelect={(idx) => setAutoIdx(idx)}
          animate={true}
          variant="auto"
        />
        <FxBox alignItems="center" justifyContent="center" flex={1}>
          <FxText variant="h300">{TAB_ITEMS[autoIdx]}</FxText>
        </FxBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};
