import {
  createRestyleComponent,
  createVariant,
  VariantProps,
} from '@shopify/restyle';
import React from 'react';
import { FxBox } from '../box/box';
import {
  FxFolderIcon,
  FxPDFIcon,
  FxAudioIcon,
  FxDocumentIcon,
  FxOptionsHorizontalIcon,
  FxOptionsVerticalIcon,
} from '../icons/icons';
import { FxPressableOpacity } from '../pressable-opacity/pressableOpacity';
import { FxSpacer } from '../spacer/spacer';
import { FxSvgProps } from '../svg/svg';
import { FxText, FxTextProps } from '../text/text';
import { FxTheme } from '../theme/theme';
import { useFxTheme } from '../theme/useFxTheme';

const iconMap = {
  folder: FxFolderIcon,
  pdf: FxPDFIcon,
  audio: FxAudioIcon,
  document: FxDocumentIcon,
};

type Type = keyof typeof iconMap;

type IconProps = FxSvgProps & { type: Type };

const Icon = ({ type, ...props }: IconProps) => {
  const { colors } = useFxTheme();

  return React.createElement(iconMap[type] || FxFolderIcon, {
    fill: colors.content1,
    ...props,
  });
};

type FileBaseProps = React.ComponentProps<typeof FxFileContainer> & {
  name: FxTextProps['children'];
  details?: FxTextProps['children'];
  type: Type;
  icon?: React.ReactElement<FxSvgProps>;
  disabled?: boolean;
  onPress?: () => void;
  onOptionsPress?: () => void;
};

const renderIcon = (
  _icon: React.ReactElement<Omit<FxSvgProps, 'color'>>,
  color?: FxSvgProps['color']
) => {
  return React.createElement<FxSvgProps>(_icon.type, {
    height: 16,
    width: 16,
    color: color,
    ..._icon.props,
  });
};

const fileVariant = createVariant({
  themeKey: 'fileVariants',
  property: 'variant',
});

const FxFileContainer = createRestyleComponent<
  React.ComponentProps<typeof FxPressableOpacity> &
    VariantProps<FxTheme, 'fileVariants', 'variant'>,
  FxTheme
>([fileVariant], FxPressableOpacity);

const fileTextVariant = createVariant({
  themeKey: 'buttonTextVariants',
  property: 'type',
});

const FxFileText = createRestyleComponent<
  React.ComponentProps<typeof FxText> &
    VariantProps<FxTheme, 'fileTextVariants', 'type'>,
  FxTheme
>([fileTextVariant], FxText);

const fileTextDetailVariant = createVariant({
  themeKey: 'fileTextVariants',
  property: 'type',
});

const FxFileTextDetail = createRestyleComponent<
  React.ComponentProps<typeof FxText> &
    VariantProps<FxTheme, 'fileTextDetailVariants', 'type'>,
  FxTheme
>([fileTextDetailVariant], FxText);

const FileSimple = ({
  name,
  type,
  disabled,
  onOptionsPress,
  icon,
  variant,
  onPressIn,
  onPressOut,
  ...rest
}: FileBaseProps) => {
  const { fileTextVariants } = useFxTheme();
  const [isPressed, setIsPressed] = React.useState(false);
  const _type = disabled ? 'disabled' : isPressed ? 'pressed' : variant;

  return (
    <FxFileContainer
      alignItems="center"
      padding="8"
      width={157}
      variant={_type}
      disabled={disabled}
      onPressIn={(e) => {
        setIsPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setIsPressed(false);
        onPressOut?.(e);
      }}
      {...rest}
    >
      <Icon type={type} color={fileTextVariants[_type || 'defaults'].color} />
      {icon && (
        <>
          {renderIcon(icon, 'content1')}
          <FxSpacer width={8} />
        </>
      )}
      <FxFileText type={_type} variant="bodyMediumRegular" numberOfLines={1}>
        {name}
      </FxFileText>
      <FxPressableOpacity disabled={disabled} onPress={onOptionsPress}>
        <FxOptionsHorizontalIcon
          color={fileTextVariants[_type || 'defaults'].color}
        />
      </FxPressableOpacity>
    </FxFileContainer>
  );
};
const FileDetailed = ({
  name,
  details,
  type,
  disabled,
  variant,
  onOptionsPress,
  onPressIn,
  onPressOut,
  ...rest
}: FileBaseProps) => {
  const { fileTextVariants } = useFxTheme();
  const [isPressed, setIsPressed] = React.useState(false);
  const _type = disabled ? 'disabled' : isPressed ? 'pressed' : variant;

  return (
    <FxFileContainer
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingHorizontal="20"
      paddingVertical="16"
      variant={_type}
      disabled={disabled}
      onPressIn={(e) => {
        setIsPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setIsPressed(false);
        onPressOut?.(e);
      }}
      {...rest}
    >
      <FxBox
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Icon type={type} color={fileTextVariants[_type || 'defaults'].color} />
        <FxSpacer width={16} />
        <FxBox>
          <FxFileText
            type={_type}
            variant="bodyMediumRegular"
            numberOfLines={1}
          >
            {name}
          </FxFileText>
          <FxFileTextDetail type={_type} variant="bodyXXSRegular">
            {details}
          </FxFileTextDetail>
        </FxBox>
      </FxBox>
      <FxPressableOpacity disabled={disabled} onPress={onOptionsPress}>
        <FxOptionsVerticalIcon
          color={fileTextVariants[_type || 'defaults'].color}
        />
      </FxPressableOpacity>
    </FxFileContainer>
  );
};

export type FxFileProps = FileBaseProps & {
  compact?: boolean;
};

export const FxFile = ({ compact, ...props }: FxFileProps) => {
  return compact ? <FileSimple {...props} /> : <FileDetailed {...props} />;
};
