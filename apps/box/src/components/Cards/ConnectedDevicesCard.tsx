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
import { EmptyCard } from './EmptyCard';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { TDevice, EDeviceStatus, mockHub } from '../../api/hub';

const DEVICE_CARD_HEIGHT = 264;

type DeviceCardProps = React.ComponentProps<typeof FxBox> & {
  data: TDevice;
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
            {convertPascalToSentence(EDeviceStatus[status])}
          </FxCard.Row.Data>
          {status === EDeviceStatus.BackingUp && (
            <FxLoadingSpinner marginLeft="4" />
          )}
        </FxBox>
      </FxCard.Row>
      <FxButton disabled={status === EDeviceStatus.BackingUp}>
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

type TConnectedDevicesCard = {
  showCardHeader?: boolean;
  data: TDevice[];
};

export const ConnectedDevicesCard = ({
  showCardHeader = true,
  data,
}: TConnectedDevicesCard) => {
  return (
    <>
      {showCardHeader && <CardHeader>Connected Devices</CardHeader>}
      {mockHub.length === 0 ? (
        <EmptyCard placeholder="No connected devices" />
      ) : (
        <CardCarousel
          data={data}
          renderItem={DeviceCard}
          height={DEVICE_CARD_HEIGHT}
        />
      )}
    </>
  );
};
