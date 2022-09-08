import React from 'react';
import { FxBox, FxBoxProps } from '../box/box';
import { FxChevronRightIcon } from '../icons/icons';
import { FxPressableOpacity } from '../pressable-opacity/pressableOpacity';
import { FxSpacer } from '../spacer/spacer';
import { FxText, FxTextProps } from '../text/text';
import { useFxTheme } from '../theme/useFxTheme';

type PathBase = {
  label: FxTextProps['children'];
  onPress: (item: PathBase) => void;
};

export type FxBreadcrumbsProps = FxBoxProps & {
  path: PathBase[];
};

export const FxBreadcrumbs = ({ path, ...rest }: FxBreadcrumbsProps) => {
  const { colors } = useFxTheme();

  return (
    <FxBox flexDirection="row" alignItems="center" {...rest}>
      {path.map((item, idx) => (
        <>
          <FxPressableOpacity
            onPress={() => item.onPress(item)}
            alignItems="center"
            justifyContent="center"
          >
            <FxText variant="bodyXSRegular" color="content1">
              {item.label}
            </FxText>
          </FxPressableOpacity>
          {idx !== path.length - 1 && (
            <>
              <FxSpacer width={6} />
              <FxChevronRightIcon
                fill={colors.content1}
                width="16"
                height="16"
              />
              <FxSpacer width={6} />
            </>
          )}
        </>
      ))}
    </FxBox>
  );
};
