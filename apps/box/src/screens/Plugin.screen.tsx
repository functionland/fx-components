import React, { useState, useEffect } from 'react';
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
} from '@functionland/component-library';
import { RouteProp, useRoute } from '@react-navigation/native';
import { usePluginsStore } from '../stores/usePluginsStore';

type PluginInfo = {
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
    telegram?: string;
    twitter?: string;
    email?: string;
    website?: string;
    discord?: string;
  }>;
  instructions: Array<{
    order: number;
    description: string;
    url?: string;
  }>;
  requiredInputs: Array<{
    name: string;
    instructions: string;
    type: string;
    default: string;
  }>;
  approved: boolean;
};

type RouteParams = {
  Plugin: { name?: string };
};

export const PluginScreen = () => {
  const route = useRoute<RouteProp<RouteParams, 'Plugin'>>();
  const name = route.params?.name || '';
  const [pluginInfo, setPluginInfo] = useState<PluginInfo | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const { activePlugins, installPlugin, uninstallPlugin, listActivePlugins } =
    usePluginsStore();
  const isInstalled = activePlugins.includes(name);
  const { queueToast } = useToast();

  const handleReboot = async () => {
    try {
      // Call the reboot method here
      // For example: await fxblox.reboot();
      queueToast({
        type: 'success',
        title: 'Reboot Initiated',
        message: 'Your Blox is rebooting. Please wait...',
      });
    } catch (error) {
      queueToast({
        type: 'error',
        title: 'Reboot Failed',
        message: error.message || 'Failed to reboot Blox.',
      });
    }
  };

  const showRebootDialog = () => {
    Alert.alert(
      'Reboot Required',
      'To complete the installation, your Blox needs to be rebooted. Would you like to reboot now?',
      [
        {
          text: 'Reboot Now',
          onPress: handleReboot,
          style: 'destructive',
        },
        {
          text: 'Reboot Later',
          style: 'cancel',
        },
      ]
    );
  };

  useEffect(() => {
    const fetchPluginInfo = async () => {
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
      } catch (error) {
        console.error('Error fetching plugin info:', error);
        setPluginInfo(null);
        queueToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to fetch plugin information',
        });
      }
    };

    fetchPluginInfo();
    listActivePlugins();
  }, [name, listActivePlugins, queueToast]);

  const handleInstallUninstall = async () => {
    if (isInstalled) {
      const result = await uninstallPlugin(name);
      if (result.success) {
        await listActivePlugins();
        queueToast({
          type: 'success',
          title: 'Success',
          message: 'Plugin uninstalled successfully',
        });
      } else {
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

      const params = Object.entries(inputValues)
        .map(([key, value]) => `${key}====${value}`)
        .join(',,,,');
      const result = await installPlugin(name, params);
      if (result.success) {
        await listActivePlugins();
        queueToast({
          type: 'success',
          title: 'Success',
          message: 'Plugin installed successfully',
        });
        showRebootDialog();
      } else {
        queueToast({
          type: 'error',
          title: 'Install Error',
          message: result.message,
        });
      }
    }
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
            .map((instruction, index) => (
              <FxBox key={index} marginBottom="16">
                <FxText variant="bodyMediumRegular">{`${instruction.order}. ${instruction.description}`}</FxText>
                {instruction.url && (
                  <FxButton
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    onPress={() => openLink(instruction.url!)}
                    variant="inverted"
                    marginTop="4"
                  >
                    Open
                  </FxButton>
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
          <FxButton
            onPress={handleInstallUninstall}
            flexWrap="wrap"
            paddingHorizontal="16"
            iconLeft={isInstalled ? <FxTrashIcon /> : <FxPlusIcon />}
          >
            {isInstalled ? 'Uninstall' : 'Install'}
          </FxButton>
        </FxCard>
      </ScrollView>
    </FxSafeAreaBox>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },
});
