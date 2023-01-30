import React from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxButton,
  FxCard,
  FxTag,
} from '@functionland/component-library';
import { Alert, Image, StyleSheet } from 'react-native';
import { scaleByWidth } from './../../../../constants/layout';
import { imageMap } from './../../../../api/connectedDApps';
import { DoneButton } from '../components';
import { RowDetails } from '../components/DAppCard';
import { ExternalLinkIcon } from './../../../../components';
import ClearDAppModal from './ClearDAppModal';
import { TDApp } from '../../../../models';

type DAppSettingsModalProps = {
  dApp?: TDApp;
  onClearDataPress: () => void;
};
const DAppSettingsModal = React.forwardRef<
  FxBottomSheetModalMethods,
  DAppSettingsModalProps
>(({ dApp }, ref) => {
  const clearDAppModalRef = React.useRef<FxBottomSheetModalMethods>(null);
  if (!dApp) return null;
  const { name, tag } = dApp || {};
  return (
    <>
      <FxBottomSheetModal ref={ref}>
        <FxBox alignItems="center" marginTop="24">
          <Image style={s.image} source={imageMap.fileSync} />
          <FxCard.Title marginTop="16">{name}</FxCard.Title>
          <FxTag marginTop="4">{tag}</FxTag>
        </FxBox>
        <FxButton
          marginTop="24"
          marginBottom="12"
          size="large"
          iconLeft={<ExternalLinkIcon />}
          onPress={() => Alert.alert('Comming Soon')}
        >
          {`${name} settings`}
        </FxButton>
        <RowDetails data={dApp} />
        <FxButton
          variant="inverted"
          marginTop="32"
          size="large"
          onPress={() => clearDAppModalRef.current?.present()}
        >
          {'Clear app data from Blox'}
        </FxButton>
        <DoneButton marginTop="16" />
      </FxBottomSheetModal>
      <ClearDAppModal ref={clearDAppModalRef} />
    </>
  );
});

export default DAppSettingsModal;

const s = StyleSheet.create({
  image: {
    width: scaleByWidth(64),
    height: scaleByWidth(64),
    resizeMode: 'contain',
  },
});
