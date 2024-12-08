import React from 'react';
import {
  FxBox,
  FxHorizontalRule,
  FxPressableOpacity,
  FxSpacer,
  FxTag,
  FxText,
  FxChevronRightIcon,
  useFxTheme,
} from '@functionland/component-library';

type TQuoteStat = {
  divisionPercentage: number;
};

export const QuoteStat = ({ divisionPercentage }: TQuoteStat) => {
  const theme = useFxTheme();
  const poolPercentage = Math.round(divisionPercentage);

  return (
    <FxBox>
      <FxBox
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <FxText variant="bodySmallSemibold">Usage Summary</FxText>
        <FxTag>Low use</FxTag>
      </FxBox>
      <FxSpacer height={4} />
      <FxPressableOpacity
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        paddingVertical="8"
      >
        <FxBox flexDirection="row" alignItems="center">
          <FxBox
            width={6}
            height={6}
            borderRadius="l"
            backgroundColor="greenPressed"
          />
          <FxText marginLeft="4">{`${poolPercentage}% pool`}</FxText>
        </FxBox>
        <FxChevronRightIcon
          width={16}
          height={16}
          fill={theme.colors.content1}
        />
      </FxPressableOpacity>
      <FxHorizontalRule />
      <FxPressableOpacity
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        paddingVertical="8"
      >
        <FxBox flexDirection="row" alignItems="center">
          <FxBox
            width={6}
            height={6}
            borderRadius="l"
            backgroundColor="greenHover"
          />
          <FxText marginLeft="4">{`${100 - poolPercentage}% personal`}</FxText>
        </FxBox>
        <FxChevronRightIcon
          width={16}
          height={16}
          fill={theme.colors.content1}
        />
      </FxPressableOpacity>
    </FxBox>
  );
};
