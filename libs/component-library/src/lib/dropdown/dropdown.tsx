import {
  ItemValue,
  PickerProps,
} from '@react-native-picker/picker/typings/Picker';
import {
  createBox,
  createRestyleComponent,
  createVariant,
  VariantProps,
} from '@shopify/restyle';
import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
} from '../bottom-sheet/bottomSheetModal';
import { FxChevronDownIcon } from '../icons/icons';
import { FxPicker, FxPickerItem } from '../picker/picker';
import { FxText } from '../text/text';
import { FxTheme } from '../theme/theme';
import { useFxTheme } from '../theme/useFxTheme';

const dropdownVariant = createVariant({
  themeKey: 'dropdownVariants',
  property: 'variant',
});

const PressableBox = createBox<FxTheme, PressableProps>(Pressable);

const FxDropdownBase = createRestyleComponent<
  React.ComponentProps<typeof PressableBox> &
    VariantProps<FxTheme, 'dropdownVariants', 'variant'>,
  FxTheme
>([dropdownVariant], PressableBox);

const dropdownTextVariant = createVariant({
  themeKey: 'dropdownTextVariants',
  property: 'type',
});

const FxDropdownText = createRestyleComponent<
  React.ComponentProps<typeof FxText> &
    VariantProps<FxTheme, 'dropdownTextVariants', 'type'>,
  FxTheme
>([dropdownTextVariant], FxText);

type FxDropdownProps = React.ComponentProps<typeof FxDropdownBase> &
  Pick<PickerProps, 'selectedValue' | 'onValueChange'> & {
    options: { label: string; value: ItemValue }[];
    title?: string;
    error?: boolean;
    onDismiss?: () => void;
  };

const FxDropdown = ({
  disabled,
  variant,
  selectedValue,
  onValueChange,
  options,
  title,
  error,
  onDismiss,
}: FxDropdownProps) => {
  const bottomSheetRef = React.useRef<FxBottomSheetModalMethods>(null);
  const [focus, setFocus] = React.useState(false);
  const theme = useFxTheme();
  const type = disabled
    ? 'disabled'
    : error
    ? 'error'
    : focus
    ? 'pressed'
    : variant;
  const dropdownLabel =
    options.find(({ value }) => value === selectedValue)?.label ??
    options[0].label;

  const onPress = () => {
    bottomSheetRef.current?.present();
    setFocus(true);
  };

  const _onDismiss = () => {
    setFocus(false);
    if (onDismiss) onDismiss();
  };

  return (
    <>
      <FxDropdownBase
        variant={type}
        disabled={disabled}
        onPress={onPress}
        height={52}
        borderWidth={1}
        borderRadius="s"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        paddingHorizontal="20"
      >
        <FxDropdownText type={type}>{dropdownLabel}</FxDropdownText>
        <FxChevronDownIcon
          width={20}
          height={20}
          color={theme.dropdownTextVariants[type || 'defaults'].color}
        />
      </FxDropdownBase>
      <FxBottomSheetModal
        ref={bottomSheetRef}
        title={title}
        onDismiss={_onDismiss}
      >
        <FxPicker selectedValue={selectedValue} onValueChange={onValueChange}>
          {options.map(({ label, value }) => (
            <FxPickerItem key={value} label={label} value={value} />
          ))}
        </FxPicker>
      </FxBottomSheetModal>
    </>
  );
};

export { FxDropdown };
