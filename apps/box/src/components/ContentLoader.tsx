import React from 'react';
import List, { IContentLoaderProps } from 'react-content-loader/native';

const MyLoader = (
  props: React.JSX.IntrinsicAttributes & IContentLoaderProps & { children?: React.ReactNode; }
) => (
  <List
    testID="content-loader"
    speed={2}
    // eslint-disable-next-line react-native/no-inline-styles
    style={{ width: '100%', height: '100%', paddingTop: 16, marginTop: 24 }}
    backgroundColor="#f3f3f3"
    foregroundColor="#ecebeb"
    {...props}
  />
);

export default MyLoader;
