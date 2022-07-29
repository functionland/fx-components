import {
  APP_HORIZONTAL_PADDING,
  FxBox,
  WINDOW_WIDTH,
} from '@functionland/component-library';
import React from 'react';
import Carousel, { TCarouselProps } from 'react-native-reanimated-carousel';

const SCALE = 0.85;
const CARD_SPACING = 16;

type CardCarouselProps = Omit<
  TCarouselProps,
  'width' | 'mode' | 'vertical' | 'renderItem'
> & {
  renderItem: React.ElementType<React.ComponentProps<typeof FxBox>>;
};

export const CardCarousel = ({
  renderItem: Elem,
  height,
  ...rest
}: CardCarouselProps) => {
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
        style={{
          width: WINDOW_WIDTH,
        }}
        renderItem={({ item }) => (
          <Elem
            {...item}
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
