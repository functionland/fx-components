import React from 'react';
import {
  boxRestyleFunctions,
  composeRestyleFunctions,
  useRestyle,
} from '@shopify/restyle';
import { FxTheme } from '../theme/theme';
import { FxBox } from '../box/box';
import { FxText } from '../text/text';

type FxTagProps = React.ComponentProps<typeof FxBox> & {
  children: React.ReactNode;
};

const restyleFunctions = composeRestyleFunctions<FxTheme, FxTagProps>(
  boxRestyleFunctions
);

const FxTag = (props: FxTagProps) => {
  const { children, ...rest } = useRestyle(restyleFunctions, props);

  return (
    <FxBox
      backgroundColor="backgroundSecondary"
      borderRadius="m"
      height={26}
      justifyContent="center"
      paddingHorizontal="8"
      {...rest}
    >
      <FxText color="content1" variant="bodyXXSRegular" lineHeight={0}>
        {children}
      </FxText>
    </FxBox>
  );
};

export { FxTag };
