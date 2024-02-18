import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export const FlashingTower = ({
  onColor = 'lightblue',
  offColor = 'gray',
  onInterval = 1000,
  offInterval = 1000,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current; // Animated value to interpolate

  // Function to start the flashing animation
  const startFlashing = () => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: onInterval,
        useNativeDriver: true, // 'useNativeDriver' must be 'false' for color animation
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: offInterval,
        useNativeDriver: true,
      }),
    ]).start((e) => {
      if (e.finished) {
        startFlashing(); // Loop the animation
      }
    });
  };

  useEffect(() => {
    startFlashing();
  }, [onInterval, offInterval]);

  // Interpolating the animated value to transition between colors
  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [offColor, onColor],
  });

  return (
    <View style={styles.towerBase}>
      <Animated.View
        style={[
          styles.flashingTop,
          { backgroundColor }, // Apply animated background color
        ]}
      />
      <View style={styles.towerBody} />
    </View>
  );
};

const styles = StyleSheet.create({
  towerBase: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1
  },
  flashingTop: {
    width: 100, // Adjust the width as needed
    height: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  towerBody: {
    width: 100,
    height: 300,
    backgroundColor: 'gray',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    marginTop: -5, // Adjust the margin to ensure the top part overlaps with the body for a seamless look
  },
});
