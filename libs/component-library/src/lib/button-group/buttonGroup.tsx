import React from 'react';
import { FxBox } from '../box/box';
import { FxPressableOpacity } from '../pressable-opacity/pressableOpacity';
import { FxText } from '../text/text';

type BgButtonProps = {
  text: string;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
};

const BgButton = ({ text, selected, onPress, disabled }: BgButtonProps) => {
  return (
    <FxPressableOpacity
      flex={1}
      alignItems="center"
      justifyContent="center"
      height={40}
      backgroundColor={
        selected ? (disabled ? 'backgroundSecondary' : 'content3') : undefined
      }
      onPress={onPress}
      disabled={selected || disabled}
      hitSlop={0}
    >
      <FxText
        color={
          selected
            ? disabled
              ? 'border'
              : 'backgroundApp'
            : disabled
            ? 'backgroundSecondary'
            : 'content3'
        }
      >
        {text}
      </FxText>
    </FxPressableOpacity>
  );
};

type FxButtonGroupProps = {
  items: Array<string>;
  selectedIdx?: number | null;
  onSelect: (idx: number) => void;
  disabled?: boolean;
};
export const FxButtonGroup = ({
  items,
  selectedIdx = null,
  disabled = false,
  onSelect,
}: FxButtonGroupProps) => {
  const selectHandler = (idx: number) => {
    if (idx !== selectedIdx) {
      onSelect(idx);
    }
  };

  return (
    <FxBox
      flexDirection="row"
      borderWidth={1}
      borderColor={disabled ? 'backgroundSecondary' : 'content3'}
      borderRadius="s"
    >
      {items
        .map((item, idx) => {
          const isSelected = idx === selectedIdx;
          return (
            <BgButton
              text={item}
              selected={isSelected}
              onPress={() => selectHandler(idx)}
              disabled={disabled}
            />
          );
        })
        .reduce((acc, cur) => {
          if (!acc) {
            return cur;
          } else {
            return (
              <>
                {acc}
                <FxBox
                  width={1}
                  backgroundColor={
                    disabled ? 'backgroundSecondary' : 'content3'
                  }
                />
                {cur}
              </>
            );
          }
        })}
    </FxBox>
  );
};
