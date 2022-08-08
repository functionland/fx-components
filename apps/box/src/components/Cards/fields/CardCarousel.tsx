import {
  APP_HORIZONTAL_PADDING,
  FxBox,
  FxCardProps,
  WINDOW_WIDTH,
} from '@functionland/component-library';
import React from 'react';
import Carousel, { TCarouselProps } from 'react-native-reanimated-carousel';

const SCALE = 0.85;
const CARD_SPACING = 16;

type CardCarouselProps<T> = Omit<
  TCarouselProps<T>,
  'width' | 'mode' | 'vertical' | 'renderItem'
> & {
  renderItem: React.ElementType<FxCardProps & { data: T }>;
};

export const CardCarousel = <T,>({
  renderItem: Elem,
  height,
  ...rest
}: CardCarouselProps<T>) => {
  return (
    <FxBox
      style={{
        marginLeft: -APP_HORIZONTAL_PADDING,
        width: WINDOW_WIDTH + APP_HORIZONTAL_PADDING,
      }}
    >
      <Carousel
        loop={false}
        width={(WINDOW_WIDTH - CARD_SPACING) * SCALE}
        height={height}
        panGestureHandlerProps={{
          activeOffsetX: [-10, 10],
        }}
        style={{
          width: WINDOW_WIDTH,
        }}
        renderItem={({ item }) => (
          <Elem
            data={item}
            style={{
              marginLeft: APP_HORIZONTAL_PADDING,
              marginRight: CARD_SPACING - APP_HORIZONTAL_PADDING,
              height,
            }}
          />
        )}
        {...rest}
      />
    </FxBox>
  );
};
