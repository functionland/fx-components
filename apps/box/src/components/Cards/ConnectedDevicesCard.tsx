import React from 'react';
import { CardHeader } from './fields/CardHeader';
import {
  convertByteToCapacityUnit,
  convertPascalToSentence,
  FxBottomSheetModal,
  FxBox,
  FxButton,
  FxCard,
  FxLoadingSpinner,
  FxRefreshIcon,
  FxTag,
  FxPoolIcon,
  useToast,
} from '@functionland/component-library';
import { CardCarousel } from './fields/CardCarousel';
import { EmptyCard } from './EmptyCard';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { TDevice, EDeviceStatus, mockHub } from '../../api/hub';
import { ActivityIndicator, Alert } from 'react-native';
import { fxblox } from '@functionland/react-native-fula';

const DEVICE_CARD_HEIGHT = 264;

type DeviceCardProps = React.ComponentProps<typeof FxBox> & {
  data: TDevice;
  showEject?: boolean;
  loading?: boolean;
  onRefreshPress?: () => void;
};
export const DeviceCard = ({
  data,
  showEject,
  loading,
  onRefreshPress,
  children,
  ...rest
}: DeviceCardProps) => {
  const bottomSheetRef = React.useRef<BottomSheetModalMethods>(null);
  const { name, capacity, status, associatedDevices, used, free } = data;
  const { queueToast } = useToast();

  return (
    <FxCard
      {...rest}
      onLongPress={() => bottomSheetRef.current?.present()}
      delayLongPress={200}
    >
      <FxBox flexDirection="row" justifyContent="space-between">
        <FxCard.Title marginBottom="8">{name}</FxCard.Title>
        {loading ? (
          <ActivityIndicator />
        ) : (
          onRefreshPress && (
            <FxRefreshIcon color="white" onPress={onRefreshPress} />
          )
        )}
      </FxBox>
      <FxBox flexDirection="row" marginBottom="16">
        {associatedDevices.map((deviceName) => (
          <FxTag key={`${name}-${deviceName}`} marginRight="8">
            {deviceName}
          </FxTag>
        ))}
      </FxBox>
      <FxCard.Row>
        <FxCard.Row.Title>Capacity</FxCard.Row.Title>
        <FxCard.Row.Data>{convertByteToCapacityUnit(capacity)}</FxCard.Row.Data>
      </FxCard.Row>
      {used != undefined && (
        <FxCard.Row>
          <FxCard.Row.Title>Used</FxCard.Row.Title>
          <FxCard.Row.Data>{convertByteToCapacityUnit(used)}</FxCard.Row.Data>
        </FxCard.Row>
      )}
      {free != undefined && (
        <FxCard.Row>
          <FxCard.Row.Title>Free</FxCard.Row.Title>
          <FxCard.Row.Data>{convertByteToCapacityUnit(free)}</FxCard.Row.Data>
        </FxCard.Row>
      )}
      <FxCard.Row>
        <FxCard.Row.Title>Status</FxCard.Row.Title>
        <FxBox flexDirection="row" alignItems="center">
          <FxCard.Row.Data
            color={
              status === EDeviceStatus.NotAvailable ? 'errorBase' : 'content2'
            }
          >
            {convertPascalToSentence(EDeviceStatus[status])}
          </FxCard.Row.Data>
          {status === EDeviceStatus.BackingUp && (
            <FxLoadingSpinner marginLeft="4" />
          )}
        </FxBox>
      </FxCard.Row>
      {showEject && (
        <FxButton disabled={status === EDeviceStatus.BackingUp}>
          Eject Device
        </FxButton>
      )}
      {children}
      <FxBottomSheetModal ref={bottomSheetRef} title="Device Actions">
        <FxBox
          height={200}
          justifyContent="center"
          alignItems="center"
          paddingHorizontal="20"
        >
          <FxButton
            onPress={() => {
              Alert.alert(
                'Format Blox Partition!',
                `Are you sure want to format external blox partitions?`,
                [
                  {
                    text: 'Yes',
                    onPress: () => {
                      fxblox.partition().then(() => {
                        console.log('partition sent');
                        queueToast({
                          type: 'success',
                          title: 'Request Sent',
                          message:
                            'The parition request is sent. Please wait 5 minutes as your blox restarts after partitioning',
                        });
                      });
                    },
                    style: 'destructive',
                  },
                  {
                    text: 'No',
                    style: 'cancel',
                  },
                ]
              );
            }}
            flexWrap="wrap"
            paddingHorizontal="16"
            iconLeft={<FxPoolIcon />}
          >
            Format
          </FxButton>
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
