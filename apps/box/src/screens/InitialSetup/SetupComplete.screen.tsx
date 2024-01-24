import React, { useEffect, useState } from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
  useToast,
} from '@functionland/component-library';
import {
  useInitialSetupNavigation,
  useRootNavigation,
} from '../../hooks/useTypedNavigation';
import {
  InitialSetupStackParamList,
  Routes,
} from '../../navigation/navigationConfig';
import SetupCompleteSvg1 from '../../app/icons/setup-complete-1.svg';
import { Helper } from '../../utils';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import NetInfo, {
  NetInfoStateType,
  useNetInfo,
} from '@react-native-community/netinfo';
import { ActivityIndicator } from 'react-native';
import { useFetch, useLogger } from '../../hooks';
import { CommonActions } from '@react-navigation/native';
import { shallow } from 'zustand/shallow';
import { useBloxsStore } from '../../stores';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
// import SetupCompleteSvg2 from '../../app/icons/setup-complete-2.svg';
// import SetupCompleteSvg3 from '../../app/icons/setup-complete-3.svg';
type SetupStatus =
  | 'COMPLETED'
  | 'CHECKING'
  | 'NOTCOMPLETED'
  | 'ERROR'
  | undefined;
type InternetStatus = 'CONNECTED' | 'CHECKING' | 'NOTCONNECTED' | undefined;
type Props = NativeStackScreenProps<
  InitialSetupStackParamList,
  Routes.SetupComplete
