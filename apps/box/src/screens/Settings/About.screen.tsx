import { FxBox, FxText } from '@functionland/component-library';
import React from 'react';
import { SubHeaderText } from '../../components/Text';

export const AboutScreen = () => {
  return (
    <FxBox marginHorizontal="20">
      <SubHeaderText>Privacy</SubHeaderText>
      <FxText variant="bodySmallRegular">
        Functionland's FxBlox hardware is managed and used by the File Sync and Blox apps. Blox and File Sync can be used independently of each other. The Blox app is responsible for managing, controlling, and configuring the FxBlox hardware as well as the setup / linking of wallets for receiving Fula (rewards) tokens. If you have FxBlox hardware, you will need the Blox app. The File Sync app is responsible for utilizing the FxBlox hardware as a decentralized storage solution for your data.
      </FxText>
    </FxBox>
  );
};
