import React, { useEffect } from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
} from '@functionland/component-library';
import {
  useInitialSetupNavigation,
  useRootNavigation,
} from '../../hooks/useTypedNavigation';
import { Routes } from '../../navigation/navigationConfig';
import SetupCompleteSvg1 from '../../app/icons/setup-complete-1.svg';
import { Helper } from '../../utils';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
// import SetupCompleteSvg2 from '../../app/icons/setup-complete-2.svg';
// import SetupCompleteSvg3 from '../../app/icons/setup-complete-3.svg';

export const SetupCompleteScreen = () => {
  const navigation = useInitialSetupNavigation();
  const rootNavigation = useRootNavigation();
  const [password, signiture, bloxPeerIds, setFulaIsReady] = useUserProfileStore((state) => [
    state.password,
    state.signiture,
    state.bloxPeerIds,
    state.setFulaIsReady
  ]);
  useEffect(()=>{
    if (password && signiture) {
      Helper.initFula({
        password,
        signiture,
        bloxPeerId: bloxPeerIds?.[0],
      }).then(() => {
        setFulaIsReady(true)
      }).catch(()=>{
        setFulaIsReady(false)
      });
    }
  },[password, signiture])
  const handleBack = () => {
    navigation.goBack();
  };

  const handleHome = () => {
    rootNavigation.reset({
      index: 0,
      routes: [{ name: Routes.MainTabs }],
    });
  };

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={100} />
      <FxBox flex={1} justifyContent="center">
        <SetupCompleteSvg1 width="100%" />
      </FxBox>
      <FxText
        letterSpacing={2}
        variant="bodyXXSRegular"
        textAlign="center"
        textTransform="uppercase"
        marginBottom="16"
      >
        Congratulations
      </FxText>
      <FxText
        fontFamily="Montserrat-Semibold"
        fontSize={36}
        lineHeight={48}
        textAlign="center"
        marginBottom="16"
      >
        Setup Complete
      </FxText>
      <FxButton marginBottom="16" size="large" onPress={handleHome}>
        Home
      </FxButton>
      <FxButton size="large" variant="inverted" onPress={handleBack}>
        Back
      </FxButton>
    </FxSafeAreaBox>
  );
};
