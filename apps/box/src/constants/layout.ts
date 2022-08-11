import { Dimensions } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

// Guideline sizes are based on figma
const baseWidth = 375;
const baseHeight = 812;

/**
 * Scale any size based off screen width with a moderating factor.
 * sizes will scale in the ratio of (SCREEN_WIDTH / baseWidth) at a rate of some factor.
 * If no factor is provided this will scale with a factor of 1
 * @param size base size you wish to scale.
 * @param factor rate at which to scale up.
 */
export const scaleByWidth = (size = 0, factor = 1) =>
  Math.round(size + ((SCREEN_WIDTH / baseWidth) * size - size) * factor); // This scales the width at a factor of the regular scale. If scale take 300 and increase it to 340. moderateWidthScale with take 300 and increase to 310 (for a factor of 0.25)

/**
 * Scale any size based off screen height with a moderating factor.
 * sizes will scale in the ratio of (SCREEN_WIDTH / baseWidth) at a rate of some factor.
 * If no factor is provided this will scale with a factor of 1
 * @param size base size you wish to scale.
 * @param factor rate at which to scale up.
 */
export const scaleByHeight = (size = 0, factor = 1) =>
  Math.round(size + ((SCREEN_HEIGHT / baseHeight) * size - size) * factor); // This scales the width at a factor of the regular scale. If scale take 300 and increase it to 340. moderateWidthScale with take 300 and increase to 310 (for a factor of 0.25)

export const isSmallDevice = SCREEN_WIDTH < 350;

export default {
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  isSmallDevice: isSmallDevice,
};
