import React from 'react';
import { FxBox } from '../box/box';
import { FxText } from '../text/text';
import { FxSvgProps } from '../svg/svg';
import { FxSpacer } from '../spacer/spacer';

type FxTagProps = React.ComponentProps<typeof FxBox> & {
  iconLeft?: React.ReactElement<FxSvgProps>;
  iconRight?: React.ReactElement<FxSvgProps>;
  children: React.ReactNode;
};

const FxTag = ({ iconLeft, iconRight, children, ...rest }: FxTagProps) => {
  const renderIcon = (_icon: React.ReactElement<FxSvgProps>) => {
    return React.createElement<FxSvgProps>(_icon.type, {
      height: 14,
      width: 14,
      color: 'content1',
      ..._icon.props,
    });
  };

  return (
    <FxBox
      backgroundColor="backgroundSecondary"
      borderRadius="m"
      height={26}
      justifyContent="center"
      paddingHorizontal="8"
      flexDirection="row"
      alignItems="center"
      {...rest}
    >
      {iconLeft && (
        <>
          {renderIcon(iconLeft)}
          <FxSpacer width={8} />
        </>
      )}
      <FxText color="content1" variant="bodyXXSRegular">
        {children}
      </FxText>
      {iconRight && (
        <>
          <FxSpacer width={8} />
          {renderIcon(iconRight)}
        </>
      )}
    </FxBox>
  );
};

export { FxTag };
