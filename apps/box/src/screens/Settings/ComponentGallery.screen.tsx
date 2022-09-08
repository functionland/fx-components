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
import { ComponentGalleryStackNavigationProps } from '../../navigation/navigationConfig';

type GalleryItemType = {
  name: string;
  onPress: () => void;
};

export const ComponentGalleryScreen = () => {
  const navigation =
    useNavigation<ComponentGalleryStackNavigationProps<'Gallery'>>();
  const galleryItems: GalleryItemType[] = [
    {
      name: 'Avatars',
      onPress: () => {
        navigation.navigate('Avatars');
      },
    },
    {
      name: 'Buttons',
      onPress: () => {
        navigation.navigate('Buttons');
      },
    },
    {
      name: 'Button Groups',
      onPress: () => {
        navigation.navigate('Button Groups');
      },
    },
    {
      name: 'Forms',
      onPress: () => {
        navigation.navigate('Forms');
      },
    },
    {
      name: 'Notifications',
      onPress: () => {
        navigation.navigate('Toast');
      },
    },
    {
      name: 'Progress Bar',
      onPress: () => {
        navigation.navigate('Progress Bar');
      },
    },
    {
      name: 'Tabs',
      onPress: () => {
        navigation.navigate('Tabs');
      },
    },
    {
      name: 'Usage Bar',
      onPress: () => {
        navigation.navigate('Usage Bar');
      },
    },
    {
      name: 'Table',
      onPress: () => {
        navigation.navigate('Table');
      },
    },
    {
      name: 'Breadcrumbs',
      onPress: () => {
        navigation.navigate('Breadcrumbs');
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
