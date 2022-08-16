import { ColorProps } from '@shopify/restyle';
import React from 'react';
import { Image, ImageSourcePropType } from 'react-native';
import { FxBox } from '../box/box';
import { FxCheckIcon, FxEditIcon } from '../icons/icons';
import {
  FxPressableOpacity,
  FxPressableOpacityProps,
} from '../pressable-opacity/pressableOpacity';
import { FxSvgProps } from '../svg/svg';
import { FxTheme } from '../theme/theme';

enum AvatarSizeEnum {
  small,
  medium,
  large,
  xl,
}
type AvatarSize = keyof typeof AvatarSizeEnum;

enum IconEnum {
  none,
  deselected,
  selected,
  edit,
}
type Icon = keyof typeof IconEnum;

const AvatarSizeMap: Record<AvatarSize, number> = {
  small: 32,
  medium: 48,
  large: 64,
  xl: 96,
};

const RADIAN_CONVERSION = Math.PI / 180;
const ICON_SIZE = 16;
const ICON_BORDER = 2;
const ICON_WITH_BORDER = ICON_SIZE + ICON_BORDER;

const IconOffsetMap: Record<AvatarSize, number> = {
  small: -20 * RADIAN_CONVERSION,
  medium: -30 * RADIAN_CONVERSION,
  large: -40 * RADIAN_CONVERSION,
  xl: -45 * RADIAN_CONVERSION,
};

const IconDefs: Record<
  Icon,
  {
    icon: React.ElementType<FxSvgProps> | undefined;
    backgroundColor?: ColorProps<FxTheme>['color'];
    iconColor?: ColorProps<FxTheme>['color'] | undefined;
  }
> = {
  none: { icon: undefined },
  deselected: { backgroundColor: 'backgroundApp', icon: undefined },
  selected: {
    backgroundColor: 'content1',
    icon: FxCheckIcon,
    iconColor: 'greenBase',
  },
  edit: {
    backgroundColor: 'content1',
    icon: FxEditIcon,
    iconColor: 'secondary',
  },
};

type FxAvatarProps = {
  source: ImageSourcePropType;
  size: AvatarSize;
  icon?: Icon;
} & FxPressableOpacityProps;

export const FxAvatar = ({
  source,
  size,
  icon = 'none',
  ...rest // FxPressableOpacityProps
}: FxAvatarProps) => {
  const avatarSize = AvatarSizeMap[size];
  const iconOffset = IconOffsetMap[size];
  const radius = avatarSize / 2;
  const iconX = radius * Math.cos(iconOffset);
  const iconY = radius * Math.sin(iconOffset);
  const IconElem = IconDefs[icon].icon;

  return (
    <FxPressableOpacity {...rest}>
      <FxBox>
        <Image
          source={source}
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize,
          }}
        />
        {IconDefs[icon].backgroundColor && (
          <FxBox
            justifyContent="center"
            alignItems="center"
            position="absolute"
            left={radius + iconX - ICON_WITH_BORDER / 2}
            top={radius - iconY - ICON_WITH_BORDER / 2}
            borderColor="content1"
            borderWidth={2}
            backgroundColor={IconDefs[icon].backgroundColor}
            style={{ borderRadius: ICON_SIZE / 2 + ICON_BORDER }}
          >
            <FxBox width={ICON_SIZE} height={ICON_SIZE}>
              {IconElem && (
                <IconElem
                  width="100%"
                  height="100%"
                  color={IconDefs[icon].iconColor}
                />
              )}
            </FxBox>
          </FxBox>
        )}
      </FxBox>
    </FxPressableOpacity>
  );
};
