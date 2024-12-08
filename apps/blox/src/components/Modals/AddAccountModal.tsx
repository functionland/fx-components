import React, { useEffect, useState } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxButton,
  FxTextInput,
} from '@functionland/component-library';

import { SubHeaderText } from '../Text';

export type AddAccountForm = {
  seed?: string;
};
type AddAccountModalProps = {
  form?: AddAccountForm;
  onSubmit?: (form: AddAccountForm) => void;
};
const AddAccountModal = React.forwardRef<
  FxBottomSheetModalMethods,
  AddAccountModalProps
>((props, ref) => {
  const { form, onSubmit } = props;
  const [addForm, setAddForm] = useState<AddAccountForm>({
    seed: form?.seed,
  });
  useEffect(() => {
    setAddForm({
      ...form,
    });
  }, [form]);
  const addAccount = async () => {
    onSubmit?.(addForm);
  };
  return (
    <FxBottomSheetModal ref={ref}>
      <FxBox>
        <SubHeaderText textAlign="center" marginVertical={'24'}>
          Create Account
        </SubHeaderText>
        <FxBox marginBottom="24">
          <FxTextInput
            caption="Seed"
            value={addForm.seed}
            onChangeText={(txt) =>
              setAddForm((prev) => ({
                ...prev,
                seed: txt,
              }))
            }
          />
        </FxBox>
        <FxButton size="large" disabled={!addForm.seed} onPress={addAccount}>
          Create
        </FxButton>
      </FxBox>
    </FxBottomSheetModal>
  );
});

export default AddAccountModal;
