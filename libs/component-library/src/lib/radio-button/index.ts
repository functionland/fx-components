import RadioButton from './RadioButton';
import RadioButtonGroup from './RadioButtonGroup';

export const FxRadioButton = Object.assign(
  // @component ./RadioButton.tsx
  RadioButton,
  {
    // @component ./RadioButtonGroup.tsx
    Group: RadioButtonGroup,
  }
);

export * from './RadioButtonWithLabel';
