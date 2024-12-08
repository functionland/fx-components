import React, { useRef } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxText,
  FxPressableOpacity,
} from '@functionland/component-library';

export type AccountOptionsType = 'RESET-CHAIN' | 'NOT_SET';
type AccountOptionsSheetProps = {
  closeBottomSheet?: VoidFunction;
  onSelected?: (item: AccountOptionsType) => void;
};

export const AccountOptionsSheet = React.forwardRef<
  FxBottomSheetModalMethods,
  AccountOptionsSheetProps
>(({ onSelected }, ref) => {
  return (
    <FxBottomSheetModal ref={ref}>
      <FxBox>
        <FxPressableOpacity
          paddingVertical="8"
          paddingHorizontal="8"
          onPress={() => onSelected?.('RESET-CHAIN')}
        >
          <FxText variant="bodyMediumRegular">Reset Chain</FxText>
        </FxPressableOpacity>
      </FxBox>
    </FxBottomSheetModal>
  );
});
