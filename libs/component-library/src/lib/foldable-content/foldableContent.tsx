import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import { createBox } from '@shopify/restyle';
import { FxTheme } from '../theme/theme';
import { configureEaseInOutLayoutAnimation } from '../utils/animations';
import { FxBox } from '../box/box';

const ANIMATION_DURATION = 300;
const RestyledPressable = createBox<FxTheme, PressableProps>(Pressable);

type FxFoldableContentProps = Omit<
  React.ComponentProps<typeof RestyledPressable>,
  'onPress'
> & {
  header: React.ReactNode;
  onPress?: (expanded: boolean) => void;
  animationDuration?: number;
  children: React.ReactNode;
};

export const FxFoldableContent = ({
  onPress,
  header,
  children,
  animationDuration = ANIMATION_DURATION,
  ...rest
}: FxFoldableContentProps) => {
  const [expanded, setExpanded] = React.useState(false);

  const pressHandler = () => {
    const expandedUpdated = !expanded;
    onPress && onPress(expandedUpdated);
    setExpanded(expandedUpdated);
    configureEaseInOutLayoutAnimation(animationDuration);
  };

  return (
    <RestyledPressable onPress={pressHandler} {...rest}>
      {header}
      {expanded && <FxBox>{children}</FxBox>}
    </RestyledPressable>
  );
};
