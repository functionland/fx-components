import { FxText, FxTextProps } from '@functionland/component-library';
import React from 'react';
import { getVersion, getBuildNumber } from 'react-native-device-info';

const Version = (props: FxTextProps) => {
  const version = getVersion();
  const buildNumber = getBuildNumber()
  return (
    <FxText
      textAlign="center"
      variant="bodyXXSRegular"
      color="content3"
      {...props}
    >{`Functionland Blox App version ${version} #${buildNumber}`}</FxText>
  );
};

export default Version;
