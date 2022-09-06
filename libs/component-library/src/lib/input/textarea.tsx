import React from 'react';
import { FxTextInput, FxTextInputProps } from './input';

const FxTextArea = (props: FxTextInputProps) => (
  <FxTextInput
    multiline
    height={172}
    paddingTop="16"
    paddingBottom="16"
    {...props}
  />
);

export { FxTextArea };
