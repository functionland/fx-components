import { FxText, FxTextProps } from '@functionland/component-library';
import React from 'react';

export const HeaderText = (props: FxTextProps) => (
  <FxText variant="h400" color="content1" {...props} />
);
export const SubHeaderText = (props: FxTextProps) => (
  <FxText variant="h200" color="content1" {...props} />
);
