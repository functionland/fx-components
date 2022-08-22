import { useTheme } from '@shopify/restyle';
import React from 'react';
import { LayoutAnimation } from 'react-native';

import { FxBox, FxBoxProps } from '../box/box';
import { FxTheme } from '../theme/theme';
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
  const { spacing } = useTheme<FxTheme>();
  const _width = width || WINDOW_WIDTH - 2 * spacing[20];
  const _progress = Math.min(Math.max(0, progress), total);
  const progressWidth = Math.round(_width * (_progress / total));

  React.useEffect(() => {
    LayoutAnimation.configureNext({
      ...LayoutAnimation.Presets.easeInEaseOut,
      duration: 350,
    });
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
