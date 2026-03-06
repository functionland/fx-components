import React, { useState, useCallback } from 'react';
import { Modal, StyleSheet, View, TouchableOpacity } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import { FxText } from '@functionland/component-library';

type Props = {
  visible: boolean;
  onScanned: (api: string, endpoint: string) => void;
  onClose: () => void;
};

export const QRScannerModal = ({ visible, onScanned, onClose }: Props) => {
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const device = useCameraDevice('back');

  const requestPermission = useCallback(async () => {
    const status = await Camera.requestCameraPermission();
    setPermissionStatus(status);
  }, []);

  React.useEffect(() => {
    if (visible) {
      setHasScanned(false);
      setError(null);
      requestPermission();
    }
  }, [visible, requestPermission]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (hasScanned || codes.length === 0) return;

      const value = codes[0].value;
      if (!value) return;

      try {
        const parsed = JSON.parse(value);
        if (parsed.api && parsed.endpoint) {
          setHasScanned(true);
          onScanned(parsed.api, parsed.endpoint);
        } else {
          setError('QR code missing "api" or "endpoint" fields');
        }
      } catch {
        setError('Invalid QR code format. Expected JSON with "api" and "endpoint".');
      }
    },
  });

  const renderContent = () => {
    if (permissionStatus === 'denied') {
      return (
        <View style={styles.centered}>
          <FxText color="content1" variant="bodyMediumRegular" style={styles.message}>
            Camera permission denied. Please enable it in your device settings.
          </FxText>
        </View>
      );
    }

    if (permissionStatus !== 'granted' || !device) {
      return (
        <View style={styles.centered}>
          <FxText color="content1" variant="bodyMediumRegular" style={styles.message}>
            Loading camera...
          </FxText>
        </View>
      );
    }

    return (
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={visible && !hasScanned}
        codeScanner={codeScanner}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {renderContent()}

        {error && (
          <View style={styles.errorBox}>
            <FxText color="content1" variant="bodySmallRegular" style={styles.message}>
              {error}
            </FxText>
          </View>
        )}

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <FxText color="content1" variant="bodySmallSemibold">
            Cancel
          </FxText>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    textAlign: 'center',
  },
  errorBox: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(220, 50, 50, 0.9)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(100, 100, 100, 0.8)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
});
