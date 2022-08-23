import React from 'react';

import { FxBox, FxBoxProps } from '../box/box';
import { configureEaseInOutLayoutAnimation } from '../utils/animations';

export type FxProgressBarProps = {
  progress: number;
  width?: number;
  total?: number;
} & FxBoxProps;

const FxProgressBar = ({
  width,
  progress,
  height = 4,
  total = 100,
  ...rest
}: FxProgressBarProps) => {
  const [_width, setWidth] = React.useState(width || 0);
  const _progress = Math.min(Math.max(0, progress), total);
  const progressWidth = Math.round(_width * (_progress / total));

  React.useEffect(() => {
    configureEaseInOutLayoutAnimation();
  }, [progressWidth]);

  return (
    <FxBox
      flexDirection="row"
      alignItems="flex-start"
      backgroundColor={'backgroundSecondary'}
      height={height}
      onLayout={(evt) => {
        setWidth(evt.nativeEvent.layout.width);
      }}
      borderRadius={'m'}
      {...rest}
    >
      <FxBox
        height={height}
        width={progressWidth}
        backgroundColor={'greenHover'}
        borderRadius={'m'}
      />
    </FxBox>
  );
};

export { FxProgressBar };
