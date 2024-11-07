import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import {
  FxBox,
  FxCard,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
  FxButton,
  FxTag,
  FxTrashIcon,
  FxPlusIcon,
  useToast,
  FxRefreshIcon,
} from '@functionland/component-library';
import { RouteProp, useRoute } from '@react-navigation/native';
import { usePluginsStore } from '../stores/usePluginsStore';
import { copyToClipboard } from '../utils/clipboard';
import { CopyIcon } from '../components/Icons';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { useBloxsStore } from '../stores';

type RouteParams = {
  Plugin: { name: string };
};

interface PluginInfo {
  name: string;
  description: string;
  version: string;
  usage: {
    storage: string;
    compute: string;
    bandwidth: string;
    ram: string;
    gpu: string;
  };
  rewards: Array<{
    type: string;
    currency: string;
    link: string;
  }>;
  socials: Array<{
    [key: string]: string;
  }>;
  instructions: Array<{
    order: number;
    description: string;
    url?: string;
    paramId?: number;
  }>;
  requiredInputs: Array<{
    name: string;
    instructions: string;
    type: string;
    default: string;
  }>;
  outputs: Array<{
    name: string;
    id: number;
  }>;
  approved: boolean;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },
});

export const PluginScreen = () => {
  const route = useRoute<RouteProp<RouteParams, 'Plugin'>>();
  const name = route.params?.name || '';
  const [pluginInfo, setPluginInfo] = useState<PluginInfo | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [outputValues, setOutputValues] = useState<Record<string, string>>({});
  const {
    activePlugins,
    installPlugin,
    uninstallPlugin,
    listActivePlugins,
    updatePlugin,
    getInstallOutput,
    getInstallStatus,
  } = usePluginsStore();
  const isInstalled = activePlugins.includes(name);
  const { queueToast } = useToast();
  const [isInstalling, setIsInstalling] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState('');
  const [connectionReady, setConnectionReady] = useState(false);
  const [fulaIsReady] = useUserProfileStore((state) => [state.fulaIsReady]);
  const [checkBloxConnection] = useBloxsStore((state) => [
    state.checkBloxConnection,
  ]);
  const [revealedValues, setRevealedValues] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    const POLLING_INTERVAL = 5000; // 5 seconds
    let intervalId: string | number | NodeJS.Timeout | undefined;

    const updateConnectionStatus = async () => {
      try {
        const connection = await checkBloxConnection();
        if (connection) {
          setConnectionReady(connection);
          clearInterval(intervalId); // Stop polling when connection is successful
        }
      } catch (error) {
        console.error('Connection check failed:', error);
      }
    };

    if (fulaIsReady) {
      intervalId = setInterval(updateConnectionStatus, POLLING_INTERVAL);
      // Initial check immediately when fulaIsReady becomes true
      updateConnectionStatus();
    }

    // Cleanup function to clear interval when component unmounts or fulaIsReady changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fulaIsReady]);

  const fetchInstallOutput = useCallback(async () => {
    console.debug('fetchInstallOutput started', { pluginInfo, name });
    if (!pluginInfo) return;
    const outputParams = pluginInfo.outputs
      .map((output) => output.name)
      .join(',,,,');
    const result = await getInstallOutput(name, outputParams);
    console.debug(result);
    if (result.success) {
      try {
        const parsedOutput = JSON.parse(result.message);
        console.debug(parsedOutput);
        if (typeof parsedOutput === 'object' && parsedOutput !== null) {
          setOutputValues((prevOutputs) => {
            console.debug('Setting output values:', parsedOutput);
            return parsedOutput;
          });
        } else {
          console.error('Unexpected output format:', parsedOutput);
        }
      } catch (error) {
        console.error('Failed to parse install output:', error);
      }
    } else {
      console.error('Failed to fetch install output:', result.message);
    }
  }, [getInstallOutput, name, pluginInfo]);

  const fetchInstallStatus = useCallback(async () => {
    console.log('fetchInstallStatus called');
    if (!name) return;
    const result = await getInstallStatus(name);
    if (result.success) {
      if (result.message !== installStatus) {
        setInstallStatus(result.message);
        if (result.message === 'Installed' || result.message === '') {
          setIsInstalling(false);
          setIsUninstalling(false);
          await listActivePlugins();
        } else if (result.message === 'No Status') {
          // Do nothing for 'No Status'
        } else {
          setIsInstalling(true);
        }
      }
    } else {
      console.error('Failed to fetch install status:', result.message);
    }
  }, [getInstallStatus, name, listActivePlugins, installStatus]);

  const fetchPluginInfo = useCallback(async () => {
    if (!name) {
      setPluginInfo(null);
      return;
    }
    try {
      const response = await fetch(
        `https://raw.githubusercontent.com/functionland/fula-ota/refs/heads/main/docker/fxsupport/linux/plugins/${name}/info.json`
      );
      const data = await response.json();
      setPluginInfo(data);
      // Initialize input values with default values
      const initialInputs: Record<string, string> = {};
      data.requiredInputs.forEach((input) => {
        initialInputs[input.name] = input.default || '';
      });
      setInputValues(initialInputs);
      // Check if the plugin is installed and has instructions with parameters
      if (
        isInstalled &&
        data.instructions.some((instruction) => instruction.paramId)
      ) {
        console.debug('fetchInstallOutput called 3');
        await fetchInstallOutput();
      }

      // Fetch install status
      await fetchInstallStatus();
    } catch (error) {
      console.error('Error fetching plugin info:', error);
      setPluginInfo(null);
      queueToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch plugin information',
      });
    }
  }, [name, queueToast, isInstalled, fetchInstallStatus]);

  useEffect(() => {
    fetchPluginInfo();
    listActivePlugins();
  }, [name, listActivePlugins, installStatus, connectionReady]);

  useEffect(() => {
    console.log('useEffect called');
    let intervalId: NodeJS.Timeout;
    if (isInstalling || isUninstalling) {
      intervalId = setInterval(() => {
        fetchInstallStatus();
        if (isInstalling) {
          console.debug('fetchInstallOutput called 2');
          fetchInstallOutput();
        }
      }, 5000); // Check every 5 seconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isInstalling, isUninstalling]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (fetchInstallOutput) {
        console.debug('fetchInstallOutput called 1');
        fetchInstallOutput();
      }
    }, 5000);

    // Cleanup function to clear the timeout if the component unmounts
    return () => clearTimeout(timer);
  }, [name, pluginInfo]);

  const handleInstallUninstall = async () => {
    if (isInstalled) {
      setIsUninstalling(true);
      setInstallStatus('Uninstalling');
      const result = await uninstallPlugin(name);
      if (result.success) {
        setInstallStatus('Uninstalled');
        setTimeout(() => {
          setIsUninstalling(false);
          listActivePlugins();
          setInstallStatus('');
        }, 300000); // 5 minutes timeout
        queueToast({
          type: 'success',
          title: 'Success',
          message: 'Plugin uninstallation initiated',
        });
      } else {
        setIsUninstalling(false);
        setInstallStatus('');
        queueToast({
          type: 'error',
          title: 'Uninstall Error',
          message: result.message,
        });
      }
    } else {
      // Check if all required inputs are filled
      const missingInputs = pluginInfo?.requiredInputs.filter(
        (input) => !inputValues[input.name]
      );
      if (missingInputs && missingInputs.length > 0) {
        queueToast({
          type: 'error',
          title: 'Installation Error',
          message: `Please fill in all required inputs: ${missingInputs
            .map((i) => i.name)
            .join(', ')}`,
        });
        return;
      }

      setIsInstalling(true);
      setInstallStatus('Installing');
      const params = Object.entries(inputValues)
        .map(([key, value]) => `${key}====${value}`)
        .join(',,,,');
      const result = await installPlugin(name, params);
      if (result.success) {
        queueToast({
          type: 'success',
          title: 'Success',
          message: 'Plugin installation initiated',
        });
      } else {
        setIsInstalling(false);
        setInstallStatus('');
        queueToast({
          type: 'error',
          title: 'Install Error',
          message: result.message,
        });
      }
    }
  };

  const handleUpdate = async () => {
    Alert.alert(
      'Update Plugin',
      `Are you sure you want to update the ${name} plugin?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Update',
          onPress: async () => {
            try {
              const result = await updatePlugin(name);
              if (result.success) {
                setInstallStatus('Updating');
                queueToast({
                  type: 'success',
                  title: 'Success',
                  message: 'Plugin update initiated',
                });
              } else {
                queueToast({
                  type: 'error',
                  title: 'Update Error',
                  message: result.message,
                });
              }
            } catch (error) {
              queueToast({
                type: 'error',
                title: 'Update Error',
                message:
                  error instanceof Error
                    ? error.message
                    : 'An unknown error occurred',
              });
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error('An error occurred', err)
    );
  };

  if (!name) {
    return (
      <FxSafeAreaBox flex={1} edges={['top']}>
        <FxText>No plugin selected</FxText>
      </FxSafeAreaBox>
    );
  }

  if (!pluginInfo) {
    return (
      <FxSafeAreaBox flex={1} edges={['top']}>
        <FxText>Loading...</FxText>
      </FxSafeAreaBox>
    );
  }

  return (
    <FxSafeAreaBox flex={1} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <FxCard>
          <FxBox
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <FxBox>
              <FxCard.Title>{pluginInfo.name}</FxCard.Title>
              <FxText variant="bodyXSRegular">
                Version: {pluginInfo.version}
              </FxText>
            </FxBox>
            <FxTag>{pluginInfo.approved ? 'Approved' : 'Pending'}</FxTag>
          </FxBox>
          <FxSpacer marginTop="16" />
          <FxText variant="bodySmallRegular">{pluginInfo.description}</FxText>

          <FxSpacer marginTop="24" />
          <FxText variant="h400">Resource Usage</FxText>
          <FxCard.Row>
            <FxCard.Row.Title>Storage</FxCard.Row.Title>
            <FxCard.Row.Data>{pluginInfo.usage.storage}</FxCard.Row.Data>
          </FxCard.Row>
          <FxCard.Row>
            <FxCard.Row.Title>Compute</FxCard.Row.Title>
            <FxCard.Row.Data>{pluginInfo.usage.compute}</FxCard.Row.Data>
          </FxCard.Row>
          <FxCard.Row>
            <FxCard.Row.Title>Bandwidth</FxCard.Row.Title>
            <FxCard.Row.Data>{pluginInfo.usage.bandwidth}</FxCard.Row.Data>
          </FxCard.Row>
          <FxCard.Row>
            <FxCard.Row.Title>RAM</FxCard.Row.Title>
            <FxCard.Row.Data>{pluginInfo.usage.ram}</FxCard.Row.Data>
          </FxCard.Row>
          <FxCard.Row>
            <FxCard.Row.Title>GPU</FxCard.Row.Title>
            <FxCard.Row.Data>{pluginInfo.usage.gpu}</FxCard.Row.Data>
          </FxCard.Row>

          <FxSpacer marginTop="24" />
          <FxText variant="h400">Rewards</FxText>
          {pluginInfo.rewards.map((reward, index) => (
            <FxCard.Row key={index}>
              <FxCard.Row.Title>{reward.type}</FxCard.Row.Title>
              <FxCard.Row.Data>{reward.currency}</FxCard.Row.Data>
            </FxCard.Row>
          ))}

          <FxSpacer marginTop="24" />
          <FxText variant="h400">Socials</FxText>
          <FxBox flexDirection="row" flexWrap="wrap">
            {Object.entries(pluginInfo.socials[0]).map(
              ([platform, link]) =>
                link && (
                  <FxButton
                    key={platform}
                    onPress={() => openLink(link)}
                    variant="inverted"
                    marginRight="8"
                    marginBottom="0"
                  >
                    <FxText marginLeft="4" variant="bodyXXSRegular">
                      {platform}
                    </FxText>
                  </FxButton>
                )
            )}
          </FxBox>

          <FxSpacer marginTop="24" />
          <FxText variant="h400">Instructions</FxText>
          {pluginInfo.instructions
            .sort((a, b) => a.order - b.order)
            .map((instruction) => (
              <FxBox key={`instruction-${instruction.order}`} marginBottom="16">
                <FxText variant="bodyMediumRegular">{`${instruction.order}. ${instruction.description}`}</FxText>
                {instruction?.url && (
                  <FxButton
                    onPress={() => openLink(instruction.url!)}
                    variant="inverted"
                    marginTop="4"
                  >
                    Open
                  </FxButton>
                )}
                {Boolean(
                  instruction.paramId &&
                    outputValues[
                      pluginInfo.outputs.find(
                        (o) => o.id === instruction.paramId
                      )?.name ?? ''
                    ]
                ) && (
                  <>
                    {console.log(
                      'Rendering output value:',
                      outputValues[
                        pluginInfo.outputs.find(
                          (o) => o.id === instruction.paramId
                        )?.name ?? ''
                      ]
                    )}

                    <FxButton
                      onPress={() => {
                        const outputName =
                          pluginInfo.outputs.find(
                            (o) => o.id === instruction.paramId
                          )?.name ?? '';
                        const value = outputValues[outputName] || '';
                        copyToClipboard(value);
                        setRevealedValues((prev) => ({
                          ...prev,
                          [outputName]: true,
                        }));
                      }}
                      iconLeft={<CopyIcon />}
                      variant="inverted"
                      marginTop="4"
                    >
                      {`${pluginInfo.outputs.find(
                        (o) => o.id === instruction.paramId
                      )?.name}: ${(() => {
                        const outputName =
                          pluginInfo.outputs.find(
                            (o) => o.id === instruction.paramId
                          )?.name ?? '';
                        const value = outputValues[outputName] || '';
                        return revealedValues[outputName]
                          ? value
                          : value.replace(/./g, '•');
                      })()}`}
                    </FxButton>
                  </>
                )}
              </FxBox>
            ))}

          {!isInstalled && (
            <>
              <FxSpacer marginTop="24" />
              <FxText variant="h400">Required Inputs</FxText>
              {pluginInfo?.requiredInputs.map((input, index) => (
                <FxBox key={index} marginBottom="16">
                  <FxText variant="bodyMediumRegular">{input.name}</FxText>
                  <FxText variant="bodySmallRegular">
                    {input.instructions}
                  </FxText>
                  <TextInput
                    style={styles.input}
                    value={inputValues[input.name]}
                    onChangeText={(text) =>
                      setInputValues({ ...inputValues, [input.name]: text })
                    }
                    placeholder={input.default || `Enter ${input.name}`}
                  />
                </FxBox>
              ))}
            </>
          )}

          <FxSpacer marginTop="24" />
          {installStatus && (
            <FxBox marginTop="16">
              <FxText variant="bodySmallRegular">
                Status: {installStatus}
              </FxText>
            </FxBox>
          )}
          <FxBox flexDirection="row" justifyContent="space-between">
            <FxButton
              onPress={handleInstallUninstall}
              flexWrap="wrap"
              paddingHorizontal="16"
              iconLeft={isInstalled ? <FxTrashIcon /> : <FxPlusIcon />}
              disabled={
                isInstalling ||
                isUninstalling ||
                installStatus === 'Installing' ||
                installStatus === 'Uninstalling'
              }
            >
              {isInstalled ? 'Uninstall' : 'Install'}
              {installStatus && ` (${installStatus})`}
            </FxButton>
            {isInstalled && (
              <FxButton
                onPress={handleUpdate}
                flexWrap="wrap"
                paddingHorizontal="16"
                iconLeft={<FxRefreshIcon />}
                disabled={
                  isInstalling ||
                  isUninstalling ||
                  installStatus === 'Installing' ||
                  installStatus === 'Uninstalling'
                }
              >
                Update
              </FxButton>
            )}
          </FxBox>
        </FxCard>
      </ScrollView>
    </FxSafeAreaBox>
  );
};
