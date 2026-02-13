import React, { useRef, useCallback } from 'react';
import {
  FxBox,
  FxText,
  FxPressableOpacity,
  FxSafeAreaBox,
  FxRefreshIcon,
  useFxTheme,
} from '@functionland/component-library';
import { FlatList, Platform, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import notifee from '@notifee/react-native';
import OfficeBloxUnitDark from '../app/icons/office-blox-unit-dark.svg';
import OfficeBloxUnitLight from '../app/icons/office-blox-unit-light.svg';
import { useBloxsStore, useSettingsStore } from '../stores';
import { TBloxConectionStatus } from '../models';
import { CircleFilledIcon } from '../components/Icons';

const getStatusColor = (status?: TBloxConectionStatus) => {
  switch (status) {
    case 'CONNECTED':
      return 'successBase' as const;
    case 'SWITCHING':
    case 'CHECKING':
      return 'warningBase' as const;
    default:
      return 'errorBase' as const;
  }
};

const getStatusLabel = (status?: TBloxConectionStatus) => {
  switch (status) {
    case 'SWITCHING':
      return 'SWITCHING...';
    case 'CHECKING':
      return 'CHECKING...';
    case 'CONNECTED':
      return 'CONNECTED';
    case 'DISCONNECTED':
      return 'DISCONNECTED';
    default:
      return 'UNKNOWN';
  }
};

interface BloxGridItemProps {
  peerId: string;
  name: string;
  isCurrent: boolean;
  connectionStatus?: TBloxConectionStatus;
  colorScheme: string;
  onOpen: (peerId: string) => void;
  onCheckStatus: (peerId: string) => void;
}

const BloxGridItem = ({
  peerId,
  name,
  isCurrent,
  connectionStatus,
  colorScheme,
  onOpen,
  onCheckStatus,
}: BloxGridItemProps) => {
  const { colors } = useFxTheme();
  const Icon =
    colorScheme === 'dark' ? OfficeBloxUnitDark : OfficeBloxUnitLight;
  const statusColor = getStatusColor(connectionStatus);
  const isChecking =
    connectionStatus === 'CHECKING' || connectionStatus === 'SWITCHING';

  return (
    <FxPressableOpacity
      flex={1}
      margin="4"
      padding="12"
      borderRadius="s"
      alignItems="center"
      backgroundColor={isCurrent ? 'backgroundSecondary' : 'backgroundApp'}
      style={
        isCurrent
          ? { borderWidth: 2, borderColor: colors.primary }
          : { borderWidth: 1, borderColor: colors.border }
      }
      onPress={() => onOpen(peerId)}
    >
      <Icon width={48} height={48} />
      <FxText
        variant="bodySmallRegular"
        color="content1"
        marginTop="8"
        numberOfLines={1}
        textAlign="center"
      >
        {name}
      </FxText>

      <FxBox flexDirection="row" alignItems="center" marginTop="4">
        <CircleFilledIcon color={statusColor} width={8} height={8} />
        <FxText
          variant="bodyXSRegular"
          color={statusColor}
          paddingStart="4"
          numberOfLines={1}
        >
          {getStatusLabel(connectionStatus)}
        </FxText>
      </FxBox>

      <FxPressableOpacity
        marginTop="8"
        paddingVertical="4"
        paddingHorizontal="12"
        borderRadius="s"
        backgroundColor="backgroundSecondary"
        onPress={(e) => {
          e.stopPropagation();
          onCheckStatus(peerId);
        }}
        disabled={isChecking}
        style={{ opacity: isChecking ? 0.5 : 1 }}
      >
        <FxText variant="bodyXSRegular" color="content1">
          Status
        </FxText>
      </FxPressableOpacity>

      <FxPressableOpacity
        marginTop="4"
        paddingVertical="4"
        paddingHorizontal="12"
        borderRadius="s"
        backgroundColor={isCurrent ? 'backgroundApp' : 'primary'}
        onPress={(e) => {
          e.stopPropagation();
          onOpen(peerId);
        }}
        disabled={isCurrent}
        style={{ opacity: isCurrent ? 0.5 : 1 }}
      >
        <FxText
          variant="bodyXSRegular"
          color={isCurrent ? 'content3' : 'white'}
        >
          {isCurrent ? 'Current' : 'Open'}
        </FxText>
      </FxPressableOpacity>
    </FxPressableOpacity>
  );
};

export const BloxManagerScreen = () => {
  const navigation = useNavigation();
  const { colors } = useFxTheme();
  const resolveRef = useRef<(() => void) | null>(null);

  const bloxs = useBloxsStore((state) => state.bloxs);
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);
  const bloxsConnectionStatus = useBloxsStore(
    (state) => state.bloxsConnectionStatus
  );
  const switchToBlox = useBloxsStore((state) => state.switchToBlox);
  const checkBloxConnection = useBloxsStore(
    (state) => state.checkBloxConnection
  );
  const checkAllBloxStatus = useBloxsStore(
    (state) => state.checkAllBloxStatus
  );
  const isCheckingAll = useBloxsStore((state) => state._isCheckingAllStatus);
  const colorScheme = useSettingsStore((store) => store.colorScheme);

  const anyBloxBusy = Object.values(bloxsConnectionStatus).some(
    (s) => s === 'CHECKING' || s === 'SWITCHING'
  );
  const checkAllDisabled = isCheckingAll || anyBloxBusy;

  const bloxList = Object.entries(bloxs || {}).map(([peerId, blox]) => ({
    peerId,
    name: blox.name,
  }));

  const handleOpen = useCallback(
    (peerId: string) => {
      if (peerId === currentBloxPeerId) return;
      switchToBlox(peerId);
      navigation.goBack();
    },
    [currentBloxPeerId, switchToBlox, navigation]
  );

  const handleCheckStatus = useCallback(
    (peerId: string) => {
      if (peerId === currentBloxPeerId) {
        // Current blox — just check connection directly
        checkBloxConnection(1, 5);
      } else {
        // Non-current blox — must switch to it (which also checks)
        switchToBlox(peerId);
      }
    },
    [currentBloxPeerId, checkBloxConnection, switchToBlox]
  );

  const handleCheckAllStatus = useCallback(async () => {
    if (checkAllDisabled) return;

    const transactionPromise = new Promise<void>((resolve) => {
      resolveRef.current = resolve;
    });

    if (Platform.OS === 'android') {
      try {
        notifee.registerForegroundService(() => transactionPromise);
        await notifee.displayNotification({
          id: 'checkAllStatus',
          title: 'Checking Blox Status',
          body: 'Checking connection to all blox devices...',
          android: {
            progress: { indeterminate: true },
            ongoing: true,
            asForegroundService: true,
            channelId: 'sticky',
            pressAction: { id: 'default' },
          },
        });
      } catch {
        // Notification may fail — continue anyway
      }
    }

    try {
      await checkAllBloxStatus();
    } finally {
      resolveRef.current?.();
      if (Platform.OS === 'android') {
        try {
          await notifee.stopForegroundService();
          await notifee.cancelNotification('checkAllStatus');
        } catch {
          // Cleanup may fail — ignore
        }
      }
    }
  }, [checkAllDisabled, checkAllBloxStatus]);

  const renderItem = useCallback(
    ({ item }: { item: { peerId: string; name: string } }) => (
      <BloxGridItem
        peerId={item.peerId}
        name={item.name}
        isCurrent={item.peerId === currentBloxPeerId}
        connectionStatus={bloxsConnectionStatus[item.peerId]}
        colorScheme={colorScheme}
        onOpen={handleOpen}
        onCheckStatus={handleCheckStatus}
      />
    ),
    [
      currentBloxPeerId,
      bloxsConnectionStatus,
      colorScheme,
      handleOpen,
      handleCheckStatus,
    ]
  );

  // Pad the list so the last row fills 2 columns
  const paddedList = [...bloxList];
  while (paddedList.length % 2 !== 0) {
    paddedList.push({ peerId: `__empty_${paddedList.length}`, name: '' });
  }

  return (
    <FxSafeAreaBox flex={1} backgroundColor="backgroundApp">
      {/* Header */}
      <FxBox
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="20"
        paddingVertical="12"
      >
        <FxBox flexDirection="row" alignItems="center" flex={1}>
          <FxPressableOpacity
            onPress={() => navigation.goBack()}
            paddingRight="12"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FxText variant="bodyLargeRegular" color="content1">
              {'<'}
            </FxText>
          </FxPressableOpacity>
          <FxText variant="h300" color="content1">
            Blox Manager
          </FxText>
        </FxBox>

        <FxPressableOpacity
          flexDirection="row"
          alignItems="center"
          paddingVertical="8"
          paddingHorizontal="12"
          borderRadius="s"
          backgroundColor={checkAllDisabled ? 'backgroundSecondary' : 'primary'}
          onPress={handleCheckAllStatus}
          disabled={checkAllDisabled}
          style={{ opacity: checkAllDisabled ? 0.7 : 1 }}
        >
          <FxRefreshIcon
            width={14}
            height={14}
            fill={checkAllDisabled ? colors.content3 : '#FFFFFF'}
          />
          <FxText
            variant="bodySmallRegular"
            color={checkAllDisabled ? 'content3' : 'white'}
            marginLeft="4"
          >
            {checkAllDisabled ? 'Checking...' : 'Check All'}
          </FxText>
        </FxPressableOpacity>
      </FxBox>

      {/* Grid */}
      <FlatList
        data={paddedList}
        keyExtractor={(item) => item.peerId}
        numColumns={2}
        renderItem={({ item }) => {
          if (item.peerId.startsWith('__empty_')) {
            return <FxBox flex={1} margin="4" />;
          }
          return renderItem({ item });
        }}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      />
    </FxSafeAreaBox>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
});
