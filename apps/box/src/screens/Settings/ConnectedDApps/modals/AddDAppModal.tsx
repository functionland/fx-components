import React, { useEffect, useState } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxButton,
  FxTextInput,
} from '@functionland/component-library';

import { SubHeaderText } from './../../../../components/Text';

export type AddAppForm = {
  appName?: string;
  bundleId?: string;
  peerId?: string;
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
  const addAndAuthorize = async () => {
    onSubmit?.(form);
  };
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
        <FxButton
          size="large"
          disabled={!addForm.peerId || !addForm.appName || !addForm.bundleId}
          onPress={addAndAuthorize}
        >
          Add and Authorize
        </FxButton>
      </FxBox>
    </FxBottomSheetModal>
  );
});

export default AddDAppModal;
