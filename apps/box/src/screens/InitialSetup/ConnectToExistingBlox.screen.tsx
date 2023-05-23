import React, { useState } from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxText,
  FxSafeAreaBox,
  useToast,
  FxSpacer,
  FxCard,
  FxRadioButton,
  FxRadioButtonWithLabel,
} from '@functionland/component-library';
import { FlatList, ListRenderItem } from 'react-native';
import { SmallHeaderText, SubHeaderText } from '../../components/Text';
type DicoveryDeviceType = {
  ipAddress: string;
  peerId: string;
  authorizer: string;
  hardwareId: string;
};

export const ConnectToExistingBloxScreen = () => {
  const [data, setData] = useState<DicoveryDeviceType[]>(MockData)
  const handleOnItemPress = (hardwareId: string) => {
    if (checkboxState[hardwareId])
      delete checkboxState[hardwareId]
    else
      checkboxState[hardwareId] = true
    setCheckboxState({ ...checkboxState })
  }
  const [checkboxState, setCheckboxState] = React.useState<Record<string, boolean>>({});
  
  const renderItem = React.useCallback<ListRenderItem<DicoveryDeviceType>>(
    ({ item }) => {
      return (
        <FxCard
          onPress={() => handleOnItemPress(item.hardwareId)}
        >
          <FxCard.Row>
            <FxBox flexDirection='row' alignItems='center'>
              <FxRadioButton value={item.hardwareId} />
              <FxText variant="bodyMediumRegular" paddingStart='16'>{item.ipAddress}</FxText>
            </FxBox>
          </FxCard.Row>
          <FxText variant="bodySmallLight">{item.hardwareId}</FxText>
        </FxCard >
      );
    },
    []
  );
  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={60} />
      <SmallHeaderText marginTop='16'>Bloxs in your network</SmallHeaderText>
      <SubHeaderText marginTop='4' variant='bodySmallLight'>Select bloxs you want to add</SubHeaderText>
      <FxSpacer height={16} />
      <FxRadioButton.Group
        value={Object.keys(checkboxState)}
        onValueChange={() => null}
      >
        <FlatList
          data={data}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparatorComponent}
        />
      </FxRadioButton.Group>

    </FxSafeAreaBox>
  );
};

const ItemSeparatorComponent = () => {
  return <FxSpacer marginTop="4" />;
};

const MockData: DicoveryDeviceType[] = [{
  ipAddress: '192.168.1.100',
  peerId: '2342342-234234-sdf234234',
  hardwareId: '2sdsfsf-asfasff-asfafsasf-zvzxa-asqwqwr-afasfsdf-asafafa',
  authorizer: '12sd1-123123as-asdas-12123',
},
{
  ipAddress: '192.168.1.102',
  peerId: '2342342-234234-sdf234234-1231',
  hardwareId: '2sdsfsf-asfasff-asfafsasf-zvzxa-asqwqwr-afasfsdf-asafafa-123123-asd',
  authorizer: '12sd1-123123as-asdas-12123-asdasd',
}]