import {
  FxBox,
  FxFile,
  FxFileProps,
  FxHeader,
  FxHorizontalRule,
  FxRadioButton,
  FxRadioButtonWithLabel,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
} from '@functionland/component-library';
import { HeaderText } from '../../../components/Text';
import React from 'react';
import { ScrollView } from 'react-native';
import { SCREEN_WIDTH } from '@gorhom/bottom-sheet';

const demoFiles: Pick<FxFileProps, 'name' | 'details' | 'type'>[] = [
  { name: 'Folder name', details: 'Modified 09/30/22', type: 'folder' },
  {
    name: 'Resume.docx',
    details: 'Modified 09/30/22 | 2.22 MB',
    type: 'document',
  },
  {
    name: 'Meeting_recording.mp3',
    details: 'Modified 09/30/22 | 10.22 MB',
    type: 'audio',
  },
  {
    name: 'Presentation.pdf',
    details: 'Modified 09/30/22 | 1.22 MB',
    type: 'pdf',
  },
];
enum FileState {
  default = 'default',
  disabled = 'disabled',
}

export const FilesDemoScreen = () => {
  const [fileState, setFileState] = React.useState<FileState>(
    FileState.default
  );
  const [isList, setIsList] = React.useState(false);
  const [isOrderAscending, setIsOrderByAscending] = React.useState(false);

  return (
    <ScrollView>
      <FxSafeAreaBox marginHorizontal="20" flex={1}>
        <HeaderText>Files</HeaderText>
        <FxSpacer marginTop="24" />
        <FxText variant="bodySmallRegular" color="content1" marginBottom="8">
          Files Simple
        </FxText>
        <FxFile
          name="Folder name"
          compact={true}
          details={'Modified 09/30/22'}
          disabled={fileState === FileState.disabled}
          type="folder"
        />
        <FxSpacer height={8} />
        <FxText variant="bodySmallRegular" color="content1" marginBottom="8">
          Files Detailed
        </FxText>
        <FxFile
          name="Folder name"
          details={'Modified 09/30/22'}
          type="folder"
          compact={false}
          disabled={fileState === FileState.disabled}
        />
        <FxSpacer height={8} />
        <FxRadioButton.Group
          value={FileState[fileState]}
          onValueChange={(val) => setFileState(FileState[val])}
        >
          <FileStateOptions default disabled />
        </FxRadioButton.Group>
        <FxHorizontalRule marginVertical="20" />
        <FxHeader
          orderBy="name"
          isOrderAscending={isOrderAscending}
          setIsOrderByAscending={setIsOrderByAscending}
          isList={isList}
          setIsList={setIsList}
        />
        <FxSpacer height={16} />
        <FxBox
          justifyContent="center"
          flexDirection={isList ? 'column' : 'row'}
          flexWrap="wrap"
        >
          {demoFiles.map((file, index) => (
            <FxFile
              width={isList ? '100%' : SCREEN_WIDTH / 2 - 40}
              key={index}
              compact={!isList}
              {...file}
            />
          ))}
        </FxBox>
      </FxSafeAreaBox>
    </ScrollView>
  );
};

type FileStateOptionsType = {
  default?: boolean;
  disabled?: boolean;
};

const FileStateOptions = (props: FileStateOptionsType) => (
  <FxBox flexDirection="row">
    {props.default && (
      <>
        <FxRadioButtonWithLabel
          value={FileState.default}
          label={FileState.default}
        />
        <FxSpacer width={20} />
      </>
    )}
    {props.disabled && (
      <>
        <FxRadioButtonWithLabel
          value={FileState.disabled}
          label={FileState.disabled}
        />
        <FxSpacer width={20} />
      </>
    )}
  </FxBox>
);
