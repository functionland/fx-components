import React from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
} from '@functionland/component-library';
import { imageMap } from './../../../../api/connectedDApps';
import { SubHeaderText } from './../../../../components/Text';
import { DoneButton, DAppHeader } from '../components';

const addDAppModalData = [
  {
    imageSrc: imageMap.fileSync,
    name: 'File Sync',
    info: 'Get the most out of your blox by connecting to dApps',
  },
  {
    imageSrc: imageMap.fotos,
    name: 'Fotos',
    info: 'Backup photos from your device to the pool to your Blox hardware',
  },
];

type AddDAppModalProps = unknown;
const AddDAppModal = React.forwardRef<
  FxBottomSheetModalMethods,
  AddDAppModalProps
>((_, ref) => {
  return (
    <FxBottomSheetModal ref={ref}>
      <FxBox>
        <SubHeaderText textAlign="center" marginVertical={'24'}>
          Get the most out of your blox by connecting to dApps
        </SubHeaderText>
        {addDAppModalData.map((data) => (
          <DAppHeader key={data.name} marginBottom="32" {...data} />
        ))}
        <DoneButton />
      </FxBox>
    </FxBottomSheetModal>
  );
});

export default AddDAppModal;
