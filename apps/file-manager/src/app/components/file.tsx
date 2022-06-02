import React from 'react';
import { Platform } from 'react-native';
import styled from 'styled-components/native';
import RNFetchBlob from 'rn-fetch-blob';
import * as mime from 'react-native-mime-types';
import Icon from 'react-native-vector-icons/AntDesign';

interface FileProps {
  title: string;
  icon: string;
  path: string;
}

const File: React.FC<FileProps> = ({ title, icon, path }) => {
  const onPress = Platform.select({
    ios: () => RNFetchBlob.ios.openDocument(path),
    android: () =>
      RNFetchBlob.android.actionViewIntent(path, mime.lookup(path)),
  });

  return (
    <ButtonContainer onPress={onPress}>
      <ButtonInner>
        <ButtonText>{title}</ButtonText>
        <Icon name={icon} size={24} color="#42413F" />
      </ButtonInner>
    </ButtonContainer>
  );
};

const ButtonText = styled.Text`
  color: #42413f;
  font-size: 18px;
  font-weight: 600;
  text-align: left;
  text-transform: uppercase;
`;

const ButtonInner = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

const ButtonContainer = styled.TouchableHighlight.attrs({
  underlayColor: `#E6E6E6`,
})`
  background-color: #f0f0f0;
  border-radius: 8px;
  margin-bottom: 12px;
  padding: 12px 20px;
`;

export { File };
