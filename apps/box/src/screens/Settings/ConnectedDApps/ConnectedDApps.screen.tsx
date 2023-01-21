import React, { useEffect, useRef, useState } from 'react';
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
import { RouteProp } from '@react-navigation/native';
import { AddAppForm } from './modals/AddDAppModal';
interface Props {
  route: RouteProp<{
    params: { appName?: string; bundleId?: string; peerId?: string };
  }>;
}
export const ConnectedDAppsScreen = ({ route }: Props) => {
  const [isList, setIsList] = React.useState(false);
  const addDAppModalRef = useRef<FxBottomSheetModalMethods>(null);
  const dAppSettingsModalRef = useRef<FxBottomSheetModalMethods>(null);
  const clearDAppDataModalRef = useRef<FxBottomSheetModalMethods>(null);
  const [bloxIndex] = React.useState(0);
  const [selectedDAppKey, setSelectedDAppKey] = useCallbackState<DApps>(null);
  const [addAppForm, setAddAppForm] = useState<AddAppForm | undefined>();

  const blox = mockConnectedDAppsData[bloxIndex];
  useEffect(() => {
    if (route?.params?.appName) {
      setAddAppForm({
        appName: route?.params?.appName,
        bundleId: route?.params?.bundleId,
        peerId: route?.params?.peerId,
      });
      addDAppModalRef.current?.present();
    }
  }, []);
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
          marginBottom="16"
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
      <AddDAppModal ref={addDAppModalRef} form={addAppForm} />
      <DAppSettingsModal
        onClearDataPress={() => clearDAppDataModalRef.current?.present()}
        dAppKey={selectedDAppKey}
        bloxIndex={bloxIndex}
        ref={dAppSettingsModalRef}
      />
    </Reanimated.ScrollView>
  );
};
