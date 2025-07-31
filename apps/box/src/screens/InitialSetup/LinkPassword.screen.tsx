import '@walletconnect/react-native-compat';
import React, { useEffect, useMemo, useState } from 'react';
// @ts-ignore-next-line
import { HDKEY } from '@functionland/fula-sec';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxRadioButton,
  FxRadioButtonWithLabel,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
  FxTextInput,
  useToast,
} from '@functionland/component-library';
import { useInitialSetupNavigation, useLogger } from '../../hooks';
import { Routes } from '../../navigation/navigationConfig';
import * as helper from '../../utils/helper';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { KeyChain } from '../../utils';
import { ActivityIndicator } from 'react-native';
import { useSDK } from '@metamask/sdk-react';
import notifee from '@notifee/react-native';
import { useTranslation } from 'react-i18next'; // Import for translations

export const LinkPasswordScreen = () => {
  const { t } = useTranslation(); // Add translation hook
  const navigation = useInitialSetupNavigation();
  const { account, sdk, provider, connected, error, status, rpcHistory } =
    useSDK();

  const [iKnow, setIKnow] = useState(false);
  const [metamaskOpen, setMetamaskOpen] = useState(false);
  const { queueToast } = useToast();
  const [linking, setLinking] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  const [manualSignature, setManualSignature] = useState(false);
  const [mSig, setMSig] = useState('');
  const [setKeyChainValue, signiture, password, setWalletId] = useUserProfileStore(
    (state) => [state.setKeyChainValue, state.signiture, state.password, state.setWalletId]
  );

  useEffect(() => {
    console.log('in test useEffect');
    console.log(
      JSON.stringify({ error: error, status: status, rpcHistory: rpcHistory })
    );
    const response = {
      status: status,
      rpcHistory: rpcHistory,
    };
    // Check if the connectionStatus is 'linked'
    if (
      response?.status?.connectionStatus === 'linked' &&
      response?.rpcHistory
    ) {
      // Get the rpcHistory object's keys and reverse them to start from the end
      const rpcHistoryKeys = Object.keys(response.rpcHistory).reverse();

      // Iterate over the rpcHistory keys from the end
      for (const key of rpcHistoryKeys) {
        const rpcCall = response.rpcHistory[key];

        // Check if result exists, is a string, and starts with '0x'
        if (
          rpcCall.result &&
          typeof rpcCall.result === 'string' &&
          rpcCall.result.startsWith('0x')
        ) {
          setSignatureData(rpcCall.result);
          break; // Exit the loop after finding the first matching result
        }
      }
    }
  }, [error, status, rpcHistory]);
  useEffect(() => {
    console.log('signiture is: ' + signiture + '; password:' + password);
  }, [signiture, password]);

  const personalSign = async (msg: string) => {
    let signature = '';
    let resolveSigned = () => {};
    const signed = new Promise<void>((resolve) => {
      console.log({signature});
      resolveSigned = resolve;
    });

    // Create an AbortController for cleanup
    const abortController = new AbortController();

    try {
        notifee.registerForegroundService(() => signed);
        await notifee.displayNotification({
            id: 'wallet',
            title: t('linkPassword.connectingWallet'),
            body: t('linkPassword.walletConnectionInProgress'),
            android: {
                progress: {
                    indeterminate: true,
                },
                pressAction: {
                    id: 'default',
                },
                ongoing: true,
                asForegroundService: true,
                channelId: 'sticky',
            },
        });

        // Get provider and remove any existing listeners
        const provider = await sdk?.getProvider();
        provider?.removeAllListeners();

        signature = (await sdk?.connectAndSign({ msg })) as string;
        resolveSigned();
        return signature;
    } catch (error) {
        throw error;
    } finally {
        notifee.stopForegroundService();
        abortController.abort();
        // Clean up any remaining listeners
        const provider = await sdk?.getProvider();
        provider?.removeAllListeners();
    }
};


  const disconnectWallet = () => {
    notifee.stopForegroundService();
    setLinking(false);
    sdk?.terminate();

    console.log('sdk terminated');
  };

  const logger = useLogger();
  useEffect(() => {
    const setKeys = async (walletSignature: string) => {
      try {
        await setKeyChainValue(KeyChain.Service.DIDPassword, passwordInput);
        await setKeyChainValue(KeyChain.Service.Signiture, walletSignature);
      } catch (err) {
        console.log(err);
        logger.logError('handleLinkPassword', err);
        queueToast({
          title: t('linkPassword.error'),
          message: t('linkPassword.unableToSignWallet'),
          type: 'error',
          autoHideDuration: 3000,
        });
      } finally {
        setLinking(false);
      }
    };
    if (signatureData) {
      const walletSignature = signatureData.toString();
      console.log('walletSignature', walletSignature);
      setKeys(walletSignature);
    }
  }, [signatureData]);

  const handleLinkPassword = async () => {
    try {
      if (linking) {
        setLinking(false);
        return;
      }
      setLinking(true);
      const ed = new HDKEY(passwordInput);
      const chainCode = ed.chainCode;
      console.log(chainCode);
      console.log('before signing...');
      const sig = await personalSign(chainCode);
      if (!sig || sig === undefined || sig === null) {
        throw 'Sign failed';
      }
      console.log('Signature: ', sig);
      setSignatureData(sig);
      console.log('after signing...');
    } catch (err) {
      console.log(err);
      logger.logError('handleLinkPassword', err);
      queueToast({
        title: t('linkPassword.error'),
        message: t('linkPassword.unableToSignWallet'),
        type: 'error',
        autoHideDuration: 3000,
      });
      setLinking(false);
    } finally {
      setLinking(false);
    }
  };

  const handleConnectToBlox = () => {
    navigation.navigate(Routes.ConnectToBlox);
  };
  const handleConnectToExistingBlox = () => {
    navigation.navigate(Routes.ConnectToExistingBlox);
  };
  const handleOnBluetoothCommand = () => {
    navigation.navigate(Routes.BluetoothCommands);
  };
  const handleSkipToManulaSetup = () => {
    navigation.navigate(Routes.SetBloxAuthorizer, { isManualSetup: true });
  };

  const handleClearCachedIdentity = async () => {
    // Clear cached signature and password data
    await setWalletId('', true); // true flag clears signature data
    queueToast({
      type: 'success',
      message: t('linkPassword.cachedDataCleared'),
      autoHideDuration: 3000,
    });
  };
  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={40} />
      <FxBox flex={1} justifyContent="space-between" paddingVertical="80">
        <FxBox>
          <FxText variant="h300" textAlign="center">
            {t('linkPassword.title')}
          </FxText>
          {password && signiture && (
            <FxBox marginVertical="20" padding="16" backgroundColor="backgroundSecondary" borderRadius="m">
              <FxText variant="bodyMediumRegular" textAlign="center" color="greenBase">
                {t('linkPassword.existingIdentity')}
              </FxText>
              <FxText textAlign="center" marginTop="8" color="greenBase">
                {helper.getMyDID(password, signiture)}
              </FxText>
            </FxBox>
          )}
        </FxBox>
        <FxBox>
          {!linking ? (
            <FxTextInput
              caption={t('linkPassword.password')}
              autoFocus
              secureTextEntry
              value={passwordInput}
              onChangeText={setPasswordInput}
            />
          ) : (
            <ActivityIndicator />
          )}
          {!linking && manualSignature ? (
            <FxTextInput
              caption={t('linkPassword.signature')}
              autoFocus
              secureTextEntry
              value={mSig}
              onChangeText={setMSig}
            />
          ) : (
            <></>
          )}
          <FxBox>
            <FxText
              variant="bodyMediumRegular"
              color="warningBase"
              textAlign="center"
              paddingBottom="20"
            >
              {t('linkPassword.warning')}
            </FxText>
            <FxRadioButton.Group
              value={iKnow ? [1] : []}
              onValueChange={(val: any) =>
                setIKnow(val && val[0] === 1 ? true : false)
              }
            >
              <FxRadioButtonWithLabel
                paddingVertical="8"
                label={t('linkPassword.passwordRisk')}
                value={1}
              />
            </FxRadioButton.Group>
            <FxRadioButton.Group
              value={metamaskOpen ? [1] : []}
              onValueChange={(val: any) =>
                setMetamaskOpen(val && val[0] === 1 ? true : false)
              }
            >
              <FxRadioButtonWithLabel
                paddingVertical="8"
                label={t('linkPassword.metamaskOpen')}
                value={1}
              />
            </FxRadioButton.Group>
          </FxBox>
        </FxBox>

        <FxBox>
          {signiture ? (
            <>
              <FxButton
                size="large"
                marginBottom="16"
                onPress={handleConnectToBlox}
              >
                {t('linkPassword.continueWithExisting')}
              </FxButton>
              <FxButton
                size="large"
                variant="inverted"
                marginBottom="16"
                onPress={handleClearCachedIdentity}
              >
                {t('linkPassword.clearCachedData')}
              </FxButton>
              <FxButton
                size="large"
                variant="inverted"
                onPress={handleConnectToExistingBlox}
              >
                {t('linkPassword.reconnectExisting')}
              </FxButton>
              {logger.isDebugModeEnable && (
                <FxButton
                  size="large"
                  variant="inverted"
                  marginTop="16"
                  onPress={handleOnBluetoothCommand}
                >
                  {t('linkPassword.bluetoothCommands')}
                </FxButton>
              )}
              <FxButton
                variant="inverted"
                marginTop="16"
                onPress={handleSkipToManulaSetup}
              >
                {t('linkPassword.skipManualSetup')}
              </FxButton>
            </>
          ) : (
          <FxBox>
            <FxButton
              size="large"
              disabled={!passwordInput || !iKnow || !metamaskOpen}
              onPress={
                provider
                  ? linking
                    ? disconnectWallet
                    : handleLinkPassword
                  : () => {}
              }
            >
              {provider ? (
                linking ? (
                  t('linkPassword.cancel')
                ) : (
                  t('linkPassword.signWithMetamask')
                )
              ) : (
                <ActivityIndicator />
              )}
            </FxButton>
            <FxSpacer height={10} />
            <FxButton
              size="large"
              disabled={!passwordInput || !iKnow}
              onPress={() => {
                if (manualSignature && mSig) {
                  setSignatureData(mSig);
                } else {
                  setManualSignature(true);
                }
              }}
              variant="inverted"
            >
              {manualSignature
                ? mSig !== ''
                  ? t('linkPassword.submit')
                  : t('linkPassword.signManually')
                : t('linkPassword.signManually')}
            </FxButton>
          </FxBox>
          )}
        </FxBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};