import React, { useRef } from 'react';
import Reanimated from 'react-native-reanimated';
import {
  FxBox,
  FxHeader,
  FxBottomSheetModalMethods,
} from '@functionland/component-library';

import { SmallHeaderText } from '../../../components/Text';

import { AddDAppModal, DAppSettingsModal } from './modals';
import useCallbackState from './../../../hooks/useCallbackState';
import {
  mockConnectedDAppsData,
  imageMap,
  DApps,
} from '../../../api/connectedDApps';
import { DAppCard } from './components';

export const ConnectedDAppsScreen = () => {
  const [isList, setIsList] = React.useState(false);
  const addDAppModalRef = useRef<FxBottomSheetModalMethods>(null);
  const dAppSettingsModalRef = useRef<FxBottomSheetModalMethods>(null);
  const clearDAppDataModalRef = useRef<FxBottomSheetModalMethods>(null);
  const [bloxIndex] = React.useState(0);
  const [selectedDAppKey, setSelectedDAppKey] = useCallbackState<DApps>(null);

  const blox = mockConnectedDAppsData[bloxIndex];

  const showDAppSettingsModal = (key: DApps) => {
    setSelectedDAppKey(key, () =>
      dAppSettingsModalRef.current?.present({ key, bloxIndex })
    );
  };

  return (
    <Reanimated.ScrollView>
      <FxBox marginHorizontal="20" marginVertical="20">
        <SmallHeaderText>Connected dApps</SmallHeaderText>
        <FxHeader
          marginTop="32"
          title={blox.name}
          isList={isList}
          setIsList={setIsList}
          onAddPress={() => addDAppModalRef.current?.present()}
        />
        {Object.entries(blox.data).map(([key, dApp]) => {
          return (
            dApp.isConnected && (
              <DAppCard
                key={key}
                isDetailed={!isList}
                imageSrc={imageMap[key]}
                data={dApp}
                onPress={() => showDAppSettingsModal(key as DApps)}
              />
            )
          );
        })}
      </FxBox>
      <AddDAppModal ref={addDAppModalRef} />
      <DAppSettingsModal
        onClearDataPress={() => clearDAppDataModalRef.current?.present()}
        dAppKey={selectedDAppKey}
        bloxIndex={bloxIndex}
        ref={dAppSettingsModalRef}
      />
    </Reanimated.ScrollView>
  );
};
