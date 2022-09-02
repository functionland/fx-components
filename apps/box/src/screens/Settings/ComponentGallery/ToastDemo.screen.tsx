import {
  FxButton,
  FxSafeAreaBox,
  FxSpacer,
  useToast,
} from '@functionland/component-library';
import { HeaderText } from '../../../components/Text';
import React from 'react';

export const ToastDemoScreen = () => {
  const { showToast, queueToast } = useToast();

  const onPress = () => {
    showToast({
      title: 'Welcome to the Blox',
      message: "It's now possible to see stats  🎉!",
      type: 'info',
      autoHideDuration: 6000,
    });
  };

  return (
    <FxSafeAreaBox flex={1} marginHorizontal={'20'}>
      <HeaderText>Notifications</HeaderText>
      <FxSpacer marginTop="32" />
      <FxButton onPress={onPress}>Show Notification</FxButton>
      <FxSpacer marginTop="24" />
      <FxButton
        onPress={() =>
          queueToast({
            title: 'Queued Notification',
            message:
              'This notification is queued and will show after the previous one has been dismissed.',
            type: 'success',
            autoHideDuration: 5000,
          })
        }
      >
        Add Notification to the Queue
      </FxButton>
      <FxSpacer marginTop="24" />
      <FxButton
        onPress={() =>
          queueToast({
            title: 'Another Notification',
            message: 'This is a warning type notification.',
            type: 'warning',
            autoHideDuration: 4000,
          })
        }
      >
        Add Another Notification in the Queue
      </FxButton>
      <FxSpacer marginTop="24" />
      <FxButton
        onPress={() =>
          queueToast({
            title: 'Error Notification',
            message: 'This is a error type notification.',
            type: 'error',
            autoHideDuration: 3000,
          })
        }
      >
        Add Another Notification in the Queue
      </FxButton>
    </FxSafeAreaBox>
  );
};
