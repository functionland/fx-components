import React, { Dispatch, SetStateAction } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxInvertedCheckIcon,
  FxPressableOpacity,
  FxSpacer,
  FxText,
  useFxTheme,
} from '@functionland/component-library';
import { bloxInteractions } from '../../../api/blox';
import { EBloxInteractionType, TBloxInteraction } from '../../../models';

type TBloxInteractionModalProps = {
  selectedMode: EBloxInteractionType;
  onSelectMode: (mode: EBloxInteractionType) => void;
};

export const BloxInteractionModal = React.forwardRef<
  FxBottomSheetModalMethods,
  TBloxInteractionModalProps
>((_, ref) => {
  return (
    <FxBottomSheetModal ref={ref}>
      <FxBox>
        <FxText variant="bodyMediumRegular">Showing</FxText>
        <FxSpacer height={16} />
        {bloxInteractions.map((interaction) => (
          <BloxInteractionMenuItem
            key={interaction.mode}
            interaction={interaction}
            selected={interaction.mode === _.selectedMode}
            setSelectedMode={_.onSelectMode}
          />
        ))}
      </FxBox>
    </FxBottomSheetModal>
  );
});

type TBloxInteractionMenuItem = {
  interaction: TBloxInteraction;
  selected: boolean;
  setSelectedMode: Dispatch<SetStateAction<EBloxInteractionType>>;
};

const BloxInteractionMenuItem = ({
  interaction,
  selected,
  setSelectedMode,
}: TBloxInteractionMenuItem) => {
  const { colors } = useFxTheme();

  return (
    <FxPressableOpacity
      height={48}
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      borderBottomWidth={1}
      borderBottomColor="backgroundSecondary"
      paddingRight="4"
      onPress={() => setSelectedMode(interaction.mode)}
    >
      <FxText variant="bodySmallRegular">{interaction.title}</FxText>
      {selected ? (
        <FxInvertedCheckIcon width={20} height={20} fill={colors.primary} />
      ) : null}
    </FxPressableOpacity>
  );
};
