import React from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { mixColor } from 'react-native-redash';
import { FxBox, FxBoxProps, FxReanimatedBox } from '../box/box';
import { FxFoldableContent } from '../foldable-content/foldableContent';
import { FxChevronDownIcon } from '../icons/icons';
import { FxSpacer } from '../spacer/spacer';
import { useFxTheme } from '../theme/useFxTheme';

type RowProps = Omit<FxBoxProps, 'children'> & {
  children: React.ReactNode;
  showSeparator?: boolean;
};
export const Row = ({ children, showSeparator = true, ...rest }: RowProps) => {
  return (
    <FxBox
      flexDirection="row"
      paddingHorizontal="12"
      paddingVertical="16"
      alignItems="center"
      borderBottomWidth={showSeparator ? 1 : 0}
      borderBottomColor="backgroundSecondary"
      {...rest}
    >
      {children}
    </FxBox>
  );
};

const ANIMATION_DURATION = 300;

type RowGroupProps = {
  firstRow: React.ReactNode;
  hiddenRow: React.ReactNode;
  iconWidth?: number;
  showSeparator?: boolean;
};

export const RowGroup = ({
  firstRow,
  hiddenRow,
  iconWidth = 32,
  showSeparator = true,
}: RowGroupProps) => {
  const rotation = useSharedValue(0);
  const backgroundAnimationValue = useSharedValue(0);
  const theme = useFxTheme();

  const iconAnimatedStyles = useAnimatedStyle(() => {
    return {
      transform: [{ rotateZ: `${rotation.value}deg` }],
    };
  });

  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: mixColor(
        backgroundAnimationValue.value,
        theme.colors.backgroundApp,
        theme.colors.backgroundPrimary
      ) as string,
    };
  });

  const onPressHandler = (expanded: boolean) => {
    const rotationValue = expanded ? -180 : 0;
    const backgroundValue = expanded ? 1 : 0;
    rotation.value = withTiming(rotationValue, {
      duration: ANIMATION_DURATION,
      easing: Easing.ease,
    });

    backgroundAnimationValue.value = withTiming(backgroundValue, {
      duration: ANIMATION_DURATION,
    });
  };

  return (
    <FxReanimatedBox
      borderBottomWidth={showSeparator ? 1 : 0}
      borderBottomColor="backgroundSecondary"
      style={backgroundAnimatedStyle}
    >
      <FxFoldableContent
        paddingVertical="16"
        onPress={onPressHandler}
        header={
          <FxBox flexDirection="row" alignItems="center" marginRight="12">
            <FxReanimatedBox
              width={iconWidth}
              alignItems="center"
              justifyContent="center"
              style={[iconAnimatedStyles]}
            >
              <FxChevronDownIcon color="content1" width={10} height={10} />
            </FxReanimatedBox>
            <FxSpacer width={12} />
            {firstRow}
          </FxBox>
        }
      >
        <FxBox
          flexDirection="row"
          marginRight="12"
          alignItems="center"
          style={{ marginLeft: iconWidth + 12 }}
        >
          {hiddenRow}
        </FxBox>
      </FxFoldableContent>
    </FxReanimatedBox>
  );
};
