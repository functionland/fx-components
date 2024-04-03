import React, { useEffect, useState } from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
  useToast,
  FxSpacer,
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
import { useBloxsStore } from '../../stores';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import axios from 'axios';
import { API_URL } from '../../api/index';
import { FlashingCircle, FlashingTower } from '../../components';

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
  const [offInterval, setOffInterval] = useState(500);
  const [towerColor, setTowerColor] = useState('lightblue');
  const [isHeaderStatus200, setIsHeaderStatus200] = useState(false);
  const [password, signiture, fulaIsReady, setFulaIsReady] =
    useUserProfileStore((state) => [
      state.password,
      state.signiture,
      state.fulaIsReady,
      state.setFulaIsReady,
    ]);

  const [currentBloxPeerId, bloxsConnectionStatus, checkBloxConnection] =
    useBloxsStore((state) => [
      state.currentBloxPeerId, // currentBloxPeerId could be undefined when user skip setAuthorizer step with any reason
      state.bloxsConnectionStatus,
      state.checkBloxConnection,
    ]);
  const { queueToast } = useToast();
  const logger = useLogger();
  const inetInfo = useNetInfo();
  const checkHttpHeaderStatus = async () => {
    try {
      const response = await axios.head(API_URL + '/properties');
      if (response.status === 200) {
        setIsHeaderStatus200(true);
      } else {
        setIsHeaderStatus200(false);
      }
    } catch (error) {
      console.error('Failed to fetch properties', error);
      setIsHeaderStatus200(false);
    }
  };

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
        await sleep(20000);
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
      } else if (bloxsConnectionStatus[currentBloxPeerId] === 'CONNECTED') {
        setSetupStatus('COMPLETED');
      }
    }
  }, [bloxsConnectionStatus, currentBloxPeerId, fulaIsReady]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (internetStatus === 'NOTCONNECTED' && setupStatus === 'NOTCOMPLETED') {
        checkHttpHeaderStatus();
      }
    }, 10000); // Check every 10 seconds
    if (setupStatus === 'COMPLETED') {
      setOffInterval(0);
      setTowerColor('green');
    }

    // Cleanup function to clear the interval when the component unmounts or conditions change
    return () => clearInterval(interval);
  }, [internetStatus, setupStatus]);

  const checkHotspotConnection = async () => {
    try {
      // Attempt to reach the specified URL
      await axios.get('http://10.42.0.1:3500/properties');
      // If successful, navigate back
      navigation.pop();
    } catch (error) {
      // If the request fails, show a toast or a modal with the message
      queueToast({
        type: 'error',
        message:
          'It seems you are no longer connected to Hotspot, check if FxBlox hotspot is still available, if not, blox is already connected to internet and you can go to Home',
      });
    }
  };

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
          console.log('blox connection: true');
        } else {
          console.log('blox connection: false');
          setSetupStatus('NOTCOMPLETED');
        }
      } catch (error) {
        console.log('blox connection: error');
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
      <FxBox flex={2} justifyContent="center" marginTop="16">
        <FlashingTower
          onInterval={2000}
          offColor="gray"
          offInterval={offInterval}
          onColor={towerColor}
        />
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
              Connect your phone to internet (wifi) to proceed now...
            </FxText>
          )}
        {internetStatus === 'CONNECTED' &&
          bloxsConnectionStatus[currentBloxPeerId] === 'CHECKING' && (
            <FxText variant="bodyMediumRegular">
              Reaching Blox #{bloxReachOutTryCount}...
            </FxText>
          )}
        {currentBloxPeerId &&
          internetStatus === 'NOTCONNECTED' &&
          setupStatus === 'NOTCOMPLETED' && (
            <>
              <FlashingCircle color="green" offInterval={0} />
              <FxText
                variant="bodyMediumRegular"
                color="warningBase"
                textAlign="center"
                paddingHorizontal="16"
                lineHeight={20}
              >
                Is you blox LED 'green' but you see this message?
              </FxText>
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
              <FxSpacer marginBottom="8" />
              <FlashingCircle
                color="lightblue"
                offInterval={500}
                onInterval={2000}
              />
              <FxText
                variant="bodyMediumRegular"
                color="warningBase"
                textAlign="center"
                paddingHorizontal="16"
                lineHeight={20}
              >
                Is you blox flashing 'light-blue'? You probably entered wrong
                wifi password
              </FxText>
            </>
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
            <>
              <FxButton
                variant="inverted"
                marginBottom="16"
                size="large"
                onPress={handleTryCheckInternet}
              >
                Check internet connectivity
              </FxButton>
              {isHeaderStatus200 && (
                <FxButton
                  variant="inverted"
                  marginBottom="16"
                  size="large"
                  onPress={() => {
                    navigation.goBack();
                  }}
                >
                  Entered Wrong Password? Go Back
                </FxButton>
              )}
            </>
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
              Check Connection Again
            </FxButton>
          )}
        {setupStatus === 'ERROR' && (
          <>
            <FlashingCircle color="red" interval={2} />
            <FxText
              variant="bodyMediumLight"
              color="warningBase"
              textAlign="center"
              paddingHorizontal="16"
              paddingVertical="16"
              lineHeight={20}
            >
              If Blox is flashing 'Cyan', it probably means you have entered the
              wrong password for your wifi. Connect to 'FxBlox' Wifi again and
              retry.
            </FxText>
            <FxButton
              marginBottom="16"
              size="large"
              onPress={checkHotspotConnection} // Updated to use the new function
            >
              Back
            </FxButton>
            <FxSpacer height={15} />
            <FxButton
              variant="inverted"
              marginBottom="16"
              size="large"
              onPress={handleHome}
            >
              Home
            </FxButton>
          </>
        )}
        {currentBloxPeerId && bloxsConnectionStatus[currentBloxPeerId] === 'DISCONNECTED' &&
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
