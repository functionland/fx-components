import {
  FxSafeAreaBox,
  FxSpacer,
  FxBreadcrumbs,
  FxBreadcrumbsProps,
} from '@functionland/component-library';
import { HeaderText } from '../../../components/Text';
import React from 'react';
import { Alert } from 'react-native';

const demoPath: FxBreadcrumbsProps['path'] = [
  {
    label: 'Office Blox Unit',
    onPress: (item) => Alert.alert('Link clicked', `${item.label}`),
  },
  {
    label: 'Tower #2',
    onPress: (item) => Alert.alert('Link clicked', `${item.label}`),
  },
  {
    label: 'Card #3',
    onPress: (item) => Alert.alert('Link clicked', `${item.label}`),
  },
];

export const BreadcrumbsDemoScreen = () => {
  return (
    <FxSafeAreaBox flex={1} marginHorizontal={'20'}>
      <HeaderText>Breadcrumbs</HeaderText>
      <FxSpacer marginTop="24" />
      <FxBreadcrumbs path={demoPath} />
    </FxSafeAreaBox>
  );
};
