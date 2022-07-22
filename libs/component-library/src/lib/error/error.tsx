import React from 'react';
import { BoxProps } from '@shopify/restyle';
import { FxText } from '../text/text';
import { FxTheme } from '../theme/theme';
import { FxExclamationIcon } from '../icons/icons';
import { FxBox } from '../box/box';

type FxErrorProps = BoxProps<FxTheme> & {
  error?: string;
};

const FxError = ({ error, ...rest }: FxErrorProps) => {
  if (!error) return null;
  return (
    <FxBox marginTop="8" flexDirection="row" alignItems="center" {...rest}>
      <FxExclamationIcon color="errorBase" />
      <FxText variant="bodyXSRegular" color="errorBase" marginLeft="4">
        {error}
      </FxText>
    </FxBox>
  );
};

export { FxError };
