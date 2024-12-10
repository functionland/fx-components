import React, { useRef, useState, useEffect } from 'react';
import { Alert, ActivityIndicator, Modal } from 'react-native';
import {
  FxArrowLeftIcon,
  FxLoadingSpinner,
  FxBox,
  FxPlugIcon,
  FxPressableOpacity,
  FxSafeAreaBox,
  FxText,
  useToast,
  FxCard,
  FxCopyIcon,
  FxRefreshIcon,
  FxKeyboardAwareScrollView,
  useFxTheme,
  FxButton,
  FxTextInput,
} from '@functionland/component-library';
import BleManager, { Peripheral } from 'react-native-ble-manager';
import { SmallHeaderText } from '../../../components/Text';
import { useLogger, useRootNavigation } from '../../../hooks';
import { copyToClipboard } from '../../../utils/clipboard';
import { BleManagerWrapper } from '../../../utils/ble';
import { EConnectionStatus } from '../../../models';

export const BluetoothCommandsScreen = () => {
  const rootNavigation = useRootNavigation();
  const [currentPeripheral, setCurrentPeripheral] = useState<Peripheral>(null);
  const [runningCommand, setRunningCommand] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [log, setLog] = useState('');
  const { queueToast } = useToast();
  const logger = useLogger();
  const { colors } = useFxTheme();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCodeModalVisible, setIsCodeModalVisible] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);

  type CommandButton = {
    label: string;
    command: string;
    dangerous?: boolean;
  };
  const commandButtons: CommandButton[] = [
    { label: 'Partition', command: 'partition' },
    { label: 'IPFS Delete', command: 'cluster_delete', dangerous: true },
    { label: 'Restart Fula', command: 'restart_fula' },
    { label: 'Restart Uniondrive', command: 'restart_uniondrive' },
    { label: 'Hotspot', command: 'hotspot' },
    { label: 'Reset', command: 'reset', dangerous: true },
  ];

  const executeCommand = async (command: string) => {
    setPendingCommand(command);
    setSecurityCode('');
    setIsCodeModalVisible(true);
  };

  // Initialize BLE manager with status callback
  const bleManager = React.useMemo(
    () =>
      new BleManagerWrapper((status) => {
        if (status === EConnectionStatus.connected) {
          queueToast({
            type: 'success',
            title: 'Connected to Blox device',
          });
        } else if (status === EConnectionStatus.failed) {
          queueToast({
            type: 'error',
            title: 'Failed to connect to Blox device',
          });
        }
      }),
    []
  );

  const handleCodeSubmit = async () => {
    try {
      setIsCodeModalVisible(false);
      if (securityCode !== '1234' || !pendingCommand) {
        queueToast({
          type: 'error',
          title: 'Invalid Code',
          message: 'Please enter the correct code provided by support team',
        });
        return;
      }

      setLoadingLogs(true);
      if (currentPeripheral?.id) {
        const response = await bleManager.writeToBLEAndWaitForResponse(
          `logs ${JSON.stringify({ exec: [pendingCommand] })}`,
          currentPeripheral.id
        );
        if (response) {
          queueToast({
            type: 'success',
            title: 'Command executed successfully',
          });
          fetchFullLogs(
            {
              docker: ['fula_go', 'ipfs_host', 'ipfs_cluster'],
              system: ['df', 'fula', 'docker', 'uniondrive', 'docker_ps', 'ls'],
            },
            currentPeripheral
          );
        }
      }
    } catch (error) {
      logger.logError('executeCommand', error);
      queueToast({
        type: 'error',
        title: 'Failed to execute command',
        message: error.message,
      });
    } finally {
      setLoadingLogs(false);
      setPendingCommand(null);
    }
  };

  const connectViaBLE = async () => {
    try {
      setRunningCommand(true);
      setIsConnecting(true);
      const connected = await bleManager.connect();
      const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
      const isConnectedBLE = connectedPeripherals.length > 0;
      if (isConnectedBLE) {
        setCurrentPeripheral(connectedPeripherals[0]);
        console.log({ connectedPeripherals });
        fetchFullLogs(
          {
            docker: ['fula_go', 'ipfs_host', 'ipfs_cluster'],
            system: ['df', 'fula', 'docker', 'uniondrive', 'docker_ps', 'ls'],
          },
          connectedPeripherals[0]
        );
      }
      return connected;
    } catch (error) {
      logger.logError('connectViaBLE', error);
      queueToast({
        type: 'error',
        title: 'Connection failed',
        message: error.message,
      });
      return false;
    } finally {
      setRunningCommand(false);
      setIsConnecting(false);
    }
  };

  const fetchFullLogs = async (
    params: {
      docker: string[];
      system: string[];
    },
    peripheral: Peripheral | undefined
  ) => {
    try {
      console.log('fetchFullLogs');
      console.log({ params });
      setLoadingLogs(true);
      if (!peripheral?.id) {
        peripheral = currentPeripheral;
      }
      if (peripheral?.id) {
        const response = await bleManager.writeToBLEAndWaitForResponse(
          `logs ${JSON.stringify(params)}`,
          peripheral.id
        );
        if (response) {
          // Format the response object into readable text
          const formattedLog = formatLogResponse(response);
          setLog(formattedLog);
        }
      }
    } catch (error) {
      logger.logError('fetchFullLogs', error);
      queueToast({
        type: 'error',
        title: 'Failed to fetch logs',
        message: error.message,
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  const formatLogResponse = (response: any): string => {
    let formatted = '';

    // Format Docker logs
    formatted += '=== Docker Logs ===\n\n';
    for (const [container, logs] of Object.entries(response.docker)) {
      formatted += `## ${container}\n${logs || 'No logs available'}\n\n`;
    }

    // Format System logs
    formatted += '=== System Logs ===\n\n';
    for (const [command, output] of Object.entries(response.system)) {
      formatted += `## ${command}\n`;

      if (command === 'df') {
        formatted += `=== df -hT ===\n${output.df}\n\n`;
        formatted += `=== lsblk ===\n${output.lsblk}\n\n`;
      } else if (command === 'docker_ps') {
        formatted += `=== Containers ===\n${output.containers}\n\n`;
        formatted += `=== Images ===\n${output.images}\n\n`;
      } else if (command === 'ls') {
        for (const [path, result] of Object.entries(output)) {
          formatted += `=== ${path} ===\n${result}\n\n`;
        }
      } else {
        formatted += `${output || 'No output available'}\n\n`;
      }
    }

    return formatted;
  };

  // Clean up BLE connection on unmount
  useEffect(() => {
    return () => {
      bleManager.cleanup();
    };
  }, []);

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxPressableOpacity onPress={() => rootNavigation.pop()}>
        <FxArrowLeftIcon color="white" />
      </FxPressableOpacity>
      <FxBox
        marginTop="16"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <SmallHeaderText>Bluetooth commands</SmallHeaderText>
        <FxPlugIcon
          color={currentPeripheral ? 'greenBase' : 'white'}
          onPress={() => !runningCommand && !isConnecting && connectViaBLE()}
        />
      </FxBox>
      {!currentPeripheral?.id ? (
        <FxBox flex={1} justifyContent="center" alignItems="center">
          {isConnecting ? (
            <FxBox flexDirection="row" alignItems="center">
              <FxText variant="bodyMediumRegular">
                Connecting to Bluetooth...
              </FxText>
              <FxLoadingSpinner marginLeft="4" />
            </FxBox>
          ) : (
            <FxText variant="bodyMediumRegular">
              Click the plug icon in the top right corner to connect to your
              FxBlox device using Bluetooth
            </FxText>
          )}
        </FxBox>
      ) : (
        <>
          <FxBox
            flexDirection="row"
            flexWrap="wrap"
            justifyContent="space-between"
            marginBottom="16"
          >
            {commandButtons.map((btn, index) => (
              <FxBox key={btn.command} width="30%" marginBottom="8">
                <FxButton
                  variant={btn.dangerous ? 'inverted' : undefined}
                  size="large"
                  onPress={() => {
                    Alert.alert(
                      'Confirm Action',
                      `Are you sure you want to execute ${btn.label}?`,
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                        {
                          text: 'Yes',
                          onPress: () => executeCommand(btn.command),
                          style: btn.dangerous ? 'destructive' : 'default',
                        },
                      ]
                    );
                  }}
                >
                  {btn.label}
                </FxButton>
              </FxBox>
            ))}
          </FxBox>
          <FxCard.Row>
            <FxCard.Title marginBottom="8">
              Share the logs below with support team by clicking on the copy
              icon
            </FxCard.Title>
            {loadingLogs ? (
              <ActivityIndicator />
            ) : (
              <>
                <FxCopyIcon
                  fill={colors.content3}
                  onPress={() => copyToClipboard(log)}
                />
                <FxRefreshIcon
                  fill={colors.content3}
                  onPress={() =>
                    fetchFullLogs(
                      {
                        docker: ['fula_go', 'ipfs_host', 'ipfs_cluster'],
                        system: [
                          'df',
                          'fula',
                          'docker',
                          'uniondrive',
                          'docker_ps',
                          'ls',
                        ],
                      },
                      undefined
                    )
                  }
                />
              </>
            )}
          </FxCard.Row>
          <FxCard.Row>
            <FxKeyboardAwareScrollView>
              <FxText>{log}</FxText>
            </FxKeyboardAwareScrollView>
          </FxCard.Row>
        </>
      )}
      <Modal
        visible={isCodeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCodeModalVisible(false)}
      >
        <FxBox
          flex={1}
          backgroundColor="backgroundSecondary"
          justifyContent="center"
          alignItems="center"
          padding="16"
        >
          <FxBox
            backgroundColor="backgroundPrimary"
            padding="16"
            borderRadius="m"
            width="100%"
            maxWidth={400}
          >
            <FxText variant="bodyLargeRegular" marginBottom="16">
              Enter the code given to you by the support team
            </FxText>
            <FxTextInput
              secureTextEntry
              value={securityCode}
              onChangeText={setSecurityCode}
              keyboardType="numeric"
              maxLength={4}
              marginBottom="16"
            />
            <FxBox flexDirection="row" justifyContent="flex-end">
              <FxButton
                variant="inverted"
                onPress={() => setIsCodeModalVisible(false)}
                marginRight="8"
              >
                Cancel
              </FxButton>
              <FxButton
                onPress={handleCodeSubmit}
                disabled={securityCode.length !== 4}
              >
                Submit
              </FxButton>
            </FxBox>
          </FxBox>
        </FxBox>
      </Modal>
    </FxSafeAreaBox>
  );
};
