import React from 'react';

import { StyleSheet } from 'react-native';
import type { LocalType } from '../types.toast';

import { FxCloseIcon } from '../../icons/icons';

import type { BaseToastProps } from '../types.toast';
import { FxBox } from '../../box/box';
import { FxText } from '../../text/text';

import { useFxTheme } from '../../theme/useFxTheme';
import { FxPressableOpacity } from '../../pressable-opacity/pressableOpacity';

const BaseToast: React.FC<BaseToastProps & { localType: LocalType }> = ({
  localType,
  ...props
}) => {
  const {
    iconElement,
    title,
    message,
    onClose,
    onPress,
    renderIcon,
    renderTitle,
    renderMessage,
    renderCloseButton,
  } = props;

  const theme = useFxTheme();
  const colorType = `${localType}Base` as const;
  const color = theme.colors[colorType];

  return (
    <FxPressableOpacity
      backgroundColor={'backgroundApp'}
      borderColor="backgroundSecondary"
      borderWidth={1}
      style={s.base}
      disabled={!onPress}
      onPress={() => onPress(props)}
    >
      {renderIcon?.({ color, ...props }) ?? (
        <FxBox style={s.iconContainer}>
          {iconElement ? (
            React.cloneElement(iconElement, { fill: color })
          ) : (
            <FxBox style={s.icon} />
          )}
        </FxBox>
      )}

      <FxBox style={s.contentContainer}>
        <FxBox>
          {renderTitle?.({ color, ...props }) ??
            (title !== undefined && (
              <FxText color={colorType} style={s.title} numberOfLines={1}>
                {title}
              </FxText>
            ))}
          {renderMessage?.({ color, ...props }) ??
            (message !== undefined && (
              <FxText
                variant="bodyXSRegular"
                color="content2"
                numberOfLines={2}
              >
                {message}
              </FxText>
            ))}
        </FxBox>
      </FxBox>

      {renderCloseButton ? (
        renderCloseButton({ color, ...props })
      ) : (
        <FxPressableOpacity style={s.closeButtonContainer} onPress={onClose}>
          <FxCloseIcon fill={theme.colors.content1} />
        </FxPressableOpacity>
      )}
    </FxPressableOpacity>
  );
};

export default BaseToast;

const s = StyleSheet.create({
  base: {
    flexDirection: 'row',
    height: 80,
    width: '94%',
    borderRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  iconContainer: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 24,
    height: 24,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start', // if rtl the text will start from the right
  },
  closeButtonContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    width: 9,
    height: 9,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
});
