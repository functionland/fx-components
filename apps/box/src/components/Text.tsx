import { FxText } from '@functionland/component-library';
import React from 'react';
import { TextProps } from 'react-native';

export const HeaderText = (props: TextProps) => (
  <FxText variant="h400" color="content1" {...props} />
);
export const SubHeaderText = (props: TextProps) => (
  <FxText variant="h200" color="content1" {...props} />
);
