import React from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxButton,
  FxText,
  useFxTheme,
} from '@functionland/component-library';
import { ScrollView } from 'react-native-gesture-handler';
import { TBlox } from '../models';
import { ActivityIndicator, Share } from 'react-native';
import { BloxIcon } from './Icons';
import { useBloxsStore } from '../stores';
import shallow from 'zustand/shallow';

type BloxInfoBottomSheetProps = {
  closeBottomSheet?: VoidFunction;
  onBloxRemovePress?: (peerId: string) => void;
  onRestToHotspotPress?: (peerId: string) => void;
  onRebootBloxPress?: (peerId: string) => void;
  bloxInfo: TBlox;
  resetingBloxHotspot?: boolean;
  rebootingBlox?: boolean;
};

export const BloxInfoBottomSheet = React.forwardRef<
  FxBottomSheetModalMethods,
  BloxInfoBottomSheetProps
>(
  (
    {
      bloxInfo,
      resetingBloxHotspot,
      rebootingBlox,
      onBloxRemovePress,
      onRestToHotspotPress,
      onRebootBloxPress,
    },
    ref
  ) => {
    const theme = useFxTheme();
    const [bloxsPropertyInfo] = useBloxsStore(
      (state) => [state.bloxsPropertyInfo],
      shallow
    );
    const bloxPropertyInfo = bloxsPropertyInfo[bloxInfo?.peerId];
    return (
      <FxBottomSheetModal ref={ref}>
        <FxBox>
          <FxText variant="bodyMediumRegular" textAlign="center" fontSize={24}>
            {bloxInfo?.name}
          </FxText>
          <ScrollView showsVerticalScrollIndicator={false}>
            <FxBox paddingVertical="20" alignItems="center">
              <FxText variant="bodyMediumRegular" padding="8">
                Blox PeerId
              </FxText>
              <FxButton
                onPress={() =>
                  Share.share({
                    title: bloxInfo?.name,
                    message: bloxInfo?.peerId,
                  })
                }
                iconLeft={<BloxIcon />}
                flexWrap="wrap"
                paddingHorizontal="32"
              >
                <FxBox style={{ flex: 1, width: 250 }}>
                  <FxText
                    ellipsizeMode="tail"
                    numberOfLines={1}
                    style={{ width: 250 }}
                  >{`${bloxInfo?.peerId}`}</FxText>
                </FxBox>
              </FxButton>
            </FxBox>
            <FxBox paddingVertical="4" alignItems="center">
              <FxText variant="bodyMediumRegular" padding="8">
                Blox fula image
              </FxText>
              <FxButton
                onPress={() =>
                  Share.share({
                    title: 'Fula image version',
                    message:
                      bloxPropertyInfo?.containerInfo_fula?.image ||
                      'Not available',
                  })
                }
                iconLeft={<BloxIcon />}
                flexWrap="wrap"
                paddingHorizontal="32"
              >
                <FxBox style={{ flex: 1, width: 250 }}>
                  <FxText
                    ellipsizeMode="tail"
                    numberOfLines={1}
                    style={{ width: 250 }}
                  >{`${
                    bloxPropertyInfo?.containerInfo_fula?.image ||
                    'Not available'
                  }`}</FxText>
                </FxBox>
              </FxButton>
            </FxBox>
            <FxButton
              size="large"
              variant="inverted"
              onPress={() => onRestToHotspotPress(bloxInfo?.peerId)}
              marginTop="32"
            >
              {!resetingBloxHotspot ? (
                'Reset Blox to hotspot mode'
              ) : (
                <ActivityIndicator />
              )}
            </FxButton>
            <FxButton
              size="large"
              variant="inverted"
              onPress={() => onRebootBloxPress(bloxInfo?.peerId)}
              marginTop="16"
            >
              {!rebootingBlox ? 'Reboot blox' : <ActivityIndicator />}
            </FxButton>
            <FxButton
              onPress={() => onBloxRemovePress(bloxInfo?.peerId)}
              marginVertical="16"
              style={{ backgroundColor: theme.colors.errorBase }}
            >
              Remove Blox
            </FxButton>
          </ScrollView>
        </FxBox>
      </FxBottomSheetModal>
    );
  }
);
