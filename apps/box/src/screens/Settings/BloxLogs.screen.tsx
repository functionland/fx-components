import {
  FxBox,
  useToast,
  FxDropdown,
  FxSpacer,
  FxCard,
  FxRefreshIcon,
  FxTextInput,
} from '@functionland/component-library';
import React from 'react';
import { SubHeaderText } from '../../components/Text';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { fxblox } from '@functionland/react-native-fula';
import { useLogger } from '../../hooks';
import { ActivityIndicator } from 'react-native';

export const BloxLogsScreen = () => {
  const logger = useLogger();
  const [selectedValue, setSelectedValue] = React.useState<string>('');
  const [log, setLog] = React.useState<string>('');
  const [tailCount, setTailCount] = React.useState<string>('30');
  const [loadingLogs, setLoadingLogs] = React.useState<boolean>(false);
  const [fulaIsReady] = useUserProfileStore((state) => [state.fulaIsReady]);
  const { queueToast } = useToast();
  const fetchContainerLogs = async (
    containerName: string,
    tailCount: string
  ) => {
    try {
      setLog('');
      if (containerName && containerName !== '') {
        setSelectedValue(containerName);
        if (fulaIsReady) {
          const logs = await fxblox.fetchContainerLogs(
            containerName,
            tailCount
          );
          logger.log('fetchContainerLogs', logs);
          if (logs.status) {
            setLog(logs.msg);
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
            { label: 'Fx', value: 'fula_fxsupport' },
          ]}
          title="Container Name"
        />
        <FxTextInput
          placeholder="Number of rows in log"
          value={tailCount}
          onChangeText={(txt) => setTailCount(txt)}
        />
      </FxBox>
      <FxSpacer marginTop="24" />
      <FxCard.Row>
        <FxCard.Title marginBottom="8">
          Last {tailCount} lines of Log for {selectedValue}
        </FxCard.Title>
        {loadingLogs ? (
          <ActivityIndicator />
        ) : (
          fetchContainerLogs && (
            <FxRefreshIcon
              color="white"
              onPress={() => fetchContainerLogs(selectedValue, tailCount)}
            />
          )
        )}
      </FxCard.Row>
      <FxCard.Row>
        <FxCard.Row.Data>{log}</FxCard.Row.Data>
      </FxCard.Row>
    </FxBox>
  );
};
