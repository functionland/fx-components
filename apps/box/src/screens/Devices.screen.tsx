import React, { useMemo, useState } from 'react';
import {
  FxBox,
  FxHeader,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
} from '@functionland/component-library';
import { DeviceCard } from '../components';
import { useBloxsStore } from '../stores';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { useLogger } from '../hooks';
import { EDeviceStatus } from '../api/hub';

export const DevicesScreen = () => {
  const [isList, setIsList] = useState<boolean>(false);
  const [loadingBloxSpace, setLoadingBloxSpace] = useState(false);
  const logger = useLogger();
  const [bloxsSpaceInfo, currentBloxPeerId, getBloxSpace] = useBloxsStore(
    (state) => [
      state.bloxsSpaceInfo,
      state.currentBloxPeerId,
      state.getBloxSpace,
    ]
  );
  const [fulaIsReady] = useUserProfileStore(
    (state) => [state.fulaIsReady]
  );
  const currentBloxSpaceInfo = useMemo(
    () => bloxsSpaceInfo?.[currentBloxPeerId],
    [bloxsSpaceInfo, currentBloxPeerId]
  );
  const updateBloxSpace = async () => {
    try {
      setLoadingBloxSpace(true);
      if (fulaIsReady) {
        const space = await getBloxSpace();
        logger.log('updateBloxSpace', space);
      }
    } catch (error) {
      logger.logError('GetBloxSpace Error', error);
    } finally {
      setLoadingBloxSpace(false);
    }
  };
  return (
    <FxSafeAreaBox flex={1} edges={['top']}>
      <FxBox paddingHorizontal="20" paddingVertical="12">
        <FxText variant="h300">Connected Devices</FxText>
        <FxSpacer marginTop="24" />
        <FxHeader title="All Cards" isList={isList} setIsList={setIsList} />
      </FxBox>
      <DeviceCard
        marginHorizontal="20"
        onRefreshPress={updateBloxSpace}
        loading={loadingBloxSpace}
        data={{
          capacity: currentBloxSpaceInfo?.size || 0,
          name: 'Hard Disk',
          status: currentBloxSpaceInfo
            ? EDeviceStatus.InUse
            : EDeviceStatus.NotAvailable,
          associatedDevices: ['Blox Set Up'],
        }}
      />
    </FxSafeAreaBox>
  );
};
