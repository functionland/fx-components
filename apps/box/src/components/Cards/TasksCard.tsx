import React, { useEffect, useState } from 'react';
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
import { chainApi } from '@functionland/react-native-fula';
import { useNavigation } from '@react-navigation/native';
import { Pressable, ActivityIndicator } from 'react-native';

type ValueType = string | number;

type TaskListProps = {
  pools: Array<{ joined: boolean; requested: boolean }>;
  getPools: () => Promise<void>;
  currentBloxPeerId: string;
  accountId: string;
  routes: any;
};

export type Task = {
  id: ValueType;
  title: string;
  route: any;
};

export const TasksCard = ({
  pools,
  getPools,
  currentBloxPeerId,
  accountId,
  routes,
}: TaskListProps) => {
  const navigation = useNavigation();
  const tasks: Task[] = [
    { id: 1, title: 'Join Testnet >', route: routes.UsersTab },
    { id: 2, title: 'Join Closest Pool >', route: routes.Pools },
  ];

  const [completedTasks, setCompletedTasks] = useState<ValueType[]>([]);
  const { colors } = useFxTheme();
  const [refreshCard, setRefreshCard] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const handleTaskPress = (route: string) => {
    navigation.navigate(route, {
      screen: route,
    });
  };

  const checkTasks = async () => {
    if (!loading) {
      setLoading(true);
      await checkTestnetTask();
      await checkPoolTask();
      setLoading(false);
    }
  };

  const checkTestnetTask = async () => {
    try {
      const api = await chainApi.init();
      const gasBalanceStr = await chainApi.checkAccountBalance(api, accountId);

      if (gasBalanceStr && !gasBalanceStr.includes('Error')) {
        console.log(gasBalanceStr);
        const gasBalance = parseInt(gasBalanceStr, 10);
        console.log(gasBalance);
        if (gasBalance > 0) {
          setCompletedTasks((prev) => (prev.includes(1) ? prev : [...prev, 1]));
        } else {
          setCompletedTasks((prev) => prev.filter((id) => id !== 1));
        }
      }
    } catch (error) {
      console.error('Error checking testnet balance:', error);
    }
  };

  const checkPoolTask = async () => {
    try {
      const isPoolJoined =
        pools.some((pool) => pool.joined || pool.requested) &&
        currentBloxPeerId;

      if (isPoolJoined) {
        setCompletedTasks((prev) => (prev.includes(2) ? prev : [...prev, 2]));
      } else {
        setCompletedTasks((prev) => prev.filter((id) => id !== 2));
      }
    } catch (error) {
      console.error('Error checking pool status:', error);
    }
  };

  useEffect(() => {
    getPools();
  }, [currentBloxPeerId]);

  useEffect(() => {
    if (currentBloxPeerId && accountId) {
      checkTasks();
    }
  }, [pools, currentBloxPeerId, accountId, refreshCard]);

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
              <Pressable onPress={() => handleTaskPress(task.route)}>
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
