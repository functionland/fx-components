import React, { useEffect, useState } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxButton,
  FxTextInput,
  useToast,
} from '@functionland/component-library';
import { fula } from '@functionland/react-native-fula'

import { imageMap } from './../../../../api/connectedDApps';
import { SubHeaderText } from './../../../../components/Text';
import { useDAppsStore } from 'apps/box/src/stores/dAppsSettingsStore';

export type AddAppForm = {
  appName?: string;
  bundleId?: string;
  peerId?: string;
};
type AddDAppModalProps = {
  form?: AddAppForm;
};
const AddDAppModal = React.forwardRef<
  FxBottomSheetModalMethods,
  AddDAppModalProps
>((props, ref) => {
  const { form } = props;
  const { queueToast } = useToast();
  const [setAuth, addOrUpdateDApp] = useDAppsStore(state => [state.setAuth, state.addOrUpdateDApp]);
  const [addForm, setAddForm] = useState<AddAppForm>({
    appName: form?.appName,
    bundleId: form?.bundleId,
    peerId: form?.peerId,
  });
  useEffect(() => {
    setAddForm({
      ...form,
    });
  }, [form]);
  const authorize = () => {
    try {
      setAuth({
        peerId: form.peerId,
        allow: true
      })
      addOrUpdateDApp({
        name: addForm.appName,
        peerId: addForm.peerId,
        bundleId: addForm.bundleId,
        authorized: true
      })
      close()
    } catch (error) {
      queueToast({
        type: "error",
        title: "error",
        message: error,
      })
    }
  }
  return (
    <FxBottomSheetModal ref={ref}>
      <FxBox>
        <SubHeaderText textAlign="center" marginVertical={'24'}>
          Authorize dApp
        </SubHeaderText>
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
        </FxBox>
        <FxButton size="large" disabled={!addForm.peerId || !addForm.appName || !addForm.bundleId}
          onPress={authorize}>
          Authorize
        </FxButton>
      </FxBox>
    </FxBottomSheetModal>
  );
});

export default AddDAppModal;
