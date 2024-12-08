import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
} from '@functionland/component-library';
import { HeaderText } from '../../../components/Text';
import React from 'react';

export const ProgressBarDemoScreen = () => {
  const [progress, setProgress] = React.useState(10);

  const increaseProgress = () => {
    // The progress bar will prevent the value from going above 100 but I'm preventing state updates from going above 100 to prevent rerenders.
    setProgress((prevProg) => (prevProg < 100 ? prevProg + 10 : prevProg));
  };

  const decreaseProgress = () => {
    setProgress((prevProg) => (prevProg > 0 ? prevProg - 10 : prevProg));
  };

  return (
    <FxSafeAreaBox flex={1} marginHorizontal={'20'}>
      <HeaderText>Progress Bar</HeaderText>
      <FxSpacer marginTop="24" />
      <FxBox
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <FxText variant="bodyMediumRegular">Custom width:</FxText>
        <FxProgressBar width={200} progress={progress} />
      </FxBox>
      <FxSpacer marginTop="24" />
      <FxProgressBar progress={progress} />
      <FxSpacer marginTop="24" />
      <FxBox flexDirection="row" alignItems="center" justifyContent="center">
        <FxButton flex={1} onPress={increaseProgress}>
          Increase Progress
        </FxButton>
        <FxSpacer marginLeft="8" />
        <FxButton flex={1} onPress={decreaseProgress}>
          Decrease Progress
        </FxButton>
      </FxBox>
    </FxSafeAreaBox>
  );
};
