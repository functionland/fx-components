import React from 'react';
import { createBox } from '@shopify/restyle';
import { GestureResponderEvent, Pressable, PressableProps } from 'react-native';
import { FxTheme } from '../theme/theme';

const PressableBox = createBox<FxTheme, PressableProps>(Pressable);

type FxCardProps = React.ComponentProps<typeof PressableBox>;

export const FxCard = ({
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
      backgroundColor="backgroundPrimary"
      borderRadius="s"
      opacity={isPressed ? 0.5 : 1}
      {...rest}
    />
  );
};
