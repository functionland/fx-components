import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, InteractionManager } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
  useBottomSheetDynamicSnapPoints,
} from '@gorhom/bottom-sheet';
import { useFxTheme } from '../theme/useFxTheme';
import { FxBox, FxBoxProps } from '../box/box';
import { FxText } from '../text/text';
import { FxCloseIcon } from '../icons/icons';
import { FxPressableOpacity } from '../pressable-opacity/pressableOpacity';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FxBottomSheetModalProps = Pick<BottomSheetModalProps, 'onDismiss'> & {
  title?: string;
  keyboardShouldPersistTaps?: 'never' | 'handled';
  children?: FxBoxProps['children'];
};

const snapPoints = ['CONTENT_HEIGHT'];
const INSET = Dimensions.get('window').height * 0.05;

export type FxBottomSheetModalMethods = BottomSheetModal;

export const FxBottomSheetModal = React.forwardRef<
  BottomSheetModal,
  FxBottomSheetModalProps
>(({ title, keyboardShouldPersistTaps = 'never', children, ...rest }, ref) => {
  const theme = useFxTheme();
  const insets = useSafeAreaInsets();
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);
  const {
    animatedHandleHeight,
    animatedSnapPoints,
    animatedContentHeight,
    handleContentLayout,
  } = useBottomSheetDynamicSnapPoints(snapPoints);
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const interactionPromise = InteractionManager.runAfterInteractions(() =>
      setIsReady(true),
    );
    return () => interactionPromise.cancel();
  }, []);
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

  const closeHandler = () => bottomSheetModalRef.current?.close();

  React.useImperativeHandle<BottomSheetModal | null, BottomSheetModal | null>(
    ref,
    () => bottomSheetModalRef.current
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={animatedSnapPoints}
      handleHeight={animatedHandleHeight}
      contentHeight={animatedContentHeight}
      keyboardBlurBehavior="restore"
      index={0}
      backdropComponent={renderBackdrop}
      topInset={INSET}
      backgroundStyle={{ backgroundColor: theme.colors.backgroundApp }}
      {...rest}
    >
      <BottomSheetScrollView
        stickyHeaderIndices={[0]}
        onLayout={handleContentLayout}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 20,
        }}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
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
          <FxPressableOpacity
            position="absolute"
            right={20}
            top={0}
            onPress={closeHandler}
          >
            <FxCloseIcon color="content1" />
          </FxPressableOpacity>
        </FxBox>
        <FxBox paddingHorizontal="20">{isReady ? children : <ActivityIndicator></ActivityIndicator>}</FxBox>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
