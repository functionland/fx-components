import React from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxButton,
  FxButtonProps,
  FxText,
} from '@functionland/component-library';
import { SubHeaderText } from '@box/components/Text';
import { useBottomSheet } from '@gorhom/bottom-sheet';

const CancelButton = (props: Omit<FxButtonProps, 'onPress'>) => {
  const { close } = useBottomSheet();
  return (
    <FxButton
      marginTop="32"
      variant="inverted"
      onPress={() => close()}
      {...props}
    >
      Cancel
    </FxButton>
  );
};

type ClearDAppModalProps = {};
const ClearDAppModal = React.forwardRef<
  FxBottomSheetModalMethods,
  ClearDAppModalProps
>(({ ...props }, ref) => {
  return (
    <FxBottomSheetModal ref={ref}>
      <SubHeaderText textAlign="center" marginTop="32">
        Are you sure you want to remove all File Sync data?
      </SubHeaderText>
      <FxText
        variant="bodySmallLight"
        color="content1"
        textAlign="center"
        marginTop="8"
      >
        Data from File Sync will no longer be backed up to Home Blox Setup.
      </FxText>
      <CancelButton />
      <FxButton marginTop="16">Confirm</FxButton>
    </FxBottomSheetModal>
  );
});

export default ClearDAppModal;
