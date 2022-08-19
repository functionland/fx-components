import React from 'react';
import { FxButton, FxButtonProps } from '@functionland/component-library';
import { useBottomSheet } from '@gorhom/bottom-sheet';

const DoneButton = (props: Omit<FxButtonProps, 'onPress'>) => {
  const { close } = useBottomSheet();
  return (
    <FxButton size="large" onPress={() => close()} {...props}>
      Done
    </FxButton>
  );
};

export default DoneButton;
