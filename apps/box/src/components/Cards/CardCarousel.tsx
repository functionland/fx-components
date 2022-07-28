import { FxBox } from '@functionland/component-library';
import React from 'react';
import { Dimensions } from 'react-native';
import Carousel, { TCarouselProps } from 'react-native-reanimated-carousel';

const SCALE = 0.85;
const HORIZONTAL_PADDING = 20;
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
  const windowWidth = Dimensions.get('window').width;
  return (
    <FxBox
      style={{
        marginLeft: -HORIZONTAL_PADDING,
        width: windowWidth + HORIZONTAL_PADDING,
      }}
    >
      <Carousel
        loop={false}
        width={(windowWidth - CARD_SPACING) * SCALE}
        height={height}
        style={{
          width: windowWidth,
        }}
        renderItem={({ item }) => (
          <Elem
            {...item}
            style={{
              marginLeft: HORIZONTAL_PADDING,
              marginRight: CARD_SPACING - HORIZONTAL_PADDING,
              height,
            }}
          />
        )}
        {...rest}
      />
    </FxBox>
  );
};
