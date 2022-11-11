import React, { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import {
  FxBox,
  FxText,
  FxVerticalRule,
  useFxTheme,
} from '@functionland/component-library';

type TPercentageInput = {
  percentage: number;
};

export const PercentageInput = ({ percentage }: TPercentageInput) => {
  const theme = useFxTheme();
  const [percentageValue, setPercentageValue] = useState<string>(
    percentage.toString()
  );

  return (
    <FxBox
      flexDirection="row"
      borderColor="content1"
      borderRadius="s"
      borderWidth={1}
      height={30}
    >
      <FxBox justifyContent="center" alignItems="center">
        <TextInput
          style={[styles.input, { color: theme.colors.content1 }]}
          value={percentageValue}
          onChangeText={setPercentageValue}
        />
      </FxBox>
      <FxVerticalRule backgroundColor="content1" />
      <FxBox justifyContent="center" alignItems="center">
        <FxText color="content1" variant="bodyXXSRegular" paddingHorizontal="8">
          %
        </FxText>
      </FxBox>
    </FxBox>
  );
};

const styles = StyleSheet.create({
  input: {
    width: 48,
    height: '100%',
    fontFamily: 'OpenSans-Regular',
    fontSize: 14,
    paddingLeft: 16,
  },
});
