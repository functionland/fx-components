import React, { useEffect, useMemo, useState } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxButton,
  FxDropdown,
  FxTextInput,
  useToast,
} from '@functionland/component-library';

import { SubHeaderText } from './../../../../components/Text';
import { useBloxsStore } from 'apps/box/src/stores';
import { useUserProfileStore } from 'apps/box/src/stores/useUserProfileStore';

export type AddAppForm = {
  appName?: string;
  bundleId?: string;
  peerId?: string;
  bloxPeerId?: string;
  accountId?: string;
};
type AddDAppModalProps = {
  form?: AddAppForm;
  onSubmit?: (form: AddAppForm) => void;
};
const AddDAppModal = React.forwardRef<
  FxBottomSheetModalMethods,
  AddDAppModalProps
>((props, ref) => {
  const { form, onSubmit } = props;
  const queueToast = useToast();

  const [addForm, setAddForm] = useState<AddAppForm>({
    appName: form?.appName,
    bundleId: form?.bundleId,
    peerId: form?.peerId,
    bloxPeerId: form?.bloxPeerId,
    accountId: form?.accountId,
  });

  const [bloxs, currentBloxPeerId, updateBloxStore] = useBloxsStore((state) => [
    state.bloxs,
    state.currentBloxPeerId,
    state.update,
  ]);

  const [fulaIsReady] = useUserProfileStore((state) => [state.fulaIsReady]);

  //Update the form
  useEffect(() => {
    setAddForm({
      ...form,
    });
  }, [form]);

  //set the form bloxPeerId
  useEffect(() => {
    setAddForm((prev) => ({
      ...prev,
      bloxPeerId: currentBloxPeerId,
    }));
  }, [currentBloxPeerId]);

  const addAndAuthorize = async () => {
    onSubmit?.(addForm);
  };

  const bloxArray = useMemo(() => Object.values(bloxs), [bloxs]);

  const handleOnBloxChange = (peerId: string) => {
    if (peerId === currentBloxPeerId) return;
    if (bloxs[peerId]) {
      updateBloxStore({
        currentBloxPeerId: peerId,
      });
    } else {
      queueToast.showToast({
        type: 'error',
        message: "Selected Blox's peerId is invalid!",
      });
    }
  };
  return (
    <FxBottomSheetModal ref={ref}>
      <FxBox>
        <SubHeaderText textAlign="center" marginVertical={'24'}>
          Authorize dApp
        </SubHeaderText>
        <FxDropdown
          selectedValue={currentBloxPeerId}
          onValueChange={handleOnBloxChange}
          options={bloxArray?.map((blox) => ({
            label: blox.name,
            value: blox.peerId,
          }))}
          title="Select blox"
          caption="Select blox"
        />
        <FxBox marginBottom="24">
          <FxTextInput
            caption="dApp Name"
            value={addForm.appName}
            onChangeText={(txt) =>
              setAddForm((prev) => ({
                ...prev,
                appName: txt,
              }))
            }
          />
          <FxTextInput
            caption="Bundle Id"
            value={addForm.bundleId}
            onChangeText={(txt) =>
              setAddForm((prev) => ({
                ...prev,
                bundleId: txt,
              }))
            }
          />
          <FxTextInput
            caption="Peer Id"
            value={addForm.peerId}
            onChangeText={(txt) =>
              setAddForm((prev) => ({
                ...prev,
                peerId: txt,
              }))
            }
          />
          <FxTextInput
            caption="App Fula Account"
            value={addForm.accountId}
            onChangeText={(txt) =>
              setAddForm((prev) => ({
                ...prev,
                accountId: txt,
              }))
            }
          />
        </FxBox>
        <FxButton
          size="large"
          disabled={
            !addForm.peerId ||
            !addForm.appName ||
            !addForm.bundleId ||
            !addForm?.bloxPeerId
          }
          onPress={fulaIsReady ? addAndAuthorize : null}
        >
          {fulaIsReady ? 'Add and Authorize' : 'Initialing fula..'}
        </FxButton>
      </FxBox>
    </FxBottomSheetModal>
  );
});

export default AddDAppModal;