>;
export const SetupCompleteScreen = ({ route }: Props) => {
  const navigation = useInitialSetupNavigation();
  const { isManualSetup = false } = route.params || {};
  const rootNavigation = useRootNavigation();
  const [internetStatus, setInternetStatus] = useState<InternetStatus>();
  const [initialWaitForInternet, setInitialWaitForInternet] = useState(true);
  const [setupStatus, setSetupStatus] = useState<SetupStatus>('CHECKING');
  const [bloxReachOutTryCount, setBloxReachOutTryCount] = useState(0);
  const [password, signiture, fulaIsReady, setFulaIsReady] =
    useUserProfileStore(
      (state) => [
        state.password,
        state.signiture,
        state.fulaIsReady,
        state.setFulaIsReady,
      ],
      shallow
    );

  const [currentBloxPeerId, bloxsConnectionStatus, checkBloxConnection] =
    useBloxsStore(
      (state) => [
        state.currentBloxPeerId, // currentBloxPeerId could be undefined when user skip setAuthorizer step with any reason
        state.bloxsConnectionStatus,
        state.checkBloxConnection,
      ],
      shallow
    );
  const { queueToast } = useToast();
  const logger = useLogger();
  const inetInfo = useNetInfo();

  useEffect(() => {
    setTimeout(() => {
      setInitialWaitForInternet(false);
    }, 20 * 1000);
  }, []);

  useEffect(() => {
    if (!initialWaitForInternet && internetStatus !== 'CONNECTED') {
      checkInternetStatus();
    }
  }, [initialWaitForInternet]);

  useEffect(() => {
    if (
      internetStatus !== 'CONNECTED' &&
      inetInfo.isInternetReachable &&
      inetInfo?.type === NetInfoStateType.wifi
    ) {
      setInternetStatus('CONNECTED');
      setInitialWaitForInternet(false);
    }
  }, [inetInfo]);

  // Initiate fula
  // Initiate fula
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    const initFula = async () => {
      if (
        password &&
        signiture &&
        currentBloxPeerId &&
        internetStatus === 'CONNECTED' &&
        !fulaIsReady
      ) {
        await sleep(10000);
        logger.log('SetupCompleteScreen:intiFula', {
          password: password ? 'Has password' : undefined,
          signiture: signiture ? 'Has signiture' : undefined,
          bloxPeerId: currentBloxPeerId,
        });
        try {
          await Helper.initFula({
            password,
            signiture,
            bloxPeerId: currentBloxPeerId,
          });
          setFulaIsReady(true);
        } catch (error) {
          setFulaIsReady(false);
          setSetupStatus('ERROR');
          queueToast({
            type: 'error',
            message:
              'Unable to initialize the fula network! error: ' +
              error.message +
              ' for fulaIsReady=' +
              fulaIsReady,
          });
          logger.logError('SetupCompleteScreen:intiFula', error);
        }
      }
    };

    initFula();
  }, [password, signiture, currentBloxPeerId, internetStatus]);

  //Check the blox conectivity
  useEffect(() => {
    if (fulaIsReady && internetStatus === 'CONNECTED' && currentBloxPeerId)
      handleTryReachBlox();
  }, [fulaIsReady, internetStatus, currentBloxPeerId]);

  //Set the setup completion status
  useEffect(() => {
    if (fulaIsReady) {
      if (bloxsConnectionStatus[currentBloxPeerId] === 'DISCONNECTED') {
        if (bloxReachOutTryCount < 2) {
          setBloxReachOutTryCount(bloxReachOutTryCount + 1);
          setTimeout(() => {
            handleTryReachBlox();
          }, 4 * 1000);
        } else {
          setSetupStatus('NOTCOMPLETED');
        }
      } else if (bloxsConnectionStatus[currentBloxPeerId] === 'CONNECTED')
        setSetupStatus('COMPLETED');
    }
  }, [bloxsConnectionStatus, currentBloxPeerId, fulaIsReady]);

  const checkInternetStatus = async () => {
    try {
      const network = await NetInfo.fetch();
      if (
        network.isInternetReachable // &&
        //network?.type === NetInfoStateType.wifi
      ) {
        setInternetStatus('CONNECTED');
        setInitialWaitForInternet(false);
      } else {
        setInternetStatus('NOTCONNECTED');
        setSetupStatus('NOTCOMPLETED');
      }
      logger.log('checkinternetStatus:network', network);
    } catch (error) {
      setInternetStatus('NOTCONNECTED');
      setSetupStatus('NOTCOMPLETED');
      console.error('checkInternetConectivity', error);
      logger.logError('checkInternetConectivity', error);
    }
  };

  const handleHome = () => {
    rootNavigation.reset({
      index: 0,
      routes: [{ name: Routes.MainTabs }],
    });
  };
  const handleTryCheckInternet = () => {
    setSetupStatus('CHECKING');
    setTimeout(() => {
      checkInternetStatus();
    }, 1000);
  };
  const handleTryReachBlox = () => {
    setSetupStatus('CHECKING');
    setTimeout(async () => {
      try {
        if (fulaIsReady && internetStatus === 'CONNECTED') {
          const result = await checkBloxConnection();
          logger.log('handleTryReachBlox:checkBloxConnection', result);
        } else setSetupStatus('NOTCOMPLETED');
      } catch (error) {
        logger.logError('handleTryReachBlox', error);
      }
    }, 1000);
  };

  const handleReconnectBlox = () => {
    if (isManualSetup) {
      navigation.pop();
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: Routes.ConnectToBlox }],
        })
      );
    }
  };
  const handleBackToHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: Routes.InitialSetup }],
      })
    );
  };
  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={100} />
      <FxBox flex={2} justifyContent="center">
        <SetupCompleteSvg1 width="100%" />
      </FxBox>
      <FxBox flex={1} alignItems="center" marginTop="8">
        {currentBloxPeerId &&
          (setupStatus === 'CHECKING' || initialWaitForInternet) && (
            <>
              <ActivityIndicator size="large" />
              <FxText variant="bodyLargeRegular" paddingVertical="8">
                Completing setup
              </FxText>
            </>
          )}
        {(internetStatus === 'CHECKING' || initialWaitForInternet) &&
          currentBloxPeerId && (
            <FxText variant="bodyMediumRegular">
              Waiting for internet ...
            </FxText>
          )}
        {internetStatus === 'CONNECTED' &&
          bloxsConnectionStatus[currentBloxPeerId] === 'PENDING' && (
            <FxText variant="bodyMediumRegular">
              Reaching Blox #{bloxReachOutTryCount}...
            </FxText>
          )}
        {currentBloxPeerId &&
          internetStatus === 'NOTCONNECTED' &&
          setupStatus === 'NOTCOMPLETED' && (
            <FxText
              variant="bodyMediumRegular"
              color="warningBase"
              textAlign="center"
              paddingHorizontal="16"
              lineHeight={20}
            >
              Make sure your phone is connected to the internet and then try
              again
            </FxText>
          )}
        {bloxsConnectionStatus[currentBloxPeerId] === 'DISCONNECTED' &&
          internetStatus === 'CONNECTED' &&
          setupStatus === 'NOTCOMPLETED' && (
            <FxText
              variant="bodyMediumRegular"
              color="warningBase"
              textAlign="center"
              paddingHorizontal="16"
              lineHeight={20}
            >
              Your Blox is not reachable, seems it is not connected to the
              internet! Please turn your blox off and then turn it on and make
              sure it is on Hotspot mode, then try to reconnect the blox to the
              Wi-Fi
            </FxText>
          )}
        {!currentBloxPeerId && (
          <>
            <FxText
              variant="bodyMediumRegular"
              color="warningBase"
              textAlign="center"
              paddingHorizontal="16"
              lineHeight={20}
            >
              Your blox is updating. Please wait for an hour for the update to
              complete.
            </FxText>
            <FxText
              variant="bodyMediumLight"
              color="warningBase"
              textAlign="center"
              paddingHorizontal="16"
              paddingVertical="16"
              lineHeight={20}
            >
              Meanwhile, feel free to disconnect your phone from FxBlox hotspot.
            </FxText>
            <FxButton marginTop="24" width="80%" onPress={handleBackToHome}>
              Home Screen
            </FxButton>
          </>
        )}
      </FxBox>
      <FxBox flex={1} justifyContent="flex-end">
        {setupStatus === 'COMPLETED' && (
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
          </>
        )}

        {setupStatus === 'COMPLETED' && (
          <FxButton marginBottom="16" size="large" onPress={handleHome}>
            Home
          </FxButton>
        )}

        {currentBloxPeerId &&
          internetStatus === 'NOTCONNECTED' &&
          setupStatus === 'NOTCOMPLETED' && (
            <FxButton
              variant="inverted"
              marginBottom="16"
              size="large"
              onPress={handleTryCheckInternet}
            >
              Check internet connectivty
            </FxButton>
          )}
        {currentBloxPeerId &&
          internetStatus === 'CONNECTED' &&
          setupStatus === 'NOTCOMPLETED' && (
            <FxButton
              variant="inverted"
              marginBottom="16"
              size="large"
              onPress={() => {
                setBloxReachOutTryCount(0);
                handleTryReachBlox();
              }}
            >
              Try again
            </FxButton>
          )}
        {setupStatus === 'ERROR' && (
          <FxButton
            variant="inverted"
            marginBottom="16"
            size="large"
            onPress={() => {
              navigation.pop();
            }}
          >
            Back
          </FxButton>
        )}
        {bloxsConnectionStatus[currentBloxPeerId] === 'DISCONNECTED' &&
          internetStatus === 'CONNECTED' &&
          setupStatus === 'NOTCOMPLETED' && (
            <FxButton size="large" onPress={handleReconnectBlox}>
              {isManualSetup ? 'Back' : 'Reconnect Blox to Wi-Fi'}
            </FxButton>
          )}
      </FxBox>
    </FxSafeAreaBox>
  );
};
