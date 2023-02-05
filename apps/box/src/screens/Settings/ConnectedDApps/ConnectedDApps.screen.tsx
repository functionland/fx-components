import React, { useEffect, useMemo, useRef, useState } from 'react';
import Reanimated from 'react-native-reanimated';
import {
  FxBox,
  FxHeader,
  FxBottomSheetModalMethods,
  useToast,
} from '@functionland/component-library';
import { SmallHeaderText } from '../../../components/Text';

import { AddDAppModal, DAppSettingsModal } from './modals';
import useCallbackState from './../../../hooks/useCallbackState';
import { mockConnectedDAppsData, imageMap } from '../../../api/connectedDApps';
import { DAppCard } from './components';
import { RouteProp } from '@react-navigation/native';
import { AddAppForm } from './modals/AddDAppModal';
import { useDAppsStore } from '../../../stores/dAppsSettingsStore';
import { TDApp } from '../../../models';
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
  const [selectedDApp, setSelectedDApp] = useCallbackState<TDApp>(null);
  const [addAppForm, setAddAppForm] = useState<AddAppForm | undefined>();
  const [connectedDApps, setAuth, addOrUpdateDApp] = useDAppsStore((state) => [
    state.connectedDApps,
    state.setAuth,
    state.addOrUpdateDApp,
  ]);
  const { queueToast } = useToast();

  const connectedDAppsArray = useMemo(
    () => Object.values(connectedDApps),
    [connectedDApps]
  );
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
  }, [route?.params]);
  const showDAppSettingsModal = (dApp: TDApp) => {
    setSelectedDApp(dApp, () => {
      dAppSettingsModalRef.current?.present({ dApp });
    });
  };
  const addAndAuthorize = async (dApp: AddAppForm) => {
    try {
      const result = await setAuth({
        peerId: dApp.peerId,
        allow: true,
      });
      console.log('setAuth result', result);
      addOrUpdateDApp({
        name: dApp.appName,
        peerId: dApp.peerId,
        bundleId: dApp.bundleId,
        authorized: true,
        lastUpdate: new Date(),
        storageUsed: 0,
      });
      addDAppModalRef.current?.close();
    } catch (error) {
      queueToast({
        type: 'error',
        title: 'error',
        message: error.toString(),
      });
    }
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
        {connectedDAppsArray.map((dApp) => {
          return (
            <DAppCard
              key={dApp.peerId}
              isDetailed={!isList}
              imageSrc={imageMap.fileSync}
              data={dApp}
              onPress={() => showDAppSettingsModal(dApp)}
            />
          );
        })}
      </FxBox>
      <AddDAppModal
        ref={addDAppModalRef}
        form={addAppForm}
        onSubmit={addAndAuthorize}
      />
      <DAppSettingsModal
        onClearDataPress={() => clearDAppDataModalRef.current?.present()}
        ref={dAppSettingsModalRef}
        dApp={selectedDApp}
      />
    </Reanimated.ScrollView>
  );
};
