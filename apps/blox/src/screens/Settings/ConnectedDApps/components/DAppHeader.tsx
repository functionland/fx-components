import React from 'react';
import { FxBox, FxCard, FxText } from '@functionland/component-library';
import { Image, ImageSourcePropType, StyleSheet } from 'react-native';
import { FxTag, FxBoxProps } from '@functionland/component-library';
import { scaleByWidth } from '../../../../constants/layout';

type DAppHeaderProps = {
  imageSrc: ImageSourcePropType;
  name: string;
  tag?: string;
  info?: string;
} & FxBoxProps;

const Row = (props: FxBoxProps) => (
  <FxBox flexDirection="row" alignItems="center" {...props} />
);

const DAppHeader = ({
  name,
  tag,
  info,
  imageSrc,
  ...props
}: DAppHeaderProps) => {
  return (
    <FxBox {...props}>
      <Row>
        <Image style={s.image} source={imageSrc} />
        <FxBox marginLeft="16" alignItems="flex-start" flexShrink={1}>
          <FxCard.Title>{name}</FxCard.Title>
          {tag && <FxTag marginTop="12">{tag}</FxTag>}
          {info && (
            <FxText style={s.shrink} variant="bodyXSRegular">
              {info}
            </FxText>
          )}
        </FxBox>
      </Row>
    </FxBox>
  );
};

export default DAppHeader;

const s = StyleSheet.create({
  image: {
    width: scaleByWidth(64),
    height: scaleByWidth(64),
    resizeMode: 'contain',
  },
  shrink: {
    flexShrink: 1,
  },
});
