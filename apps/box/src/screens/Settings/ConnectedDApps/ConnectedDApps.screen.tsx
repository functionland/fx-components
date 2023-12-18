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
import { DAppCard } from './components';
import { AddAppForm } from './modals/AddDAppModal';
import { useDAppsStore } from '../../../stores/dAppsSettingsStore';
import { TDApp } from '../../../models';
import { useBloxsStore } from 'apps/box/src/stores';
import { shallow } from 'zustand/shallow';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Routes,
  SettingsStackParamList,
} from 'apps/box/src/navigation/navigationConfig';
import { useLogger } from 'apps/box/src/hooks';
import { Alert, Linking } from 'react-native';
import { imageMap } from 'apps/box/src/api/connectedDApps';

type Props = NativeStackScreenProps<
  SettingsStackParamList,
  Routes.ConnectedDApps
>;
export const ConnectedDAppsScreen = ({ route }: Props) => {
  const logger = useLogger();
  const [isList, setIsList] = React.useState(false);
  const addDAppModalRef = useRef<FxBottomSheetModalMethods>(null);
  const dAppSettingsModalRef = useRef<FxBottomSheetModalMethods>(null);
  const clearDAppDataModalRef = useRef<FxBottomSheetModalMethods>(null);
  const [selectedDApp, setSelectedDApp] = useCallbackState<TDApp>(null);
  const [addAppForm, setAddAppForm] = useState<AddAppForm | undefined>();
  const [connectedDApps, setAuth, addOrUpdateDApp] = useDAppsStore(
    (state) => [state.connectedDApps, state.setAuth, state.addOrUpdateDApp],
    shallow
  );
  const [bloxs, currentBloxPeerId] = useBloxsStore(
    (state) => [state.bloxs, state.currentBloxPeerId],
    shallow
  );
  const { queueToast } = useToast();
  const currentBlox = useMemo(
    () => bloxs[currentBloxPeerId],
    [bloxs, currentBloxPeerId]
  );
  const connectedDAppsArray = useMemo(
    () => Object.values(connectedDApps?.[currentBloxPeerId] || {}),
    [connectedDApps, currentBloxPeerId]
  );
  console.log('route?.params?.returnDeepLink\n\r', route?.params);

  //const blox = mockConnectedDAppsData[bloxIndex];
  useEffect(() => {
    if (route?.params?.appName) {
      setAddAppForm({
        appName: route?.params?.appName,
        bundleId: route?.params?.bundleId,
        peerId: route?.params?.peerId,
        bloxPeerId: currentBloxPeerId,
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
      const bloxPeerId = await setAuth({
        peerId: dApp.peerId,
        allow: true,
      });
      addOrUpdateDApp({
        name: dApp.appName,
        peerId: dApp.peerId,
        bundleId: dApp.bundleId,
        bloxPeerId: dApp.bloxPeerId,
        authorized: true,
        lastUpdate: new Date(),
        storageUsed: 0,
      });
      addDAppModalRef.current?.close();
      setTimeout(() => {
        if (
          route?.params?.returnDeepLink &&
          Linking.canOpenURL(route?.params?.returnDeepLink)
        ) {
          Alert.alert(
            'Authorized!',
            `Now you navigate to the ${route?.params?.appName}, to add the blox address!`,
            [
              {
                text: 'Ok',
                onPress: () => {
                  Linking.openURL(
                    decodeURIComponent(route?.params?.returnDeepLink)
                      ?.replace(
                        '$bloxName',
                        currentBlox?.name?.replaceAll(' ', '_')
                      )
                      .replace('$bloxPeerId', dApp.bloxPeerId)
                  );
                },
              },
            ]
          );
        }
      }, 100);
    } catch (error) {
      logger.logError('addAndAuthorize', error);
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
          title={currentBlox?.name}
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
