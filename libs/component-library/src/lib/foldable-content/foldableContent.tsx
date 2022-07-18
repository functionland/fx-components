import React from 'react';
import {
  LayoutAnimation,
  Pressable,
  PressableProps,
  StyleSheet,
} from 'react-native';
import { FxBox } from '../box/box';
import { createBox, useTheme } from '@shopify/restyle';
import { FxTheme } from '../theme/theme';
import { FxSpacer } from '../spacer/spacer';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { FxChevronDownIcon } from '../icons/icons';

const ANIMATION_DURATION = 300;
const RestyledPressable = createBox<FxTheme, PressableProps>(Pressable);

type FxFoldableContentProps = Omit<
  React.ComponentProps<typeof RestyledPressable>,
  'onPress'
> & {
  header: React.ReactElement;
  onPress?: (expanded: boolean) => void;
  iconSize?: number;
  children: React.ReactElement;
};

export const FxFoldableContent = ({
  onPress,
  header,
  iconSize = 18,
  children,
  ...rest
}: FxFoldableContentProps) => {
  const theme = useTheme<FxTheme>();
  const [expanded, setExpanded] = React.useState(false);
  const rotation = useSharedValue(0);

  const iconAnimatedStyles = useAnimatedStyle(() => {
    return {
      transform: [{ rotateZ: `${rotation.value}deg` }],
    };
  });

  const pressHandler = () => {
    const expandedUpdated = !expanded;
    const rotationValue = expandedUpdated ? -180 : 0;
    onPress && onPress(expandedUpdated);
    setExpanded(expandedUpdated);
    configureEaseInOutLayoutAnimation(ANIMATION_DURATION);
    rotation.value = withTiming(rotationValue, {
      duration: ANIMATION_DURATION,
      easing: Easing.ease,
    });
  };

  return (
    <RestyledPressable onPress={pressHandler} {...rest}>
      <FxBox flexDirection="row">
        <Reanimated.View style={[styles.icon, iconAnimatedStyles]}>
          <FxChevronDownIcon color={theme.colors.content1} size={iconSize} />
        </Reanimated.View>
        <FxBox flex={1}>{header}</FxBox>
      </FxBox>
      {expanded && (
        <>
          <FxSpacer height={8} />
          {children}
        </>
      )}
    </RestyledPressable>
  );
};

const configureEaseInOutLayoutAnimation = (duration = 150) => {
  LayoutAnimation.configureNext({
    ...LayoutAnimation.Presets.easeInEaseOut,
    duration,
  });
};

const styles = StyleSheet.create({
  icon: {
    justifyContent: 'center',
  },
});
