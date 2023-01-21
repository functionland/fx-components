import React, { useEffect, useState } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxButton,
  FxTextInput,
} from '@functionland/component-library';
import { imageMap } from './../../../../api/connectedDApps';
import { SubHeaderText } from './../../../../components/Text';

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
        <FxButton size="large" onPress={() => close()}>
          Authorize
        </FxButton>
      </FxBox>
    </FxBottomSheetModal>
  );
});

export default AddDAppModal;
