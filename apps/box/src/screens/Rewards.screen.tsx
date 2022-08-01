import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxButton,
  FxFilterIcon,
  FxFoldableContent,
  FxLineChart,
  FxPressableOpacity,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
  FxTheme,
} from '@functionland/component-library';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { ScrollView } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { mixColor } from 'react-native-redash';

const TEST_DATA_Y = [
  0, 1, 2, 8, 10, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 13, 16, 12, 5, 8, 10,
];

const ICON_SIZE = 10;

export const RewardsScreen = () => {
  const bottomSheetRef = React.useRef<FxBottomSheetModalMethods>(null);

  const filterPressed = () => {
    bottomSheetRef.current.present();
  };

  return (
    <FxSafeAreaBox flex={1}>
      <ScreenHeaderContainer>
        <FxBox
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <ScreenHeader />
        </FxBox>
      </ScreenHeaderContainer>
      <FxBox
        paddingHorizontal="24"
        flexDirection="row"
        justifyContent="space-between"
      >
        <FxBox flexDirection="row">
          <FxTabOption selected={false}>All</FxTabOption>
          <FxSpacer width={24} />
          <FxTabOption selected={true}>Earnings</FxTabOption>
          <FxSpacer width={24} />
          <FxTabOption selected={false}>Transactions</FxTabOption>
        </FxBox>
        <FxPressableOpacity onPress={filterPressed} justifyContent="center">
          <FxBox>
            <FxFilterIcon color="content3" />
          </FxBox>
        </FxPressableOpacity>
      </FxBox>
      <FxBox
        width="100%"
        height="40%"
        justifyContent="center"
        alignContent="center"
      >
        <FxLineChart points={TEST_DATA_Y} />
      </FxBox>
      <FxSpacer paddingBottom="24" />
      <TableHeader />
      <ScrollView>
        <RowItem />
        <Separator />
        <RowItem />
        <Separator />
        <RowItem />
        <Separator />
        <RowItem />
        <Separator />
        <RowItem />
        <Separator />
        <RowItem />
        <Separator />
        <RowItem />
        <Separator />
        <RowItem />
        <Separator />
        <RowItem />
        <Separator />
        <RowItem />
        <Separator />
        <RowItem />
      </ScrollView>

      <FilterBottomSheet ref={bottomSheetRef} />
    </FxSafeAreaBox>
  );
};

const RowItem = () => {
  const theme = useTheme<FxTheme>();
  const backgroundAnimationValue = useSharedValue(0);
  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: mixColor(
        backgroundAnimationValue.value,
        theme.colors.backgroundApp,
        theme.colors.backgroundPrimary
      ) as string,
    };
  });

  const headerContent = (
    <FxBox flexDirection="row">
      <FxSpacer width={24} />
      <FxBox flex={1}>
        <FxText variant="bodyLargeRegular">9.0951</FxText>
      </FxBox>
      <FxBox flex={1} justifyContent="center">
        <FxText variant="bodyXSRegular" color="content3">
          0.0012
        </FxText>
      </FxBox>
      <FxBox flex={1} justifyContent="center">
        <FxText variant="bodyXSRegular" color="content3">
          07/19/22
        </FxText>
      </FxBox>
      <FxBox flex={1} justifyContent="center">
        <FxText variant="bodyXSRegular" color="content3">
          Purchase
        </FxText>
      </FxBox>
      <FxBox />
    </FxBox>
  );

  return (
    <Reanimated.View style={backgroundAnimatedStyle}>
      <FxFoldableContent
        header={headerContent}
        iconSize={ICON_SIZE}
        paddingVertical="16"
        paddingLeft="8"
        onPress={(expanded: boolean) => {
          if (expanded) {
            backgroundAnimationValue.value = withTiming(1, { duration: 300 });
          } else {
            backgroundAnimationValue.value = withTiming(0, { duration: 300 });
          }
        }}
      >
        <Reanimated.View>
          <FxBox flexDirection="row">
            <FxSpacer width={ICON_SIZE + 24} />
            <FxBox flex={1} justifyContent="center">
              <FxText variant="bodySmallRegular">Tower #2</FxText>
            </FxBox>
            <FxBox flex={1}>
              <FxButton>See in wallet</FxButton>
            </FxBox>
          </FxBox>
        </Reanimated.View>
      </FxFoldableContent>
    </Reanimated.View>
  );
};

const TableHeader = () => {
  return (
    <FxBox
      padding="4"
      flexDirection="row"
      backgroundColor="backgroundSecondary"
    >
      <FxSpacer width={ICON_SIZE + 28} />
      <TableHeaderItem text="Balance" />
      <TableHeaderItem text="Amount" />
      <TableHeaderItem text="Date" />
      <TableHeaderItem text="Type" />
    </FxBox>
  );
};

type TextHeaderItemProps = {
  text: string;
};

const TableHeaderItem = ({ text }: TextHeaderItemProps) => {
  return (
    <FxBox flex={1}>
      <FxText variant="eyebrow2">{text}</FxText>
    </FxBox>
  );
};

type ScreenHeaderContainerProps = {
  children: React.ReactElement;
};

const ScreenHeaderContainer = ({ children }: ScreenHeaderContainerProps) => {
  return (
    <FxBox paddingHorizontal="24" paddingVertical="16">
      {children}
    </FxBox>
  );
};

const ScreenHeader = () => {
  return (
    <FxBox>
      <FxText variant="h300" color="content1">
        All Rewards
      </FxText>
    </FxBox>
  );
};

const Separator = () => {
  return (
    <FxBox borderBottomColor="backgroundSecondary" borderBottomWidth={1} />
  );
};

type FxTabOptionProps = {
  selected: boolean;
  onPress?: () => void;
  children: React.ReactElement | string;
};

const FxTabOption = ({ onPress, selected, children }: FxTabOptionProps) => {
  const textProps: React.ComponentProps<typeof FxText> = selected
    ? {
        variant: 'bodyMediumRegular',
        color: 'greenBase',
      }
    : {
        variant: 'bodyMediumLight',
        color: 'content2',
      };
  const pressableProps: React.ComponentProps<typeof FxBox> = selected
    ? {
        borderBottomWidth: 1,
        borderBottomColor: 'greenBase',
      }
    : {};

  return (
    <FxPressableOpacity onPress={onPress} {...pressableProps}>
      <FxText {...textProps}>{children}</FxText>
    </FxPressableOpacity>
  );
};

const FilterBottomSheet = React.forwardRef<FxBottomSheetModalMethods>(
  (_, ref) => {
    return (
      <FxBottomSheetModal ref={ref} title="Testing">
        <>
          <FxBox padding="24">
            <FxText color="greenBase">Tower 1</FxText>
          </FxBox>
          <FxBox padding="24">
            <FxText color="greenBase">Tower 2</FxText>
          </FxBox>
        </>
      </FxBottomSheetModal>
    );
  }
);
