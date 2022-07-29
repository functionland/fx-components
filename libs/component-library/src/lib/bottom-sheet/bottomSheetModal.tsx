import React from 'react';
import { Dimensions, Keyboard } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
  useBottomSheetDynamicSnapPoints,
} from '@gorhom/bottom-sheet';
import { useTheme } from '@shopify/restyle';
import { FxTheme } from '../theme/theme';
import { FxBox } from '../box/box';
import { FxText } from '../text/text';
import { FxCloseIcon } from '../icons/icons';
import { FxPressableOpacity } from '../pressable-opacity/pressableOpacity';

type FxBottomSheetModalProps = {
  title?: string;
  children?: React.ReactElement;
};

const snapPoints = ['CONTENT_HEIGHT'];
const INSET = Dimensions.get('window').height * 0.1;

export type FxBottomSheetModalMethods = {
  present: () => void;
  close: () => void;
};

export const FxBottomSheetModal = React.forwardRef<
  FxBottomSheetModalMethods,
  FxBottomSheetModalProps
>(({ title, children }, ref) => {
  const theme = useTheme<FxTheme>();
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);
  const {
    animatedHandleHeight,
    animatedSnapPoints,
    animatedContentHeight,
    handleContentLayout,
  } = useBottomSheetDynamicSnapPoints(snapPoints);

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
    bottomSheetModalRef.current?.close();
  };

  React.useImperativeHandle(
    ref,
    (): FxBottomSheetModalMethods => ({
      present: () => {
        bottomSheetModalRef.current?.present();
      },
      close: () => {
        bottomSheetModalRef.current?.close();
      },
    })
  );

  React.useEffect(() => {
    const keyboardWillHideListener = Keyboard.addListener(
      'keyboardWillHide',
      () => {
        bottomSheetModalRef.current?.snapToIndex(0);
      }
    );

    return () => {
      keyboardWillHideListener.remove();
    };
  }, []);

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={animatedSnapPoints}
      handleHeight={animatedHandleHeight}
      contentHeight={animatedContentHeight}
      index={0}
      backdropComponent={renderBackdrop}
      topInset={INSET}
      backgroundStyle={{ backgroundColor: theme.colors.backgroundApp }}
    >
      <BottomSheetScrollView
        stickyHeaderIndices={[0]}
        onLayout={handleContentLayout}
      >
        <FxBox
          flexDirection="row"
          backgroundColor="backgroundApp"
          alignItems="center"
          justifyContent={title ? 'space-between' : 'flex-end'}
          paddingHorizontal="20"
        >
          {title && (
            <FxText variant="bodyMediumRegular" color="content1">
              {title}
            </FxText>
          )}
          <FxPressableOpacity onPress={closeHandler}>
            <FxCloseIcon color="content1" />
          </FxPressableOpacity>
        </FxBox>
        <FxBox paddingHorizontal="20">{children}</FxBox>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
