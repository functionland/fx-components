import {
  FxBox,
  FxError,
  FxRadioButton,
  FxRadioButtonWithLabel,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
  FxTextArea,
  FxTextInput,
} from '@functionland/component-library';
import { HeaderText } from '../../../components/Text';
import React from 'react';

enum InputState {
  default = 'default',
  disabled = 'disabled',
  error = 'error',
}

export const FormDemoScreen = () => {
  const [inputState, setInputState] = React.useState<InputState>(
    InputState.default
  );
  const [textAreaState, setTextAreaState] = React.useState<InputState>(
    InputState.default
  );
  return (
    <FxSafeAreaBox marginHorizontal="20" flex={1}>
      <HeaderText>Form</HeaderText>
      <FxSpacer marginTop="32" />
      <FxBox flex={1}>
        <FxText variant="bodySmallRegular" color="content1">
          Input Field
        </FxText>
        <FxText variant="bodyXSLight" color="content2" marginBottom="8">
          Input fields are different from text areas in that they are limited to
          a single line of text.
        </FxText>
        <FxTextInput
          placeholder="Example Description"
          disabled={inputState === InputState.disabled}
          error={inputState === InputState.error}
        />
        {inputState === InputState.error && <FxError error="Error message" />}
        <FxSpacer height={8} />
        <FxRadioButton.Group
          value={InputState[inputState]}
          onValueChange={(val) => setInputState(InputState[val])}
        >
          <InputStateOptions />
        </FxRadioButton.Group>
        <FxSpacer height={32} />
        <FxText variant="bodySmallRegular" color="content1" marginBottom="8">
          Text Area
        </FxText>
        <FxTextArea
          placeholder="Type message here..."
          disabled={textAreaState === InputState.disabled}
          error={textAreaState === InputState.error}
        />
        {textAreaState === InputState.error && (
          <FxError error="Error message" />
        )}
        <FxSpacer height={8} />
        <FxRadioButton.Group
          value={InputState[textAreaState]}
          onValueChange={(val) => setTextAreaState(InputState[val])}
        >
          <InputStateOptions />
        </FxRadioButton.Group>
      </FxBox>
    </FxSafeAreaBox>
  );
};

const InputStateOptions = () => (
  <FxBox flexDirection="row">
    <FxRadioButtonWithLabel
      value={InputState.default}
      label={InputState.default}
    />
    <FxSpacer width={20} />
    <FxRadioButtonWithLabel
      value={InputState.disabled}
      label={InputState.disabled}
    />
    <FxSpacer width={20} />
    <FxRadioButtonWithLabel value={InputState.error} label={InputState.error} />
  </FxBox>
);
