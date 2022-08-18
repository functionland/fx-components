import {
  FxBox,
  FxReText,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
} from '@functionland/component-library';
import { UsageBar, UsageBarUsage } from '../../../components';
import { HeaderText } from '../../../components/Text';
import React from 'react';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

const poolUsage: UsageBarUsage[] = [{ usage: 15000, color: 'pink' }];
const personalUsage: UsageBarUsage[] = [
  { usage: 10000, color: 'pink' },
  { usage: 20000, color: 'yellow' },
];

export const UsageBarDemo = () => {
  const [editing, setEditing] = React.useState<boolean>(false);
  const divisionPercent = useSharedValue<number>(50);
  const divisionText = useDerivedValue<string>(
    () => `${Math.floor(divisionPercent.value + 0.5)}`
  );

  return (
    <FxSafeAreaBox marginHorizontal="20" flex={1}>
      <HeaderText>Usage Bar</HeaderText>
      <FxSpacer marginTop="8" />
      <UsageBar
        isEditable={true}
        divisionPercent={divisionPercent}
        usages={[poolUsage, personalUsage]}
        totalCapacity={100000}
        onEditStart={() => setEditing(true)}
        onEditEnd={() => setEditing(false)}
      />
      <FxBox flex={1} alignItems="center" justifyContent="center">
        <FxText variant="h200" color="content1">
          Pool Split -- Editing {`${editing}`}
        </FxText>
        <FxReText variant="h400" color="content1" text={divisionText} />
      </FxBox>
    </FxSafeAreaBox>
  );
};
