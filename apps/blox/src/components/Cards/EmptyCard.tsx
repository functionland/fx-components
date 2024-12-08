import React from 'react';
import { FxBox, FxButton, FxText } from '@functionland/component-library';

const DEVICE_CARD_HEIGHT = 264;

type TEmptyCard = {
  placeholder: string;
  showAddButton?: boolean;
  addButtonTitle?: string;
  onAddButtonPress?: VoidFunction;
};

export const EmptyCard = ({
  placeholder,
  showAddButton,
  addButtonTitle,
  onAddButtonPress,
}: TEmptyCard) => (
  <FxBox
    alignItems="center"
    borderColor="backgroundSecondary"
    borderRadius="s"
    borderStyle="dashed"
    borderWidth={1}
    height={DEVICE_CARD_HEIGHT}
    justifyContent="center"
    paddingHorizontal="24"
  >
    <FxText color="content1" variant="bodyMediumRegular" textAlign="center">
      {placeholder}
    </FxText>
    {showAddButton && (
      <FxButton
        onPress={() => {
          onAddButtonPress && onAddButtonPress();
        }}
        width="100%"
        marginTop="32"
      >
        {addButtonTitle || ''}
      </FxButton>
    )}
  </FxBox>
);
