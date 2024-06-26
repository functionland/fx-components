import * as React from 'react';
import { FxRadioButton } from '.';
import { FxBox } from '../box/box';
import { FxText } from '../text/text';
import { RadioButtonProps } from './RadioButton';
import { ValueType } from './RadioButtonGroup';

type Props = RadioButtonProps & {
  /**
   * Label of the radio button
   */
  label: ValueType;
};

const FxRadioButtonWithLabel = ({ label, ...rest }: Props) => (
  <FxBox flexDirection="row" alignItems="center">
    <FxRadioButton {...rest} />
    <FxText
      variant="bodySmallRegular"
      color="content1"
      marginLeft="8"
      paddingRight="8"
    >
      {label}
    </FxText>
  </FxBox>
);

export { FxRadioButtonWithLabel };
