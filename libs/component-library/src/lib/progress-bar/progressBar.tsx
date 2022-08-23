import React from 'react';

import { FxBox, FxBoxProps } from '../box/box';
import { configureEaseInOutLayoutAnimation } from '../utils/animations';
import { WINDOW_WIDTH } from '../utils/constants';

export type FxProgressBarProps = {
  progress: number;
  width?: number;
  total?: number;
  disabled?: boolean;
} & FxBoxProps;

const FxProgressBar = ({
  width,
  progress,
  height = 4,
  total = 100,
  ...rest
}: FxProgressBarProps) => {
  const _width = width || WINDOW_WIDTH;
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
      width={_width}
      height={height}
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
