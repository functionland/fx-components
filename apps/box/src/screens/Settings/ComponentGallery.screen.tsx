import {
  FxCard,
  FxChevronRightIcon,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
} from '@functionland/component-library';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { FlatList, ListRenderItem, StyleSheet } from 'react-native';
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
      name: 'Button Groups',
      onPress: () => {
        navigation.navigate('Button Groups');
      },
    },
    {
      name: 'Progress Bar',
      onPress: () => {
        navigation.navigate('Progress Bar');
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
        contentContainerStyle={styles.listContainer}
      />
    </FxSafeAreaBox>
  );
};

const ItemSeparatorComponent = () => {
  return <FxSpacer marginTop="8" />;
};

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
  },
});
