import {
  FxSafeAreaBox,
  FxSpacer,
  FxTable,
} from '@functionland/component-library';
import { HeaderText, SubHeaderText } from '../../../components/Text';
import React from 'react';
import { ScrollView } from 'react-native-gesture-handler';

const ICON_BUFFER = 32;

export const TableDemoScreen = () => {
  return (
    <FxSafeAreaBox flex={1}>
      <ScrollView>
        <HeaderText>Table Demo</HeaderText>
        <FxSpacer marginTop="16" />
        <SubHeaderText>Without foldout</SubHeaderText>
        <FxTable>
          <FxTable.Header>
            <FxTable.Title>First</FxTable.Title>
            <FxTable.Title>Second</FxTable.Title>
            <FxTable.Title>Third</FxTable.Title>
          </FxTable.Header>

          <FxTable.Row>
            <FxTable.Cell variant="bodyLargeRegular">Test 1</FxTable.Cell>
            <FxTable.Cell>Test 1</FxTable.Cell>
            <FxTable.Cell>Test 1</FxTable.Cell>
          </FxTable.Row>
          <FxTable.Row>
            <FxTable.Cell variant="bodyLargeRegular">Test 2</FxTable.Cell>
            <FxTable.Cell>Test 2</FxTable.Cell>
            <FxTable.Cell>Test 2</FxTable.Cell>
          </FxTable.Row>
          <FxTable.Row>
            <FxTable.Cell variant="bodyLargeRegular">Test 3</FxTable.Cell>
            <FxTable.Cell>Test 3</FxTable.Cell>
            <FxTable.Cell>Test 3</FxTable.Cell>
          </FxTable.Row>
        </FxTable>

        <FxSpacer marginTop="16" />
        <SubHeaderText>With foldout</SubHeaderText>
        <FxTable>
          <FxTable.Header>
            <FxTable.Title width={ICON_BUFFER} />
            <FxTable.Title>First</FxTable.Title>
            <FxTable.Title>Second</FxTable.Title>
            <FxTable.Title>Third</FxTable.Title>
          </FxTable.Header>

          <FxTable.RowGroup
            iconWidth={ICON_BUFFER}
            firstRow={
              <>
                <FxTable.Cell variant="bodyLargeRegular">Test 1</FxTable.Cell>
                <FxTable.Cell>Test 1</FxTable.Cell>
                <FxTable.Cell>Test 1</FxTable.Cell>
              </>
            }
            hiddenRow={
              <>
                <FxTable.Cell variant="bodyLargeRegular">Test 1</FxTable.Cell>
                <FxTable.Cell>Test 1</FxTable.Cell>
                <FxTable.Cell>Test 1</FxTable.Cell>
              </>
            }
          />
          <FxTable.RowGroup
            iconWidth={ICON_BUFFER}
            firstRow={
              <>
                <FxTable.Cell variant="bodyLargeRegular">Test 1</FxTable.Cell>
                <FxTable.Cell>Test 1</FxTable.Cell>
                <FxTable.Cell>Test 1</FxTable.Cell>
              </>
            }
            hiddenRow={
              <>
                <FxTable.Cell variant="bodyLargeRegular">Test 1</FxTable.Cell>
                <FxTable.Cell>Test 1</FxTable.Cell>
                <FxTable.Cell>Test 1</FxTable.Cell>
              </>
            }
          />
          <FxTable.RowGroup
            iconWidth={ICON_BUFFER}
            firstRow={
              <>
                <FxTable.Cell variant="bodyLargeRegular">Test 1</FxTable.Cell>
                <FxTable.Cell>Test 1</FxTable.Cell>
                <FxTable.Cell>Test 1</FxTable.Cell>
              </>
            }
            hiddenRow={
              <>
                <FxTable.Cell variant="bodyLargeRegular">Test 1</FxTable.Cell>
                <FxTable.Cell>Test 1</FxTable.Cell>
                <FxTable.Cell>Test 1</FxTable.Cell>
              </>
            }
          />
        </FxTable>
      </ScrollView>
    </FxSafeAreaBox>
  );
};
