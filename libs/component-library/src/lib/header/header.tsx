import React from 'react';
import { GestureResponderEvent } from 'react-native';
import { FxBox } from '../box/box';
import { FxButton } from '../button/button';
import {
  FxGridSelectorProps,
  FxGridSelector,
} from '../grid-selector/gridSelector';
import { PlusIcon } from '../Icons';
import { FxSpacer } from '../spacer/spacer';
import { FxText } from '../text/text';

export type FxHeaderProps = {
  title?: string;
  onAddPress?: (event: GestureResponderEvent) => void;
} & Partial<FxGridSelectorProps>;

export const FxHeader = ({
  isList,
  setIsList,
  onAddPress,
  title,
  ...rest
}: FxHeaderProps) => {
  return (
    <FxBox
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      {...rest}
    >
      <FxText color="content1" variant="h200">
        {title}
      </FxText>
      <FxBox alignItems={'center'} flexDirection="row">
        {setIsList && typeof isList === 'boolean' && (
          <FxGridSelector isList={isList} setIsList={setIsList} />
        )}
        <FxSpacer width={12} />
        {onAddPress && (
          <FxButton
            onPress={onAddPress}
            width={40}
            icon={<PlusIcon fill={'white'} />}
          />
        )}
      </FxBox>
    </FxBox>
  );
};
