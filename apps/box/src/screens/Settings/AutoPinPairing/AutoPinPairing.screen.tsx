import React, { useState } from 'react';
import { Alert, Linking } from 'react-native';
import {
  FxBox,
  FxButton,
  FxSafeAreaBox,
  FxText,
} from '@functionland/component-library';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { blockchain, fula } from '@functionland/react-native-fula';
import {
  Routes,
  SettingsStackParamList,
} from '../../../navigation/navigationConfig';
import { useBloxsStore } from '../../../stores/useBloxsStore';
import { useDAppsStore } from '../../../stores/dAppsSettingsStore';

type Props = NativeStackScreenProps<
  SettingsStackParamList,
  Routes.AutoPinPairing
>;

export const AutoPinPairingScreen = ({ route }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const bloxs = useBloxsStore((state) => state.bloxs);
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);
  const addOrUpdateDApp = useDAppsStore((state) => state.addOrUpdateDApp);

  const token = route?.params?.token;
  const endpoint = route?.params?.endpoint;
  const returnUrl = route?.params?.returnUrl;

  const currentBlox = bloxs[currentBloxPeerId];
  const bloxName = currentBlox?.name || 'My Blox';

  const handlePair = async () => {
    if (!token || !endpoint) {
      setError('Missing pairing parameters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fula.isReady(false);

      const result = await blockchain.autoPinPair(token, endpoint);

      if (result?.pairing_secret) {
        setSuccess(true);

        // Register as connected dApp
        addOrUpdateDApp({
          name: 'FxFiles Auto-Pin',
          peerId: '',
          bundleId: 'land.fx.files',
          bloxPeerId: currentBloxPeerId,
          authorized: true,
          lastUpdate: new Date(),
          storageUsed: 0,
        });

        // Return to FxFiles with pairing data
        if (returnUrl) {
          const finalUrl = decodeURIComponent(returnUrl)
            .replace('$secret', encodeURIComponent(result.pairing_secret))
            .replace('$hardwareId', encodeURIComponent(result.hardware_id || ''))
            .replace('$bloxPeerId', encodeURIComponent(currentBloxPeerId || ''))
            .replace('$bloxName', encodeURIComponent(bloxName));

          Alert.alert(
            'Pairing Successful',
            `Auto-pinning is now enabled on ${bloxName}. Return to FxFiles?`,
            [
              { text: 'Stay Here', style: 'cancel' },
              {
                text: 'Open FxFiles',
                onPress: () => {
                  Linking.openURL(finalUrl);
                },
              },
            ]
          );
        } else {
          Alert.alert(
            'Pairing Successful',
            `Auto-pinning is now enabled on ${bloxName}.`
          );
        }
      } else {
        setError('Unexpected response from blox');
      }
    } catch (e: any) {
      const msg = e?.message || e?.toString() || 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Note: We intentionally don't auto-trigger pairing.
  // User must read the confirmation and press the button.

  return (
    <FxSafeAreaBox flex={1} edges={['top']} paddingHorizontal="20">
      <FxBox marginTop="32">
        <FxText variant="h300" marginBottom="16">
          Auto-Pin Pairing
        </FxText>

        <FxText variant="bodyMediumRegular" marginBottom="24" color="content2">
          FxFiles wants to enable auto-pinning on your blox. This will
          automatically pin your uploaded files to{' '}
          <FxText variant="bodySmallSemibold">{bloxName}</FxText>, allowing you to
          download them directly from your local network.
        </FxText>

        {error && (
          <FxBox
            backgroundColor="errorBase"
            padding="16"
            borderRadius="s"
            marginBottom="16"
          >
            <FxText color="content1">{error}</FxText>
          </FxBox>
        )}

        {success ? (
          <FxBox
            backgroundColor="greenBackground"
            padding="16"
            borderRadius="s"
          >
            <FxText color="content1">
              Auto-pinning is enabled! Your files will be automatically pinned
              to this blox.
            </FxText>
          </FxBox>
        ) : (
          <FxButton
            size="large"
            onPress={handlePair}
            disabled={loading || !token || !endpoint}
          >
            {loading ? 'Pairing...' : 'Enable Auto-Pin'}
          </FxButton>
        )}
      </FxBox>
    </FxSafeAreaBox>
  );
};
