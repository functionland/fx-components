import React from 'react';
import { Dimensions, Keyboard, StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';
import { useTheme } from '@shopify/restyle';
import { FxTheme } from '../theme/theme';
import { FxBox } from '../box/box';
import { FxText } from '../text/text';
import { FxCloseIcon } from '../icons/icons';
import { FxPressableOpacity } from '../pressable-opacity/pressableOpacity';

type FxBottomSheetModalProps = {
  title: string;
  children: React.ReactElement;
};

const snapPoints = ['30', '70%', '90%'];
const INSET = Dimensions.get('window').height * 0.1;

type FxSnapConfig = {
  index?: number;
  position?: number | string;
  animationConfig?: WithSpringConfig | WithTimingConfig;
};

type FxBottomSheetModalMethods = {
  present: (config?: FxSnapConfig) => void;
  dismiss: () => void;
};

export const FxBottomSheetModal = React.forwardRef<
  FxBottomSheetModalMethods,
  FxBottomSheetModalProps
>(({ title, children }, ref) => {
  const theme = useTheme<FxTheme>();
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);
  const position = React.useRef<number | string>(0);

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
      present: (config) => {
        bottomSheetModalRef.current?.present();

        if (config) {
          setTimeout(() => {
            if (config.index) {
              position.current = snapPoints[config.index];
              bottomSheetModalRef.current?.snapToIndex(
                config.index,
                config.animationConfig
              );
            } else if (config.position) {
              position.current = config.position;
              bottomSheetModalRef.current?.snapToPosition(
                config.position,
                config.animationConfig
              );
            }
          }, 100);
        }
      },
      dismiss: () => {
        bottomSheetModalRef.current?.dismiss();
      },
    })
  );

  React.useEffect(() => {
    const keyboardWillHideListener = Keyboard.addListener(
      'keyboardWillHide',
      () => {
        bottomSheetModalRef.current?.snapToPosition(position.current);
      }
    );

    return () => {
      keyboardWillHideListener.remove();
    };
  }, []);

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      index={-1}
      backdropComponent={renderBackdrop}
      topInset={INSET}
      backgroundStyle={{ backgroundColor: theme.colors.backgroundApp }}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={false}
      enablePanDownToClose={true}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView stickyHeaderIndices={[0]}>
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

const styles = StyleSheet.create({
  handleIndicator: {
    display: 'none',
  },
});
