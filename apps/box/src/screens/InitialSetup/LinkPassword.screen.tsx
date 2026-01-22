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
import { ActivityIndicator, ScrollView, Linking, Platform, Alert } from 'react-native';
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
  const [walletAddressInput, setWalletAddressInput] = useState('');
  const [identityReset, setIdentityReset] = useState(false);
  const [appStorageCleared, setAppStorageCleared] = useState(false);
  const setKeyChainValue = useUserProfileStore((state) => state.setKeyChainValue);
  const signiture = useUserProfileStore((state) => state.signiture);
  const password = useUserProfileStore((state) => state.password);
  const setWalletId = useUserProfileStore((state) => state.setWalletId);
  const setManualSignatureWalletAddress = useUserProfileStore((state) => state.setManualSignatureWalletAddress);
  const manualSignatureWalletAddress = useUserProfileStore((state) => state.manualSignatureWalletAddress);

  // Initialize wallet address from store on mount
  useEffect(() => {
    if (manualSignatureWalletAddress) {
      setWalletAddressInput(manualSignatureWalletAddress);
    }
  }, [manualSignatureWalletAddress]);

  // Computed value to determine if we have an identity (either cached or fresh)
  const hasIdentity = useMemo(() => {
    const hasCachedIdentity = !!(signiture && password);
    const hasFreshSignature = !!signatureData;
    console.log('Identity check:', { hasCachedIdentity, hasFreshSignature, identityReset, signiture: !!signiture, password: !!password, signatureData: !!signatureData });
    return (hasCachedIdentity || hasFreshSignature) && !identityReset;
  }, [signiture, password, signatureData, identityReset]);

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

        // Check if SDK connection is in a bad state (terminated/disconnected)
        // and reset it before attempting to connect
        const currentStatus = status?.connectionStatus;
        console.log('Current SDK connection status:', currentStatus);

        if (currentStatus === 'terminated' || currentStatus === 'disconnected' || !connected) {
          console.log('SDK in bad state, resetting connection...');
          try {
            // Disconnect first to clean up any stale state
            await sdk?.disconnect();
            // Small delay to let the SDK reset
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (e) {
            console.log('Reset disconnect error (non-fatal):', e);
          }
        }

        // Get provider
        const provider = await sdk?.getProvider();
        if (!provider) {
          throw new Error('Provider not available');
        }

        console.log('Current connection status:', { connected, account });

        // Connect to wallet first - this will open MetaMask
        console.log('Attempting to connect to wallet...');
        const accounts = await sdk?.connect();
        console.log('Connect response:', accounts);

        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get the current account from the provider
        const currentAccounts = await provider.request?.({
          method: 'eth_accounts',
        }) as string[];
        
        console.log('Current accounts from provider:', currentAccounts);
        
        if (!currentAccounts || currentAccounts.length === 0) {
          throw new Error('No account connected after wallet connection');
        }

        const connectedAccount = currentAccounts[0];
        console.log('Using account for signing:', connectedAccount);
        console.log('Message to sign:', msg);

        // Convert message to hex for compatibility
        const msgHex = '0x' + Buffer.from(msg).toString('hex');
        
        // Use provider.request directly for personal_sign
        console.log('Sending personal_sign request...');
        signature = (await provider.request?.({
          method: 'personal_sign',
          params: [msgHex, connectedAccount],
        })) as string;

        console.log('Signature received:', signature);
        resolveSigned();
        return signature;
    } catch (error) {
        console.error('personalSign error:', error);
        throw error;
    } finally {
        notifee.stopForegroundService();
        abortController.abort();
        // Clean up any remaining listeners
        const provider = await sdk?.getProvider();
        provider?.removeAllListeners();
    }
};


  const disconnectWallet = async () => {
    notifee.stopForegroundService();
    setLinking(false);
    // Use disconnect instead of terminate - terminate makes the SDK unusable
    // until the app is restarted
    try {
      // Clean up provider listeners first
      const provider = await sdk?.getProvider();
      provider?.removeAllListeners?.();
      await sdk?.disconnect();
      console.log('sdk disconnected');
    } catch (e) {
      console.log('sdk disconnect error (non-fatal):', e);
    }
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
      // Reset SDK state on error to allow retry
      try {
        const provider = await sdk?.getProvider();
        provider?.removeAllListeners?.();
        await sdk?.disconnect();
        console.log('SDK reset after error');
      } catch (e) {
        console.log('SDK reset error (non-fatal):', e);
      }
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
    setIdentityReset(true);
    queueToast({
      type: 'success',
      message: t('linkPassword.cachedDataCleared'),
      autoHideDuration: 3000,
    });
  };

  const handleOpenSignaturePortal = () => {
    // Save wallet address to store before opening browser
    if (walletAddressInput) {
      setManualSignatureWalletAddress(walletAddressInput);
    }
    Linking.openURL('https://fxblox.fx.land');
  };

  const handleClearAppStorage = () => {
    Alert.alert(
      t('linkPassword.clearAppStorageTitle'),
      t('linkPassword.clearAppStorageMessage'),
      [
        {
          text: t('linkPassword.cancel'),
          style: 'cancel',
        },
        {
          text: t('linkPassword.openSettings'),
          onPress: async () => {
            try {
              if (Platform.OS === 'android') {
                // Open app details settings on Android
                await Linking.openSettings();
              } else {
                // Open app settings on iOS
                await Linking.openSettings();
              }
              // Mark as cleared after user returns (they may or may not have cleared)
              setAppStorageCleared(true);
            } catch (error) {
              console.error('Failed to open settings:', error);
              queueToast({
                type: 'error',
                message: t('linkPassword.failedToOpenSettings'),
                autoHideDuration: 3000,
              });
            }
          },
        },
      ]
    );
  };

  const handleManualSignatureButtonPress = () => {
    if (manualSignature && mSig) {
      // Mode 3: User has entered signature, submit
      // Save wallet address to store before submitting
      if (walletAddressInput) {
        console.log('Saving wallet address:', walletAddressInput);
        setManualSignatureWalletAddress(walletAddressInput);
      }
      setSignatureData(mSig);
    } else if (manualSignature) {
      // Mode 2: User clicked button, now show signature field and open URL
      handleOpenSignaturePortal();
    } else {
      // Mode 1: User enters password, show signature field
      setManualSignature(true);
    }
  };

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={40} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <FxBox paddingVertical="20">
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

        {/* Only show password input and checkboxes when NO existing identity is found */}
        {!(password && signiture) && (
          <FxBox paddingVertical="20">
            {/* Clear App Storage warning and button - shown when no saved identity */}
            {!appStorageCleared && (
              <FxBox marginBottom="20" padding="16" backgroundColor="backgroundSecondary" borderRadius="m">
                <FxText variant="bodyMediumRegular" textAlign="center" color="warningBase" marginBottom="12">
                  {t('linkPassword.clearStorageWarning')}
                </FxText>
                <FxButton
                  variant="inverted"
                  size="large"
                  onPress={handleClearAppStorage}
                >
                  {t('linkPassword.clearAppStorage')}
                </FxButton>
              </FxBox>
            )}
            {appStorageCleared && (
              <FxBox marginBottom="20" padding="12" backgroundColor="greenBase" borderRadius="m">
                <FxText variant="bodySmallRegular" textAlign="center" color="white">
                  {t('linkPassword.storageCleared')}
                </FxText>
              </FxBox>
            )}

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

            {/* Wallet Address field - only show when using manual signature */}
            {!linking && manualSignature && (
              <FxBox marginTop="16">
                <FxTextInput
                  caption={t('linkPassword.walletAddress')}
                  placeholder="0x..."
                  value={walletAddressInput}
                  onChangeText={setWalletAddressInput}
                />
              </FxBox>
            )}

            {/* Signature field - only show when using manual signature */}
            {!linking && manualSignature && (
              <FxBox marginTop="16">
                <FxTextInput
                  caption={t('linkPassword.signature')}
                  autoFocus
                  secureTextEntry
                  value={mSig}
                  onChangeText={setMSig}
                />
              </FxBox>
            )}

            <FxBox marginTop="20">
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
              {/* Only show metamask checkbox when NOT using manual signature */}
              {!manualSignature && (
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
              )}
            </FxBox>
          </FxBox>
        )}

        {/* Buttons section */}
        <FxBox paddingVertical="20">
          {password && signiture ? (
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
              {/* MetaMask signing button - only show when NOT in manual signature mode */}
              {!manualSignature && (
                <>
                  <FxButton
                    size="large"
                    disabled={!passwordInput || !iKnow || !metamaskOpen || !provider}
                    onPress={
                      linking
                        ? disconnectWallet
                        : handleLinkPassword
                    }
                  >
                    {linking ? (
                      <>
                        <ActivityIndicator />
                        <FxText marginLeft="8">{t('linkPassword.cancel')}</FxText>
                      </>
                    ) : (
                      t('linkPassword.signWithMetamask')
                    )}
                  </FxButton>
                  <FxSpacer height={10} />
                </>
              )}

              {/* Manual signature button - changes based on state */}
              <FxButton
                size="large"
                disabled={
                  !passwordInput || !iKnow || (manualSignature && !!mSig && !walletAddressInput)
                }
                onPress={handleManualSignatureButtonPress}
                variant="inverted"
              >
                {manualSignature
                  ? mSig !== ''
                    ? t('linkPassword.submit')
                    : t('linkPassword.getSignatureManually')
                  : t('linkPassword.signManually')}
              </FxButton>
            </FxBox>
          )}
        </FxBox>
      </ScrollView>
    </FxSafeAreaBox>
  );
};