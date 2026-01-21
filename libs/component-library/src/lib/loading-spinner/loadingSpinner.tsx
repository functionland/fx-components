import React from 'react';
import { FxSvgProps } from '../svg/svg';
import { FxLoadingSpinnerIcon } from '../icons/icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const ANIMATION_DURATION = 750; // ms

const FxLoadingSpinner = (props: FxSvgProps) => {
  const rotation = useSharedValue(0);
  const animation = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(rotation.value + 360, { duration: ANIMATION_DURATION }),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wrap SVG in Animated.View for transform animation to avoid react-native-svg G component issues
  return (
    <Animated.View style={animation}>
      <FxLoadingSpinnerIcon color="primary" {...props} />
    </Animated.View>
  );
};

export { FxLoadingSpinner };
