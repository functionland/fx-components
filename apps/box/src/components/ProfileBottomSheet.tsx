import React, { useRef } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxButton,
  FxText,
  useToast,
} from '@functionland/component-library';
import { SCREEN_HEIGHT } from '../constants/layout';
import { HubIcon } from '../components';
import { useLogger } from '../hooks';
import { Routes } from '../navigation/navigationConfig';
import { WalletDetails } from './WalletDetails';
import { ScrollView } from 'react-native-gesture-handler';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import AddAccountModal, { AddAccountForm } from './Modals/AddAccountModal';

const MENUS = [
  {
    id: 'Hub',
    label: 'Hub',
    icon: HubIcon,
    route: Routes.Hub,
  },
];

type ProfileBottomSheetProps = {
  closeBottomSheet: VoidFunction;
  onBloxDiscovery?: VoidFunction;
};

export const ProfileBottomSheet = React.forwardRef<
  FxBottomSheetModalMethods,
  ProfileBottomSheetProps
>((_, ref) => {
  const accounts = useUserProfileStore((state) => state.accounts);
  const createAccount = useUserProfileStore((state) => state.createAccount);
  console.log('########################################################');
  const addAccountModalRef = useRef<FxBottomSheetModalMethods>(null);
  const { queueToast } = useToast();
  const logger = useLogger();
  const addAccount = async (form: AddAccountForm) => {
    try {
      const account = await createAccount({ seed: form.seed });
      console.log('addAccount account', account);
      addAccountModalRef.current.close();
    } catch (error) {
      queueToast({
        type: 'error',
        title: 'Create account error',
        message: error,
      });
      logger.logError('addAccount', error);
      logger.log('addAccount:form', form);
    }
  };
  return (
    <>
      <FxBottomSheetModal ref={ref}>
        <FxBox height={SCREEN_HEIGHT * 0.75}>
          <FxText variant="bodyMediumRegular" textAlign="center" fontSize={24}>
            Profile
          </FxText>
          <ScrollView showsVerticalScrollIndicator={false}>
            <FxBox paddingVertical="20">
              <WalletDetails
                showDID={true}
                showPeerId={true}
                showBloxPeerIds={false}
              />
            </FxBox>
            <FxBox paddingVertical="20">
              <FxButton
                variant="inverted"
                size="large"
                onPress={_.onBloxDiscovery}
              >
                Blox Discovery
              </FxButton>
            </FxBox>
            {/**
             * Added accounts here
             */}
            {/* <FxHeader
            title="Accounts"
            onAddPress={() => addAccountModalRef.current.present()}
          />
          <FxSpacer marginTop="24" />
          {accounts?.map((account,index) => {
            return (
              <AccountCard
                key={index}
                marginTop="16"
                accountData={account}
              />
            );
          })} */}
          </ScrollView>
        </FxBox>
      </FxBottomSheetModal>
      <AddAccountModal ref={addAccountModalRef} onSubmit={addAccount} />
    </>
  );
});
