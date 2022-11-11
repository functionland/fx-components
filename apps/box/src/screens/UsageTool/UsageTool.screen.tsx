import React, { useState } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSharedValue } from 'react-native-reanimated';
import {
  FxBox,
  FxButton,
  FxButtonGroup,
  FxHorizontalRule,
  FxTextInput,
  FxPressableOpacity,
  FxSafeAreaBox,
  FxText,
  FxCloseIcon,
  FxEditIcon,
  FxSpacer,
} from '@functionland/component-library';
import { UsageBar } from '../../components';
import { UsageRow, PersonalUsageRow } from './components/UsageRow';
import { useBloxStackNavigation } from '../../hooks';
import HomeBoxSetupDark from '../../app/icons/home-blox-setup-dark.svg';
// import HomeBoxSetupLight from '../../app/icons/home-blox-setup-light.svg';

const DEFAULT_DIVISION = 70;
const TAB_ITEMS = ['Low', 'Medium', 'High'];

type TPersonalUsage = {
  id: number;
  color: string;
  type: string;
  usage: number;
};
const PERSONAL_USAGES: TPersonalUsage[] = [
  {
    id: 1,
    color: '#45A3B8',
    type: 'My use',
    usage: 43,
  },
  {
    id: 2,
    color: '#EEA663',
    type: 'Keyvan',
    usage: 40,
  },
  {
    id: 3,
    color: '#3CFAE3',
    type: 'Shane',
    usage: 36,
  },
  {
    id: 4,
    color: '#495057',
    type: 'Free Space',
    usage: 101,
  },
];

export const UsageToolScreen = () => {
  const navigation = useBloxStackNavigation();
  const divisionSplit = useSharedValue(DEFAULT_DIVISION);
  const [divisionPercentage, setDivisionPercentage] =
    useState<number>(DEFAULT_DIVISION);
  const [selectedUsage, setSelectedUsage] = useState<number>(2);
  const [personalUsages, setPersonalUsages] =
    useState<TPersonalUsage[]>(PERSONAL_USAGES);
  const [editMode, setEditMode] = useState<boolean>(false);

  const goBack = () => navigation.goBack();

  const handleUpdateDivisionPercentage = (percentage: number) => {
    setDivisionPercentage(percentage);
  };

  const toEditMode = () => {
    setEditMode(true);
  };

  const removePersonalUsageItem = (removeItem: TPersonalUsage) => {
    setPersonalUsages((prev) =>
      prev.filter((item) => item.id !== removeItem.id)
    );
  };

  return (
    <FxSafeAreaBox flex={1} edges={['top']}>
      <FxBox flex={1}>
        <KeyboardAwareScrollView>
          <FxBox paddingHorizontal="20">
            <FxBox alignItems="center">
              <FxBox
                flexDirection="row"
                justifyContent="center"
                alignItems="center"
                marginTop="48"
              >
                <FxText variant="bodyMediumRegular" marginRight="8">
                  Home Blox Setup
                </FxText>
                <FxEditIcon color="content1" width={16} height={16} />
              </FxBox>
              <FxBox paddingVertical="16">
                <HomeBoxSetupDark />
              </FxBox>
              <FxText variant="bodySmallRegular">Total space: 4.75 TB</FxText>
            </FxBox>
            <FxSpacer height={24} />
            <UsageBar
              isEditable
              divisionPercent={divisionSplit}
              onEditEnd={handleUpdateDivisionPercentage}
              totalCapacity={1000}
            />
            <FxSpacer height={16} />
            <FxButtonGroup
              items={TAB_ITEMS}
              selectedIdx={selectedUsage}
              onSelect={(idx) => setSelectedUsage(idx)}
            />
            <FxBox marginTop="16">
              <UsageRow
                color="#038082"
                type="Pool"
                usage={1600}
                percentage={Math.round(divisionPercentage)}
              />
              <FxSpacer height={16} />
              <UsageRow
                color="#495057"
                type="Personal"
                usage={400}
                percentage={100 - Math.round(divisionPercentage)}
              />
              <FxBox paddingHorizontal="32" paddingVertical="16">
                {personalUsages.map((usage) => (
                  <PersonalUsageRow
                    key={usage.id}
                    color={usage.color}
                    type={usage.type}
                    usage={usage.usage}
                    editable={editMode}
                    onRemove={() => removePersonalUsageItem(usage)}
                  />
                ))}
                <FxSpacer height={8} />
                {editMode ? (
                  <FxBox>
                    <FxTextInput
                      caption="DID or email"
                      placeholder="Enter DID or email to add"
                    />
                    <FxSpacer height={16} />
                    <FxButton onPress={toEditMode}>Done</FxButton>
                  </FxBox>
                ) : (
                  <FxButton variant="inverted" onPress={toEditMode}>
                    Add / Remove
                  </FxButton>
                )}
              </FxBox>
              <FxSpacer height={24} />
              <FxHorizontalRule />
              <FxSpacer height={48} />
              <FxButton size="large">Done</FxButton>
              <FxSpacer height={48} />
            </FxBox>
          </FxBox>
        </KeyboardAwareScrollView>
        <FxPressableOpacity
          position="absolute"
          right={20}
          top={8}
          onPress={goBack}
        >
          <FxCloseIcon color="content1" />
        </FxPressableOpacity>
      </FxBox>
    </FxSafeAreaBox>
  );
};
