import React, { useEffect, useState } from 'react';
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
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { ActivityIndicator } from 'react-native';
import { useFetch, useLogger } from '../../hooks';
import { CommonActions } from '@react-navigation/native';
// import SetupCompleteSvg2 from '../../app/icons/setup-complete-2.svg';
// import SetupCompleteSvg3 from '../../app/icons/setup-complete-3.svg';
type SetupStatus = 'COMPLETED' | 'CHECKING' | 'NOTCOMPLETED' | undefined
type InternetStatus = 'CONNECTED' | 'CHECKING' | 'NOTCONNECTED' | undefined
export const SetupCompleteScreen = () => {
  const navigation = useInitialSetupNavigation();
  const rootNavigation = useRootNavigation();
  const [internetStatus, setInternetStatus] = useState<InternetStatus>()
  const [setupStatus, setSetupStatus] = useState<SetupStatus>('CHECKING')
  const [password, signiture, bloxPeerIds, fulaIsReady, bloxConnectionStatus, setFulaIsReady, checkBloxConnection] = useUserProfileStore((state) => [
    state.password,
    state.signiture,
    state.bloxPeerIds,
    state.fulaIsReady,
    state.bloxConnectionStatus,
    state.setFulaIsReady,
    state.checkBloxConnection
  ]);
  const logger = useLogger()
  const inetInfo = useNetInfo()
  useEffect(() => {
    checkInternetStatus()
  }, [])

  useEffect(() => {
    if (internetStatus !== 'CONNECTED' && inetInfo.isInternetReachable)
      setInternetStatus('CONNECTED')
  }, [inetInfo])

  // Initiate fula 
  useEffect(() => {
    if (password && signiture) {
      Helper.initFula({
        password,
        signiture,
        bloxPeerId: bloxPeerIds?.[0],
      }).then(() => {
        setFulaIsReady(true)
      }).catch(() => {
        setFulaIsReady(false)
      });
    }
  }, [password, signiture])

  //Check the blox conectivity
  useEffect(() => {
    if (fulaIsReady && internetStatus === 'CONNECTED')
      handleTryReachBlox()
  }, [fulaIsReady, internetStatus])

  //Set the setup completion status
  useEffect(() => {
    if (bloxConnectionStatus === 'DISCONNECTED') {
      setSetupStatus('NOTCOMPLETED')
    } else if (bloxConnectionStatus === 'CONNECTED')
      setSetupStatus('COMPLETED')
  }, [bloxConnectionStatus])

  const checkInternetStatus = async () => {
    try {
      const network = await NetInfo.fetch();
      if (network.isInternetReachable) {
        setInternetStatus('CONNECTED')
      } else {
        setInternetStatus('NOTCONNECTED')
        setSetupStatus('NOTCOMPLETED')
      }
      logger.log('checkinternetStatus:network', network)
      console.log('network', network)
    } catch (error) {
      setInternetStatus('NOTCONNECTED')
      setSetupStatus('NOTCOMPLETED')
      console.error('checkInternetConectivity', error)
      logger.error('checkInternetConectivity', error)
    }
  }

  const handleBack = () => {
    navigation.goBack();
  };

  const handleHome = () => {
    rootNavigation.reset({
      index: 0,
      routes: [{ name: Routes.MainTabs }],
    });
  };
  const handleTryCheckInternet = () => {
    setSetupStatus('CHECKING')
    setTimeout(() => {
      checkInternetStatus()
    }, 1000);
  };
  const handleTryReachBlox = () => {
    setSetupStatus('CHECKING')
    setTimeout(() => {
      if (fulaIsReady && internetStatus === 'CONNECTED') {
        checkBloxConnection()
      } else
        setSetupStatus('NOTCOMPLETED')
    }, 1000);
  };

  const handleReconnectBlox = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: Routes.ConnectToBlox }],
      }))
  }

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={100} />
      <FxBox flex={2} justifyContent="center">
        <SetupCompleteSvg1 width="100%" />
      </FxBox>
      <FxBox flex={1} alignItems='center' marginTop='8'>
        {setupStatus === 'CHECKING' &&
          <>
            <ActivityIndicator size="large" />
            <FxText variant="bodyLargeRegular" paddingVertical='8'>
              Completing setup
            </FxText>
          </>
        }
        {internetStatus === 'CHECKING' &&
          <FxText variant='bodyMediumRegular'>
            Checking internet ...
          </FxText>
        }
        {internetStatus === 'CONNECTED' && bloxConnectionStatus === 'PENDING' &&
          <FxText variant='bodyMediumRegular'>
            Reaching Blox ...
          </FxText>
        }
        {internetStatus === 'NOTCONNECTED' && setupStatus === 'NOTCOMPLETED' &&
          <FxText variant='bodyMediumRegular' color='warningBase' textAlign='center' paddingHorizontal='16' lineHeight={20}>
            Make sure your phone is connected to the internet and then try again
          </FxText>
        }
        {bloxConnectionStatus === 'DISCONNECTED' && internetStatus === 'CONNECTED' && setupStatus === 'NOTCOMPLETED' &&
          <FxText variant='bodyMediumRegular' color='warningBase' textAlign='center' paddingHorizontal='16' lineHeight={20}>
            Your blox is not reachable, It seems is not connected to the internet! Please turn your blox off and then turn it on and make sure it is on Hotspot mode, then try to reconnect the blox to the Wi-Fi
          </FxText>
        }
      </FxBox>
      <FxBox flex={1} justifyContent='flex-end'>
        {setupStatus === 'COMPLETED' &&
          <>
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
          </>}

        {setupStatus === 'COMPLETED' &&
          <FxButton marginBottom="16" size="large" onPress={handleHome}>
            Home
          </FxButton>
        }

        {internetStatus === 'NOTCONNECTED' && setupStatus === 'NOTCOMPLETED' &&
          <FxButton variant="inverted" marginBottom="16" size="large" onPress={handleTryCheckInternet}>
            Try again
          </FxButton>
        }
        {internetStatus === 'CONNECTED' && setupStatus === 'NOTCOMPLETED' &&
          <FxButton variant="inverted" marginBottom="16" size="large" onPress={handleTryReachBlox}>
            Try again
          </FxButton>
        }
        {bloxConnectionStatus === 'DISCONNECTED' && internetStatus === 'CONNECTED' && setupStatus === 'NOTCOMPLETED' &&
          <FxButton size="large" onPress={handleReconnectBlox}>
            Reconnect Blox to Wi-Fi
          </FxButton>
        }
      </FxBox>

    </FxSafeAreaBox>
  );
};
