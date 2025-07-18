import { FxBox, FxText } from '@functionland/component-library';
import React from 'react';
import { SubHeaderText } from '../../components/Text';
import Version from '../../components/Version';

export const AboutScreen = () => {
  return (
    <FxBox flex={1} marginHorizontal="20" justifyContent="space-between">
      <FxBox>
        <SubHeaderText>Privacy</SubHeaderText>
        <FxText variant="bodySmallRegular">
          Functionland's FxBlox hardware is managed and used by the File Sync and
          Blox apps. Blox and File Sync can be used independently of each other.
          The Blox app is responsible for managing, controlling, and configuring
          the FxBlox hardware as well as the setup / linking of wallets for
          receiving Fula (rewards) tokens. If you have FxBlox hardware, you will
          need the Blox app. The File Sync app is responsible for utilizing the
          FxBlox hardware as a decentralized storage solution for your data.
        </FxText>
        <FxText variant="bodySmallRegular" marginTop="16">
          By using this application you agree to our terms of service availabe at 
          "https://fx.land/terms" and subject to get updated within applicable laws.
        </FxText>
      </FxBox>


      {/* Version information at the bottom */}
      <FxBox marginBottom="20">
        <Version />
      </FxBox>
    </FxBox>
  );
};
