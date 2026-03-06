import React, { useState } from 'react';
import {
  Alert,
  Linking,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  FxBox,
  FxButton,
  FxSafeAreaBox,
  FxText,
  useFxTheme,
} from '@functionland/component-library';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { blockchain, fula } from '@functionland/react-native-fula';
import {
  Routes,
  SettingsStackParamList,
} from '../../../navigation/navigationConfig';
import { useBloxsStore } from '../../../stores/useBloxsStore';
import { useDAppsStore } from '../../../stores/dAppsSettingsStore';
import { copyToClipboard } from '../../../utils/clipboard';
import { QRScannerModal } from './QRScannerModal';

type Props = NativeStackScreenProps<
  SettingsStackParamList,
  Routes.AutoPinPairing
>;

export const AutoPinPairingScreen = ({ route, navigation }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // Manual mode state
  const [tokenInput, setTokenInput] = useState('');
  const [endpointInput, setEndpointInput] = useState('');
  const [pairingSecret, setPairingSecret] = useState<string | null>(null);

  const bloxs = useBloxsStore((state) => state.bloxs);
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);
  const addOrUpdateDApp = useDAppsStore((state) => state.addOrUpdateDApp);

  const theme = useFxTheme();

  // Deep link params
  const token = route?.params?.token;
  const endpoint = route?.params?.endpoint;
  const returnUrl = route?.params?.returnUrl;

  const isDeepLinkMode = !!token;

  const currentBlox = bloxs[currentBloxPeerId];
  const bloxName = currentBlox?.name || 'My Blox';

  // Deep link mode handler (existing behavior)
  const handleDeepLinkPair = async () => {
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

        const alreadyPaired = result.status === 'already_paired';
        const alertTitle = alreadyPaired ? 'Already Paired' : 'Pairing Successful';
        const alertMsg = alreadyPaired
          ? `Auto-pinning was already enabled on ${bloxName}.`
          : `Auto-pinning is now enabled on ${bloxName}.`;

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
            alertTitle,
            `${alertMsg} Return to FxFiles?`,
            [
              { text: 'Stay Here', style: 'cancel' },
              {
                text: 'Open FxFiles',
                onPress: () => {
                  navigation.navigate(Routes.Settings);
                  Linking.openURL(finalUrl);
                },
              },
            ]
          );
        } else {
          Alert.alert(alertTitle, alertMsg);
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

  // Manual mode handler
  const handleManualPair = async () => {
    if (!tokenInput || !endpointInput) {
      setError('Please fill in both API Key and Endpoint');
      return;
    }

    setLoading(true);
    setError(null);
    setPairingSecret(null);

    try {
      await fula.isReady(false);

      const result = await blockchain.autoPinPair(tokenInput, endpointInput);

      if (result?.pairing_secret) {
        setPairingSecret(result.pairing_secret);
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

  const handleCopy = () => {
    if (pairingSecret) {
      copyToClipboard(pairingSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleQRScanned = (api: string, qrEndpoint: string) => {
    setTokenInput(api);
    setEndpointInput(qrEndpoint);
    setScannerVisible(false);
  };

  // Deep link mode UI (unchanged behavior)
  if (isDeepLinkMode) {
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
              onPress={handleDeepLinkPair}
              disabled={loading || !token || !endpoint}
            >
              {loading ? 'Pairing...' : 'Enable Auto-Pin'}
            </FxButton>
          )}
        </FxBox>
      </FxSafeAreaBox>
    );
  }

  // Manual mode UI
  return (
    <FxSafeAreaBox flex={1} edges={['top']} paddingHorizontal="20">
      <FxBox marginTop="32">
        <FxText variant="h300" marginBottom="16">
          Auto-Pin Pairing
        </FxText>

        <FxText variant="bodyMediumRegular" marginBottom="24" color="content2">
          Scan a QR code or enter the API key and endpoint manually to pair an
          app for auto-pinning.
        </FxText>

        <FxButton
          size="large"
          marginBottom="24"
          onPress={() => setScannerVisible(true)}
        >
          Scan QR Code
        </FxButton>

        <FxText variant="bodySmallSemibold" marginBottom="8" color="content2">
          API Key
        </FxText>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.content1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.backgroundSecondary,
            },
          ]}
          value={tokenInput}
          onChangeText={setTokenInput}
          placeholder="Enter API key"
          placeholderTextColor={theme.colors.content3}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <FxText variant="bodySmallSemibold" marginBottom="8" color="content2">
          Endpoint
        </FxText>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.content1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.backgroundSecondary,
            },
          ]}
          value={endpointInput}
          onChangeText={setEndpointInput}
          placeholder="Enter endpoint URL"
          placeholderTextColor={theme.colors.content3}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

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

        {pairingSecret ? (
          <FxBox marginBottom="16">
            <FxText variant="bodySmallSemibold" marginBottom="8" color="content2">
              Pairing Secret
            </FxText>
            <TouchableOpacity onPress={handleCopy} activeOpacity={0.7}>
              <FxBox
                backgroundColor="backgroundSecondary"
                padding="16"
                borderRadius="s"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <FxText
                  variant="bodyMediumRegular"
                  color="content1"
                  style={styles.secretText}
                >
                  {pairingSecret}
                </FxText>
                <FxText
                  variant="bodySmallSemibold"
                  color={copied ? 'greenBase' : 'primary'}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </FxText>
              </FxBox>
            </TouchableOpacity>
          </FxBox>
        ) : (
          <FxButton
            size="large"
            onPress={handleManualPair}
            disabled={loading || !tokenInput || !endpointInput}
          >
            {loading ? 'Getting Secret...' : 'Get Secret'}
          </FxButton>
        )}
      </FxBox>

      <QRScannerModal
        visible={scannerVisible}
        onScanned={handleQRScanned}
        onClose={() => setScannerVisible(false)}
      />
    </FxSafeAreaBox>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
  },
  secretText: {
    flex: 1,
    marginRight: 12,
  },
});
