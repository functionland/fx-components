import React from 'react';
import { CardHeader } from './fields/CardHeader';
import {
  convertMegabyteToGigabyte,
  convertPascalToSentence,
  FxBottomSheetModal,
  FxBox,
  FxButton,
  FxCard,
  FxLoadingSpinner,
  FxTag,
  FxText,
} from '@functionland/component-library';
import { CardCarousel } from './fields/CardCarousel';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { DeviceData, DeviceStatus, mockHub } from '../../api/hub';

type DeviceCardProps = React.ComponentProps<typeof FxBox> & {
  data: DeviceData;
};
export const DeviceCard = ({ data, ...rest }: DeviceCardProps) => {
  const bottomSheetRef = React.useRef<BottomSheetModalMethods>(null);
  const { name, capacity, status, associatedDevices } = data;

  return (
    <FxCard
      {...rest}
      onLongPress={() => bottomSheetRef.current?.present()}
      delayLongPress={200}
    >
      <FxCard.Title marginBottom="8">{name}</FxCard.Title>
      <FxBox flexDirection="row" marginBottom="16">
        {associatedDevices.map((deviceName) => (
          <FxTag key={`${name}-${deviceName}`} marginRight="8">
            {deviceName}
          </FxTag>
        ))}
      </FxBox>
      <FxCard.Row>
        <FxCard.Row.Title>Capacity</FxCard.Row.Title>
        <FxCard.Row.Data>
          {convertMegabyteToGigabyte(capacity)} GB
        </FxCard.Row.Data>
      </FxCard.Row>
      <FxCard.Row>
        <FxCard.Row.Title>Status</FxCard.Row.Title>
        <FxBox flexDirection="row" alignItems="center">
          <FxCard.Row.Data>
            {convertPascalToSentence(DeviceStatus[status])}
          </FxCard.Row.Data>
          {status === DeviceStatus.BackingUp && (
            <FxLoadingSpinner marginLeft="4" />
          )}
        </FxBox>
      </FxCard.Row>
      <FxButton disabled={status === DeviceStatus.BackingUp}>
        Eject Device
      </FxButton>
      <FxBottomSheetModal ref={bottomSheetRef} title="Device Bottom Sheet">
        <FxBox
          height={200}
          justifyContent="center"
          alignItems="center"
          paddingHorizontal="20"
        >
          <FxText>This bottom sheet needs to be completed</FxText>
        </FxBox>
      </FxBottomSheetModal>
    </FxCard>
  );
};

const DeviceCardEmpty = () => (
  <FxBox
    alignItems="center"
    borderColor="backgroundSecondary"
    borderRadius="s"
    borderStyle="dashed"
    borderWidth={1}
    height={DEVICE_CARD_HEIGHT}
    justifyContent="center"
    paddingHorizontal="24"
  >
    <FxText color="content1" variant="bodyMediumRegular" textAlign="center">
      No "connected devices"
    </FxText>
  </FxBox>
);

const DEVICE_CARD_HEIGHT = 264;

export const ConnectedDevicesCard = () => {
  return (
    <>
      <CardHeader>Connected Devices</CardHeader>
      {mockHub.length === 0 ? (
        <DeviceCardEmpty />
      ) : (
        <CardCarousel
          data={mockHub}
          renderItem={DeviceCard}
          height={DEVICE_CARD_HEIGHT}
        />
      )}
    </>
  );
};
