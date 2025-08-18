import {
  FxBox,
  useToast,
  FxDropdown,
  FxSpacer,
  FxCard,
  FxRefreshIcon,
  FxCopyIcon,
  FxTextInput,
  FxKeyboardAwareScrollView,
  FxText,
  useFxTheme,
} from '@functionland/component-library';
import React from 'react';
import { SubHeaderText } from '../../components/Text';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { fxblox } from '@functionland/react-native-fula';
import { useLogger } from '../../hooks';
import { ActivityIndicator } from 'react-native';
import { copyToClipboard } from '../../utils/clipboard';
import { usePluginsStore } from '../../stores/usePluginsStore';
import { CurrentBloxIndicator } from '../../components';

export const BloxLogsScreen = () => {
  const logger = useLogger();
  const [selectedValue, setSelectedValue] = React.useState<string>('');
  const [log, setLog] = React.useState<string>('');
  const [tailCount, setTailCount] = React.useState<string>('50');
  const [loadingLogs, setLoadingLogs] = React.useState<boolean>(false);
  const [fulaIsReady] = useUserProfileStore((state) => [state.fulaIsReady]);
  const [showOtherInput, setShowOtherInput] = React.useState<boolean>(false);
  const { queueToast } = useToast();
  const { colors } = useFxTheme();
  const { listActivePlugins, activePlugins } = usePluginsStore();

  React.useEffect(() => {
    listActivePlugins();
  }, [listActivePlugins]);

  const sanitizeLogData = (logString: string) => {
    // Regular expression to match non-printable characters except newlines
    // This regex matches characters in the control characters range (0x00-0x1F and 0x7F-0x9F) except for newline (0x0A)
    const regex = /[\u0000-\u0009\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g;

    // Replace matched characters with empty string, effectively removing them
    const sanitizedLog = logString.replace(regex, ' ');

    return sanitizedLog;
  };
  const fetchContainerLogs = async (
    containerName: string,
    tailCountInput: string
  ) => {
    try {
      setLog('');
      if (containerName === 'Other') {
        setShowOtherInput(true);
      } else {
        setShowOtherInput(false);
      }
      if (containerName && containerName !== '' && containerName !== 'Other') {
        setSelectedValue(containerName);
        if (fulaIsReady) {
          const logs = await fxblox.fetchContainerLogs(
            containerName,
            tailCountInput
          );
          logger.log('fetchContainerLogs', logs);
          if (logs.status) {
            const sanitizedLog = sanitizeLogData(logs.msg);
            console.log(sanitizedLog);
            setLog(sanitizedLog);
          } else {
            queueToast({
              title: 'Error in fetch log',
              message: logs.msg,
              type: 'error',
              autoHideDuration: 5000,
            });
          }
        }
      }
    } catch (error) {
      let err = '';
      if (error instanceof Error) {
        // If it's an Error instance, you can access the message property directly
        err = error.message;
      } else {
        // If it's not an Error instance, it might be a string or another type, so you handle it differently
        // For simplicity, convert it to a string and log it.
        err = String(error);
      }
      logger.logError('GetBloxSpace Error', error);
      queueToast({
        title: 'Error in fetch log',
        message: err,
        type: 'error',
        autoHideDuration: 5000,
      });
    } finally {
      setLoadingLogs(false);
    }
  };
  return (
    <FxBox
      marginHorizontal="20"
      flexDirection="column"
      justifyContent="space-between"
    >
      <SubHeaderText>Blox Logs</SubHeaderText>
      
      {/* Current Blox Indicator */}
      <FxBox marginBottom="16">
        <CurrentBloxIndicator compact={true} showConnectionStatus={true} />
      </FxBox>

      <FxBox
        marginHorizontal="0"
        flexDirection="row"
        justifyContent="space-between"
      >
        <FxDropdown
          selectedValue={selectedValue}
          onValueChange={(itemValue: string) =>
            fetchContainerLogs(itemValue, tailCount)
          }
          options={[
            { label: 'Select container name', value: '' },
            { label: 'Go-Fula', value: 'fula_go' },
            { label: 'Node', value: 'fula_node' },
            { label: 'IPFS', value: 'ipfs_host' },
            { label: 'IPFS Cluster', value: 'ipfs_cluster' },
            { label: 'Fx', value: 'fula_fxsupport' },
            { label: 'Service Logs', value: 'MainService' },
            ...(Array.isArray(activePlugins)
              ? activePlugins.map((plugin) => ({
                  label: plugin,
                  value: plugin,
                }))
              : []),
            { label: 'Other', value: 'Other' },
          ]}
          title="Container Name"
        />
        <FxTextInput
          placeholder="Number of rows in log"
          value={tailCount}
          onChangeText={(txt) => setTailCount(txt)}
        />
      </FxBox>
      <FxBox
        marginHorizontal="0"
        flexDirection="row"
        justifyContent="space-between"
      >
        <FxTextInput
          placeholder="Name of log"
          visible={showOtherInput}
          value={selectedValue}
          onChangeText={(txt) => {
            setSelectedValue(txt);
          }}
        />
      </FxBox>
      <FxSpacer marginTop="24" />
      <FxCard.Row>
        <FxCard.Title marginBottom="8">
          Last {tailCount} lines of log for {selectedValue}
        </FxCard.Title>
        {loadingLogs ? (
          <ActivityIndicator />
        ) : (
          fetchContainerLogs && (
            <>
              <FxCopyIcon
                fill={colors.content3}
                onPress={() => copyToClipboard(log)}
              />
              <FxRefreshIcon
                fill={colors.content3}
                onPress={() => fetchContainerLogs(selectedValue, tailCount)}
              />
            </>
          )
        )}
      </FxCard.Row>
      <FxCard.Row>
        <FxKeyboardAwareScrollView>
          <FxText>{log}</FxText>
        </FxKeyboardAwareScrollView>
      </FxCard.Row>
    </FxBox>
  );
};
