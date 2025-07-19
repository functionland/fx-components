import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { usePools } from './usePools';
import { useWalletConnection } from './useWalletConnection';
import { Routes } from '../navigation/navigationConfig';

export interface Task {
  id: string | number;
  title: string;
  route?: () => void;
  isCompleted: boolean;
  isPending?: boolean;
}

export interface TasksState {
  tasks: Task[];
  completedTasks: (string | number)[];
  loading: boolean;
  refreshing: boolean;
}

export const useTasksLogic = () => {
  const { t } = useTranslation('tasks');
  const navigation = useNavigation();
  const { userIsMemberOfAnyPool, userActiveRequests } = usePools();
  const { connected, connectWallet } = useWalletConnection();

  const [state, setState] = useState<TasksState>({
    tasks: [],
    completedTasks: [],
    loading: false,
    refreshing: false,
  });

  // Navigate to pools screen
  const handleNavigateToPools = useCallback(() => {
    (navigation as any).navigate(Routes.SettingsTab, {
      screen: Routes.Pools,
    });
  }, [navigation]);

  // Check if user has pending requests
  const hasPendingRequest =
    userActiveRequests &&
    userActiveRequests.length > 0 &&
    userActiveRequests[0] !== '0';

  // Generate tasks based on current state
  const generateTasks = useCallback((): Task[] => {
    const tasks: Task[] = [
      {
        id: 'connect-wallet',
        title: t('connectWallet'),
        route: connected ? undefined : connectWallet,
        isCompleted: connected,
      },
      {
        id: 'join-pool',
        title: hasPendingRequest ? t('joinPoolPending') : t('joinPool'),
        route:
          connected && !userIsMemberOfAnyPool && !hasPendingRequest
            ? handleNavigateToPools
            : undefined,
        isCompleted: userIsMemberOfAnyPool,
        isPending: hasPendingRequest,
      },
    ];

    return tasks;
  }, [
    t,
    connected,
    userIsMemberOfAnyPool,
    hasPendingRequest,
    connectWallet,
    handleNavigateToPools,
  ]);

  // Update tasks when dependencies change
  useEffect(() => {
    const newTasks = generateTasks();
    const newCompletedTasks = newTasks
      .filter((task) => task.isCompleted)
      .map((task) => task.id);

    setState((prev) => ({
      ...prev,
      tasks: newTasks,
      completedTasks: newCompletedTasks,
    }));
  }, [generateTasks]);

  // Handle task press
  const handleTaskPress = useCallback((task: Task) => {
    if (task.route && !task.isCompleted) {
      task.route();
    }
  }, []);

  // Refresh tasks
  const refreshTasks = useCallback(() => {
    setState((prev) => ({ ...prev, refreshing: true }));

    // Simulate refresh delay
    setTimeout(() => {
      const newTasks = generateTasks();
      const newCompletedTasks = newTasks
        .filter((task) => task.isCompleted)
        .map((task) => task.id);

      setState((prev) => ({
        ...prev,
        tasks: newTasks,
        completedTasks: newCompletedTasks,
        refreshing: false,
      }));
    }, 1000);
  }, [generateTasks]);

  // Set loading state
  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  return {
    ...state,
    handleTaskPress,
    refreshTasks,
    setLoading,
    // Computed values
    hasCompletedTasks: state.completedTasks.length > 0,
    allTasksCompleted:
      state.tasks.length > 0 &&
      state.completedTasks.length === state.tasks.length,
    pendingTasksCount: state.tasks.filter((task) => task.isPending).length,
  };
};
