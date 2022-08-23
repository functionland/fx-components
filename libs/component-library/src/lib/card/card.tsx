import React from 'react';
import { createBox } from '@shopify/restyle';
import { GestureResponderEvent, Pressable, PressableProps } from 'react-native';
import { FxTheme } from '../theme/theme';
import { FxText, FxTextProps } from '../text/text';
import { FxBox, FxBoxProps } from '../box/box';
import { FxHorizontalRule } from '../horizontal-rule/horizontalRule';

const PressableBox = createBox<FxTheme, PressableProps>(Pressable);

export type FxCardProps = React.ComponentProps<typeof PressableBox>;

const FxCard = ({
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  onTouchMove,
  delayLongPress,
  disabled,
  ...rest
}: FxCardProps) => {
  const [isPressed, setIsPressed] = React.useState(false);
  const [pressTimer, setPressTimer] = React.useState<NodeJS.Timer | null>(null);

  const handlePressIn = (e: GestureResponderEvent) => {
    if (onPressIn) onPressIn(e);
    if (onLongPress) {
      setPressTimer(
        setTimeout(() => {
          setIsPressed(true);
        }, delayLongPress ?? 500)
      );
    } else {
      setIsPressed(true);
    }
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    setIsPressed(false);
    if (pressTimer) clearTimeout(pressTimer);
    if (onPressOut) onPressOut(e);
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    if (pressTimer) clearTimeout(pressTimer);
    if (onTouchMove) onTouchMove(e);
  };

  React.useEffect(() => {
    return () => {
      if (pressTimer) clearTimeout(pressTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PressableBox
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress}
      onTouchMove={handleTouchMove}
      delayLongPress={delayLongPress}
      disabled={(!onPress && !onLongPress) || disabled}
      padding="16"
      paddingVertical="24"
      backgroundColor="backgroundPrimary"
      borderRadius="s"
      opacity={isPressed ? 0.5 : 1}
      {...rest}
    />
  );
};

const FxCardTitle = (props: FxTextProps) => (
  <FxText color="content1" variant="bodyLargeRegular" {...props} />
);

const FxCardRow = (props: FxBoxProps) => (
  <>
    <FxBox
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      {...props}
    />
    <FxHorizontalRule marginVertical="12" />
  </>
);

const FxCardRowTitle = (props: FxTextProps) => (
  <FxText color="content1" variant="bodySmallRegular" {...props} />
);

export const FxCardRowData = (props: FxTextProps) => (
  <FxText color="content2" variant="bodySmallLight" {...props} />
);

FxCardRow.Title = FxCardRowTitle;
FxCardRow.Data = FxCardRowData;

FxCard.Title = FxCardTitle;
FxCard.Row = FxCardRow;

export { FxCard };
