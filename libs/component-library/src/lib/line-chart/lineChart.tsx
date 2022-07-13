import React from 'react';
import { FxBox } from '../box/box';
import { scaleLinear } from '@visx/scale';
import {
  Canvas,
  LinearGradient,
  Path as SkiaPath,
  Skia,
  vec,
  SkPath,
} from '@shopify/react-native-skia';
import { curveLines, serialize } from 'react-native-redash';
import { useTheme } from '@shopify/restyle';
import { FxTheme } from '../theme/theme';

export const COLORS = ['#06B59710', '#06B59770'].map(Skia.Color);

const buildPath = (pointsParam: number[], width: number, height: number) => {
  const scaleX = scaleLinear({
    domain: [0, 20],
    range: [0, width - 2],
  });
  const scaleY = scaleLinear({
    domain: [0, 20],
    range: [height, 0],
  });

  const points = [0, ...pointsParam, 0];
  const newPoints = points.map((val, index) => {
    return { x: scaleX(index - 1), y: scaleY(val) };
  });
  const path = Skia.Path.MakeFromSVGString(
    serialize(curveLines(newPoints, 0.1, 'bezier'))
  );

  return path;
};

type FxLineChartProps = {
  points: number[];
};

export const FxLineChart = ({ points }: FxLineChartProps) => {
  const [dimensions, setDimensions] = React.useState({
    width: 0,
    height: 0,
  });
  const theme = useTheme<FxTheme>();
  const [path, setPath] = React.useState<SkPath | null>();
  const colors = [`${theme.colors.primary}10`, `${theme.colors.primary}70`].map(
    Skia.Color
  );

  const generatePath = (width: number, height: number) => {
    setPath(buildPath(points, width, height));
  };

  return (
    <FxBox
      flex={1}
      onLayout={(evt) => {
        setDimensions({
          width: evt.nativeEvent.layout.width,
          height: evt.nativeEvent.layout.height,
        });
        generatePath(
          evt.nativeEvent.layout.width,
          evt.nativeEvent.layout.height
        );
      }}
    >
      {path && (
        <Canvas
          style={{
            width: dimensions.width,
            height: dimensions.height,
          }}
        >
          {/*eslint-disable-next-line react/style-prop-object*/}
          <SkiaPath path={path} style="fill" strokeWidth={4} color="red">
            <LinearGradient
              start={vec(0, 200)}
              end={vec(0, 0)}
              colors={colors}
            />
          </SkiaPath>
          <SkiaPath
            path={path}
            style="stroke" // eslint-disable-line react/style-prop-object
            strokeWidth={2}
            color="#06B597"
          />
        </Canvas>
      )}
    </FxBox>
  );
};
