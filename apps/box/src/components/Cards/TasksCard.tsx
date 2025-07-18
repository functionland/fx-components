import React, { useState } from 'react';
import {
  FxBox,
  FxCard,
  FxText,
  FxRadioButton,
  FxRadioButtonWithLabel,
  FxSpacer,
  useFxTheme,
  FxRefreshIcon,
} from '@functionland/component-library';
import { useNavigation } from '@react-navigation/native';
import { Pressable, ActivityIndicator } from 'react-native';
import { usePools } from '../../hooks/usePools';
import { useWalletConnection } from '../../hooks/useWalletConnection';
import { Routes } from '../../navigation/navigationConfig';

type ValueType = string | number;

interface Task {
  id: ValueType;
  title: string;
  route?: () => void;
}

export const TasksCard = () => {
  const navigation = useNavigation();
  const { userIsMemberOfAnyPool, userActiveRequests } = usePools();
  const { connected, connectWallet } = useWalletConnection();
  const [completedTasks, setCompletedTasks] = useState<ValueType[]>([]);
  const { colors } = useFxTheme();
  const [refreshCard, setRefreshCard] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleNavigateToPools = () => {
    navigation.navigate(Routes.SettingsTab, {
      screen: Routes.Pools,
    });
  };

  const handleTaskPress = (task: Task) => {
    if (task.route && !completedTasks.includes(task.id)) {
      task.route();
    }
  };

  // Check if user has pending requests
  const hasPendingRequest = userActiveRequests && userActiveRequests.length > 0 && userActiveRequests[0] !== '0';

  const tasks: Task[] = [
    // Always show connect wallet task
    {
      id: 'connect-wallet',
      title: 'Connect Wallet',
      route: connected ? undefined : connectWallet,
    },
    // Always show join pool task
    {
      id: 'join-pool',
      title: hasPendingRequest ? 'Join Pool (already tried to join pool. pending)' : 'Join Pool',
      route: connected && !userIsMemberOfAnyPool && !hasPendingRequest ? handleNavigateToPools : undefined,
    },
  ];

  // Update completed tasks based on current state
  React.useEffect(() => {
    const newCompletedTasks: ValueType[] = [];

    // Mark connect wallet as completed if connected
    if (connected) {
      newCompletedTasks.push('connect-wallet');
    }

    // Mark join pool as completed if user is member of any pool
    if (userIsMemberOfAnyPool) {
      newCompletedTasks.push('join-pool');
    }

    setCompletedTasks(newCompletedTasks);
  }, [connected, userIsMemberOfAnyPool]);

  return (
    <FxCard>
      <FxBox flexDirection="row" justifyContent="space-between">
        <FxCard.Title marginBottom="16">Action List</FxCard.Title>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <FxRefreshIcon
            fill={colors.content3}
            onPress={() => setRefreshCard(!refreshCard)}
          />
        )}
      </FxBox>
      <FxBox flexDirection="column">
        <FxRadioButton.Group value={completedTasks} onValueChange={() => {}}>
          {tasks.map((task, index) => (
            <React.Fragment key={task.id}>
              <Pressable onPress={() => handleTaskPress(task)}>
                <FxRadioButtonWithLabel
                  disabled
                  value={task.id}
                  label={task.title}
                />
              </Pressable>
              {index < tasks.length - 1 && <FxSpacer height={4} />}
            </React.Fragment>
          ))}
        </FxRadioButton.Group>
      </FxBox>
    </FxCard>
  );
};
