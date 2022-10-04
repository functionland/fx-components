import React, { useState } from 'react';
import Reanimated from 'react-native-reanimated';
import { FxBox, FxHeader } from '@functionland/component-library';
import { PoolCard } from '../../components/Cards/PoolCard';
import { mockPoolData } from '../../api/pool';

export const PoolsScreen = () => {
  const [isList, setIsList] = useState<boolean>(false);

  return (
    <Reanimated.ScrollView nestedScrollEnabled={true}>
      <FxBox paddingHorizontal="20" paddingVertical="20">
        <FxHeader
          title="Pools"
          marginBottom="16"
          isList={isList}
          setIsList={setIsList}
        />
        <Reanimated.FlatList
          data={mockPoolData}
          keyExtractor={(item) => item.poolId}
          renderItem={({ item }) => (
            <PoolCard pool={item} isDetailed={!isList} />
          )}
        />
      </FxBox>
    </Reanimated.ScrollView>
  );
};
