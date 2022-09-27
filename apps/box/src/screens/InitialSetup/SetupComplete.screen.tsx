import { FxButton } from '@functionland/component-library';
import React from 'react';
import { FxBox } from '@functionland/component-library';
import {
  useInitialSetupNavigation,
  useRootNavigation,
} from '../../hooks/useTypedNavigation';
import { Routes } from '../../navigation/navigationConfig';

export const SetupCompleteScreen = () => {
  const navigation = useInitialSetupNavigation();
  const rootNavigation = useRootNavigation();
  return (
    <FxBox padding="20">
      <FxButton
        marginBottom="8"
        onPress={() =>
          rootNavigation.reset({
            index: 0,
            routes: [{ name: Routes.MainTabs }],
          })
        }
      >
        Done
      </FxButton>
      <FxButton onPress={() => navigation.goBack()}>Back</FxButton>
    </FxBox>
  );
};
