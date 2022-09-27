import {
  FxCard,
  FxChevronRightIcon,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
} from '@functionland/component-library';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import { HeaderText } from '../../components/Text';
import {
  Routes,
  ComponentGalleryStackNavigationProps,
} from '../../navigation/navigationConfig';

type GalleryItemType = {
  name: string;
  onPress: () => void;
};

export const ComponentGalleryScreen = () => {
  const navigation =
    useNavigation<ComponentGalleryStackNavigationProps<Routes.Gallery>>();
  const galleryItems: GalleryItemType[] = [
    {
      name: 'Avatars',
      onPress: () => {
        navigation.navigate(Routes.Avatars);
      },
    },
    {
      name: 'Buttons',
      onPress: () => {
        navigation.navigate(Routes.Buttons);
      },
    },
    {
      name: 'Button Groups',
      onPress: () => {
        navigation.navigate(Routes.ButtonGroups);
      },
    },
    {
      name: 'Forms',
      onPress: () => {
        navigation.navigate(Routes.Forms);
      },
    },
    {
      name: 'Notifications',
      onPress: () => {
        navigation.navigate(Routes.Toast);
      },
    },
    {
      name: 'Progress Bar',
      onPress: () => {
        navigation.navigate(Routes.ProgressBar);
      },
    },
    {
      name: 'Tabs',
      onPress: () => {
        navigation.navigate(Routes.Tabs);
      },
    },
    {
      name: 'Usage Bar',
      onPress: () => {
        navigation.navigate(Routes.UsageBar);
      },
    },
    {
      name: 'Table',
      onPress: () => {
        navigation.navigate(Routes.Table);
      },
    },
    {
      name: 'Breadcrumbs',
      onPress: () => {
        navigation.navigate(Routes.Breadcrumbs);
      },
    },
    {
      name: 'Files',
      onPress: () => {
        navigation.navigate(Routes.Files);
      },
    },
  ];

  const renderItem = React.useCallback<ListRenderItem<GalleryItemType>>(
    ({ item }) => {
      return (
        <FxCard
          onPress={item.onPress}
          justifyContent="space-between"
          flexDirection="row"
          alignItems="center"
        >
          <FxText variant="bodyMediumRegular">{item.name}</FxText>
          <FxChevronRightIcon color="content1" />
        </FxCard>
      );
    },
    []
  );

  return (
    <FxSafeAreaBox marginHorizontal="20" flex={1}>
      <HeaderText>Component Gallery</HeaderText>
      <FxSpacer height={16} />
      <FlatList
        data={galleryItems}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparatorComponent}
      />
    </FxSafeAreaBox>
  );
};

const ItemSeparatorComponent = () => {
  return <FxSpacer marginTop="8" />;
};
