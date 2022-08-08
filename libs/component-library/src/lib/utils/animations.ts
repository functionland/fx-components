import { LayoutAnimation } from 'react-native';

export const configureEaseInOutLayoutAnimation = (duration = 150) => {
  LayoutAnimation.configureNext({
    ...LayoutAnimation.Presets.easeInEaseOut,
    duration,
  });
};
