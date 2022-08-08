import { FxText, FxTextProps } from '@functionland/component-library';
import React from 'react';
import { getVersion } from 'react-native-device-info';

const Version = (props: FxTextProps) => {
  const version = getVersion();
  return (
    <FxText
      textAlign="center"
      variant="bodyXXSRegular"
      color="content3"
      {...props}
    >{`Functionland Blox App version ${version}`}</FxText>
  );
};

export default Version;
