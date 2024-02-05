import React, { useRef } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxText,
  useFxTheme,
  APP_HORIZONTAL_PADDING,
  FxHeader,
  FxSpacer,
  useToast,
  FxPressableOpacity,
} from '@functionland/component-library';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants/layout';
import { HubIcon } from '../components';
import { useMainTabsNavigation } from '../hooks';
import { Routes } from '../navigation/navigationConfig';
import { WalletDetails } from './WalletDetails';
import { ScrollView } from 'react-native-gesture-handler';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { AccountCard } from './Cards/AccountCard';
import AddAccountModal, { AddAccountForm } from './Modals/AddAccountModal';

export type ConnectionOptionsType = 'RETRY' | 'CONNECT-TO-WIFI' | 'RESET-CHAIN'
type ConnectionOptionsSheetProps = {
  closeBottomSheet: VoidFunction;
  onSelected?: (item: ConnectionOptionsType) => void
};

export const ConnectionOptionsSheet = React.forwardRef<
  FxBottomSheetModalMethods,
  ConnectionOptionsSheetProps
>(({ onSelected }, ref) => {
  return (
    <FxBottomSheetModal ref={ref}>
      <FxBox>
        <FxPressableOpacity
          paddingVertical='8'
          paddingHorizontal='8'
          onPress={() => onSelected?.('RETRY')}
        >
          <FxText variant='bodyMediumRegular' >Retry</FxText>
        </FxPressableOpacity>
        <FxPressableOpacity
          paddingVertical='8'
          paddingHorizontal='8'
          onPress={() => onSelected?.('CONNECT-TO-WIFI')}
        >
          <FxText variant='bodyMediumRegular'>Connect blox to Wi-Fi</FxText>
        </FxPressableOpacity>
      </FxBox>
    </FxBottomSheetModal>
  );
});
