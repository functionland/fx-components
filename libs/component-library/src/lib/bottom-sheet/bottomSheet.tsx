import React from 'react';
import { Dimensions } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { FxTheme } from '../theme/theme';
import { useTheme } from '@shopify/restyle';
import { FxBox } from '../box/box';
import { FxText } from '../text/text';
import { FxCloseIcon } from '../icons/icons';
import { FxPressableOpacity } from '../pressable-opacity/pressableOpacity';

type FxBottomSheetProps = {
  headerText: string;
  children: React.ReactElement;
};

const snapPoints = ['30', '70%', '90%'];
const INSET = (Dimensions.get('window').height * 10) / 100;

export type FxBottomSheetMethods = {
  expand: () => void;
  close: () => void;
  snapToIndex: (index: number) => void;
};

export const FxBottomSheet = React.forwardRef<
  FxBottomSheetMethods,
  FxBottomSheetProps
>(({ headerText, children }, ref) => {
  const theme = useTheme<FxTheme>();
  const bottomSheetRef = React.useRef<BottomSheet>(null);
  const renderBackdrop = (props: BottomSheetBackdropProps) => {
    return (
      <BottomSheetBackdrop
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        {...props}
      />
    );
  };

  const closeHandler = () => {
    bottomSheetRef.current?.close();
  };

  React.useImperativeHandle(
    ref,
    (): FxBottomSheetMethods => ({
      expand: () => {
        bottomSheetRef.current?.expand();
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
      snapToIndex: (index: number) => {
        bottomSheetRef.current?.snapToIndex(index);
      },
    })
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={-1}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      topInset={INSET}
      backgroundStyle={{ backgroundColor: theme.colors.backgroundApp }}
    >
      <BottomSheetScrollView stickyHeaderIndices={[0]}>
        <FxBox
          flexDirection="row"
          backgroundColor="backgroundApp"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="24"
          paddingBottom="48"
        >
          <FxText variant="bodyMediumRegular" color="content1">
            {headerText}
          </FxText>
          <FxPressableOpacity onPress={closeHandler}>
            <FxCloseIcon color="content1" />
          </FxPressableOpacity>
        </FxBox>
        {children}
      </BottomSheetScrollView>
    </BottomSheet>
  );
});
