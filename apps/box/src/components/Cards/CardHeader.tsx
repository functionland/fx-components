import { FxText } from '@functionland/component-library';
import React from 'react';
import { TextProps } from 'react-native';

export const CardHeader = (props: TextProps) => (
  <FxText
    {...props}
    marginBottom="8"
    paddingVertical="8"
    variant="h200"
    color="content1"
  />
);
