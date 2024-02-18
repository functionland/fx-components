import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Easing } from 'react-native';

export const FlashingCircle = ({
  color = 'cyan',
  onInterval = 1000,
  offInterval = 1000,
}) => {
  const opacity = useRef(new Animated.Value(1)).current; // Initial opacity value

  useEffect(() => {
    if (offInterval > 0) {
      // Flashing mode
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0,
            duration: offInterval,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: onInterval,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
        ])
      ).start();
    } else {
      // Solid mode (no flashing), ensure the circle is fully visible
      opacity.setValue(1);
    }
  }, [opacity, onInterval, offInterval]);

  return (
    <Animated.View
      style={[
        styles.circle,
        {
          backgroundColor: color,
          opacity,
        },
      ]}
    />
  );
};

// Style for the circle
const styles = StyleSheet.create({
  circle: {
    width: 20, // Circle size
    height: 20,
    borderRadius: 5, // Half of the width/height to make it a circle
    marginRight: 5, // Space between the circle and the text
  },
});
