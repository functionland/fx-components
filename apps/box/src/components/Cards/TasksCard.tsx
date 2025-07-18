import React from 'react';
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
import { Pressable, ActivityIndicator } from 'react-native';
import { useTasksLogic } from '../../hooks/useTasksLogic';
import { useTranslation } from 'react-i18next';

export const TasksCard = () => {
  const { t } = useTranslation('tasks');
  const { colors } = useFxTheme();
  const {
    tasks,
    completedTasks,
    loading,
    refreshing,
    handleTaskPress,
    refreshTasks,
  } = useTasksLogic();



  return (
    <FxCard>
      <FxBox flexDirection="row" justifyContent="space-between">
        <FxCard.Title marginBottom="16">{t('actionList')}</FxCard.Title>
        {loading || refreshing ? (
          <ActivityIndicator />
        ) : (
          <FxRefreshIcon
            fill={colors.content3}
            onPress={refreshTasks}
            accessibilityLabel={t('refreshTasks')}
            accessibilityHint="Refresh the task list to update completion status"
          />
        )}
      </FxBox>
      <FxBox flexDirection="column">
        <FxRadioButton.Group value={completedTasks} onValueChange={() => {}}>
          {tasks.map((task, index) => (
            <React.Fragment key={task.id}>
              <Pressable
                onPress={() => handleTaskPress(task)}
                accessibilityLabel={task.title}
                accessibilityHint={
                  task.isCompleted
                    ? t('taskCompleted')
                    : task.route
                      ? `Tap to ${task.title.toLowerCase()}`
                      : 'Task not available'
                }
                accessibilityRole="button"
                accessibilityState={{
                  checked: task.isCompleted,
                  disabled: !task.route || task.isCompleted
                }}
              >
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
