import React from 'react';
import { Path } from 'react-native-svg';
import { FxSvg, FxSvgProps } from '../svg/svg';

export const FxChevronDownIcon = (props: FxSvgProps) => (
  <FxSvg width={12} height={7} viewBox="0 0 12 7" {...props}>
    <Path d="M6 5.5L6.35355 5.85355L6 6.20711L5.64645 5.85355L6 5.5ZM11.3536 0.853553L6.35355 5.85355L5.64645 5.14645L10.6464 0.146447L11.3536 0.853553ZM5.64645 5.85355L0.646446 0.853554L1.35355 0.146447L6.35355 5.14645L5.64645 5.85355Z" />
  </FxSvg>
);

export const FxDownArrowIcon = (props: FxSvgProps) => (
  <FxSvg width={14} height={9} viewBox="0 0 14 8" {...props}>
    <Path d="M7 7.49585L14 0.495849H0L7 7.49585Z" />
  </FxSvg>
);
