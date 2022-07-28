import React from 'react';
import { CardHeader } from './CardHeader';
import {
  convertMegabyteToGigabyte,
  convertPascalToSentence,
  FxBox,
  FxButton,
  FxCard,
  FxHorizontalRule,
  FxTag,
  FxText,
} from '@functionland/component-library';
import { CardCarousel } from './CardCarousel';

enum DeviceStatus {
  InUse = 0,
  BackingUp = 1,
  NotInUse = 2,
}

interface DeviceCardProps extends React.ComponentProps<typeof FxBox> {
  name: string;
  capacity: number; // megabytes
  status: DeviceStatus;
  associatedDevices: string[];
}

const DeviceCard = ({
  name,
  associatedDevices,
  capacity,
  status,
  ...rest
}: DeviceCardProps) => {
  return (
    <FxCard
      {...rest}
      paddingVertical="24"
      /**
       * @todo: Replace console.log() with <DeviceCardBottomSheet />
       */
      onPress={() => console.log(`Open ${name} bottom sheet`)}
    >
      <FxText color="content1" variant="bodyLargeRegular" marginBottom="8">
        {name}
      </FxText>
      <FxBox flexDirection="row" marginBottom="16">
        {associatedDevices.map((deviceName) => (
          <FxTag marginRight="8">{deviceName}</FxTag>
        ))}
      </FxBox>
      <FxBox flexDirection="row" justifyContent="space-between">
        <FxText color="content1" variant="bodySmallRegular">
          Capacity
        </FxText>
        <FxText color="content2" variant="bodySmallLight">
          {convertMegabyteToGigabyte(capacity)} GB
        </FxText>
      </FxBox>
      <FxHorizontalRule marginVertical="12" />
      <FxBox flexDirection="row" justifyContent="space-between">
        <FxText color="content1" variant="bodySmallRegular">
          Status
        </FxText>
        <FxText color="content2" variant="bodySmallLight">
          {convertPascalToSentence(DeviceStatus[status])}
        </FxText>
      </FxBox>
      <FxHorizontalRule marginVertical="12" />
      <FxButton disabled={status === DeviceStatus.BackingUp}>Eject</FxButton>
    </FxCard>
  );
};

/**
 * @todo: Replace ENTRIES with api data
 */
const ENTRIES: DeviceCardProps[] = [
  {
    name: 'Expansion Card 1',
    capacity: 921600,
    status: 0,
    associatedDevices: ['Home Blox Set Up', 'Tower #1', 'Slot #1'],
  },
  {
    name: 'Expansion Card 2',
    capacity: 20000,
    status: 1,
    associatedDevices: ['Home Blox Set Up', 'Tower #1', 'Slot #2'],
  },
];

const DEVICE_CARD_HEIGHT = 264;

export const ConnectedDevicesCard = () => {
  return (
    <>
      <CardHeader>Connected Devices</CardHeader>
      {ENTRIES.length === 0 ? (
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
          <FxText
            color="content1"
            variant="bodyMediumRegular"
            textAlign="center"
          >
            No "connected devices"
          </FxText>
        </FxBox>
      ) : ENTRIES.length === 1 ? (
        <DeviceCard {...ENTRIES[0]} />
      ) : (
        <CardCarousel
          data={ENTRIES}
          renderItem={DeviceCard}
          height={DEVICE_CARD_HEIGHT}
        />
      )}
    </>
  );
};
