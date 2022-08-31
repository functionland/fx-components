import React from 'react';
import { LayoutChangeEvent } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { FxBox, FxBoxProps, FxReanimatedBox } from '../box/box';

export type FxProgressBarProps = {
  progress: number;
  width?: number;
  total?: number;
} & FxBoxProps;

const calculateWidth = (progress: number, total: number, width: number) => {
  const _progress = Math.min(Math.max(0, progress), total);
  return Math.round(width * (_progress / total));
};

const FxProgressBar = ({
  width,
  progress,
  height = 4,
  total = 100,
  ...rest
}: FxProgressBarProps) => {
  const [_width, setWidth] = React.useState(width || 0);
  const progressWidth = useSharedValue<number>(0);

  React.useEffect(() => {
    const newWidth = calculateWidth(progress, total, _width);
    if (newWidth !== progressWidth.value) {
      progressWidth.value = withTiming(newWidth, {
        duration: 150,
      });
    }
  }, [progress, total, _width]); // eslint-disable-line react-hooks/exhaustive-deps

  const progressWidthStyle = useAnimatedStyle(() => ({
    width: progressWidth.value,
  }));

  const onLayoutHandler = (evt: LayoutChangeEvent) => {
    setWidth(evt.nativeEvent.layout.width);
    progressWidth.value = calculateWidth(
      progress,
      total,
      evt.nativeEvent.layout.width
    );
  };

  return (
    <FxBox
      flexDirection="row"
      alignItems="flex-start"
      backgroundColor={'backgroundSecondary'}
      width={width}
      height={height}
      onLayout={onLayoutHandler}
      borderRadius={'m'}
      {...rest}
    >
      <FxReanimatedBox
        height={height}
        backgroundColor={'greenHover'}
        borderRadius={'m'}
        style={progressWidthStyle}
      />
    </FxBox>
  );
};

export { FxProgressBar };
