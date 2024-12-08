import {
  FxBox,
  FxDropdown,
  FxError,
  FxHorizontalRule,
  FxRadioButton,
  FxRadioButtonWithLabel,
  FxSafeAreaBox,
  FxSlider,
  FxSpacer,
  FxSwitch,
  FxText,
  FxTextArea,
  FxTextInput,
} from '@functionland/component-library';
import { HeaderText } from '../../../components/Text';
import React from 'react';
import { ScrollView } from 'react-native';

enum InputState {
  default = 'default',
  disabled = 'disabled',
  error = 'error',
}

export const FormDemoScreen = () => {
  const [selectedValue, setSelectedValue] = React.useState<number>(null);
  const [selectState, setSelectState] = React.useState<InputState>(
    InputState.default
  );
  const [inputState, setInputState] = React.useState<InputState>(
    InputState.default
  );
  const [textAreaState, setTextAreaState] = React.useState<InputState>(
    InputState.default
  );
  const [sliderValue, setSliderValue] = React.useState(24);
  const [sliderState, setSliderState] = React.useState<InputState>(
    InputState.default
  );
  const [switchState, setSwitchState] = React.useState<boolean>(false);
  const [radioState, setRadioState] = React.useState(2);
  const [checkboxState, setCheckboxState] = React.useState([2, 3]);
  return (
    <ScrollView>
      <FxSafeAreaBox marginHorizontal="20" flex={1}>
        <HeaderText>Form</HeaderText>
        <FxSpacer marginTop="32" />

        {/**
         * Dropdown Field
         */}
        <FxText variant="bodySmallRegular" color="content1" marginBottom="8">
          Dropdown
        </FxText>
        <FxDropdown
          selectedValue={selectedValue}
          onValueChange={(itemValue: number) => setSelectedValue(itemValue)}
          options={[
            { label: 'Select an option', value: null },
            { label: 'Option 1', value: 1 },
            { label: 'Option 2', value: 2 },
            { label: 'Option 3', value: 3 },
          ]}
          disabled={selectState === InputState.disabled}
          error={selectState === InputState.error}
          title="Dropdown Example"
        />
        {selectState === InputState.error && <FxError error="Error message" />}
        <FxSpacer height={8} />
        <FxRadioButton.Group
          value={InputState[selectState]}
          onValueChange={(val) => setSelectState(InputState[val])}
        >
          <InputStateOptions default disabled error />
        </FxRadioButton.Group>
        <FxHorizontalRule marginVertical="20" />

        {/**
         * Input Field
         */}
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
          <InputStateOptions default disabled error />
        </FxRadioButton.Group>
        <FxHorizontalRule marginVertical="20" />

        {/**
         * Textarea Field
         */}
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
          <InputStateOptions default disabled error />
        </FxRadioButton.Group>
        <FxHorizontalRule marginVertical="20" />

        {/**
         * Slider
         */}
        <FxBox
          flexDirection="row"
          alignItems="baseline"
          justifyContent="space-between"
          marginBottom="8"
        >
          <FxText variant="bodySmallRegular" color="content1">
            Slider
          </FxText>
          <FxText variant="bodyXSRegular" color="content3">
            {sliderValue} GB
          </FxText>
        </FxBox>
        <FxSlider
          value={sliderValue}
          onValueChange={setSliderValue}
          minimumValue={1}
          maximumValue={100}
          label="GB"
          disabled={sliderState === InputState.disabled}
        />
        <FxSpacer height={16} />
        <FxRadioButton.Group
          value={InputState[sliderState]}
          onValueChange={(val) => setSliderState(InputState[val])}
        >
          <InputStateOptions default disabled />
        </FxRadioButton.Group>
        <FxHorizontalRule marginVertical="20" />

        <FxBox flexDirection="row" justifyContent="space-between">
          <FxBox>
            <FxText
              variant="bodySmallRegular"
              color="content1"
              marginBottom="8"
            >
              Switch
            </FxText>
            <FxSpacer height={2} />
            <FxSwitch value={switchState} onValueChange={setSwitchState} />
            <FxSpacer height={8} />
            <FxSwitch
              value={!switchState}
              onValueChange={(val) => setSwitchState(!val)}
            />
            <FxSpacer height={8} />
            <FxSwitch value={switchState} disabled />
            <FxSpacer height={8} />
            <FxSwitch value={!switchState} disabled />
          </FxBox>
          <FxBox>
            <FxText
              variant="bodySmallRegular"
              color="content1"
              marginBottom="8"
            >
              Radio
            </FxText>
            <FxRadioButton.Group
              value={radioState}
              onValueChange={(val) => setRadioState(val)}
            >
              <FxRadioButtonWithLabel value={1} label="Option" />
              <FxSpacer height={4} />
              <FxRadioButtonWithLabel value={2} label="Option" />
              <FxSpacer height={4} />
              <FxRadioButtonWithLabel disabled value={3} label="Option" />
              <FxSpacer height={4} />
              <FxRadioButtonWithLabel
                disabled
                value={radioState}
                label="Option"
              />
            </FxRadioButton.Group>
          </FxBox>
          <FxBox marginRight="40">
            <FxText
              variant="bodySmallRegular"
              color="content1"
              marginBottom="8"
            >
              Checkbox
            </FxText>
            <FxRadioButton.Group
              value={checkboxState}
              onValueChange={(val) => setCheckboxState(val)}
            >
              <FxRadioButtonWithLabel value={1} label="Option" />
              <FxSpacer height={4} />
              <FxRadioButtonWithLabel value={2} label="Option" />
              <FxSpacer height={4} />
              <FxRadioButtonWithLabel disabled value={null} label="Option" />
              <FxSpacer height={4} />
              <FxRadioButtonWithLabel disabled value={3} label="Option" />
            </FxRadioButton.Group>
          </FxBox>
        </FxBox>
      </FxSafeAreaBox>
    </ScrollView>
  );
};

type InputStateOptionsType = {
  default?: boolean;
  disabled?: boolean;
  error?: boolean;
};

const InputStateOptions = (props: InputStateOptionsType) => (
  <FxBox flexDirection="row">
    {props.default && (
      <>
        <FxRadioButtonWithLabel
          value={InputState.default}
          label={InputState.default}
        />
        <FxSpacer width={20} />
      </>
    )}
    {props.disabled && (
      <>
        <FxRadioButtonWithLabel
          value={InputState.disabled}
          label={InputState.disabled}
        />
        <FxSpacer width={20} />
      </>
    )}
    {props.error && (
      <FxRadioButtonWithLabel
        value={InputState.error}
        label={InputState.error}
      />
    )}
  </FxBox>
);
