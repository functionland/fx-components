import React, { useRef } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxButton,
  FxText,
  useFxTheme,
} from '@functionland/component-library';
import { SCREEN_HEIGHT } from '../constants/layout';
import { ScrollView } from 'react-native-gesture-handler';
import { TBlox } from '../models';
import { Share } from 'react-native';
import { BloxIcon } from './Icons';

type BloxInfoBottomSheetProps = {
  closeBottomSheet: VoidFunction;
  onBloxRemovePress?: (peerId: string) => void
  bloxInfo: TBlox
};

export const BloxInfoBottomSheet = React.forwardRef<
  FxBottomSheetModalMethods,
  BloxInfoBottomSheetProps
>(({ bloxInfo, onBloxRemovePress }, ref) => {
  const theme = useFxTheme()
  return (<>
    <FxBottomSheetModal ref={ref}>
      <FxBox height={SCREEN_HEIGHT * 0.4}>
        <FxText variant="bodyMediumRegular" textAlign='center' fontSize={24} >{bloxInfo?.name}</FxText>
        <ScrollView showsVerticalScrollIndicator={false}>
          <FxBox paddingVertical="20" alignItems='center'>
            <FxText variant='bodyMediumRegular' padding='8'>Blox PeerId</FxText>
            <FxButton
              onPress={() => Share.share({
                title: bloxInfo?.name,
                message: bloxInfo?.peerId
              })}
              iconLeft={<BloxIcon />}
              flexWrap='wrap'
              paddingHorizontal='32'
            >
              <FxBox style={{ flex: 1, width: 250 }}>
                <FxText ellipsizeMode='tail' numberOfLines={1} style={{ width: 250 }}>{`${bloxInfo?.peerId}`}</FxText>
              </FxBox>
            </FxButton>
          </FxBox>
          <FxBox paddingVertical="4" alignItems='center'>
            <FxText variant='bodyMediumRegular' padding='8'>Blox fula image</FxText>
            <FxButton
              onPress={() => Share.share({
                title: 'Fula image version',
                message: bloxInfo?.propertyInfo?.containerInfo_fula?.image || 'Not available'
              })}
              iconLeft={<BloxIcon />}
              flexWrap='wrap'
              paddingHorizontal='32'
            >
              <FxBox style={{ flex: 1, width: 250 }}>
                <FxText ellipsizeMode='tail' numberOfLines={1} style={{ width: 250 }}>{`${bloxInfo?.propertyInfo?.containerInfo_fula?.image || 'Not available'}`}</FxText>
              </FxBox>
            </FxButton>
          </FxBox>
          <FxButton onPress={() => onBloxRemovePress(bloxInfo?.peerId)} marginVertical='16' style={{ backgroundColor: theme.colors.errorBase }}>Remove Blox</FxButton>
        </ScrollView>
      </FxBox>
    </FxBottomSheetModal>
  </>
  );
});
