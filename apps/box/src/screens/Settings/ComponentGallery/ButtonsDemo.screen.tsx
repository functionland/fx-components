import {
  FxBox,
  FxBoxProps,
  FxButton,
  FxButtons,
  FxChevronLeftIcon,
  FxChevronRightIcon,
  FxLink,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
} from '@functionland/component-library';
import { HeaderText } from '../../../components/Text';
import React from 'react';
import { ScrollView } from 'react-native';

const Row = (props: FxBoxProps) => (
  <FxBox
    marginVertical="4"
    flexDirection="row"
    alignItems="center"
    {...props}
  />
);

export const ButtonsDemoScreen = () => {
  return (
    <FxSafeAreaBox flex={1} marginHorizontal={'20'}>
      <ScrollView>
        <HeaderText>Links</HeaderText>
        <FxSpacer marginTop="12" />
        <Row>
          <FxText marginRight="24">Default link</FxText>
          <FxLink>Link</FxLink>
        </Row>
        <Row>
          <FxText marginRight="24">Disabled link</FxText>
          <FxLink disabled={true}>Link</FxLink>
        </Row>
        <Row>
          <FxText marginRight="24">With icons</FxText>
          <FxLink
            iconLeft={<FxChevronLeftIcon />}
            iconRight={<FxChevronRightIcon />}
          >
            Link
          </FxLink>
        </Row>
        <Row>
          <FxText marginRight="24">Large link</FxText>
          <FxLink size="large">Link</FxLink>
        </Row>
        <FxSpacer marginTop="32" />
        <HeaderText>Buttons</HeaderText>
        <FxSpacer marginTop="12" />
        <FxText variant="bodyMediumRegular">Default fills container</FxText>
        <FxButton>Full width</FxButton>
        <FxSpacer marginTop="16" />
        <FxText variant="bodyMediumRegular">Large Default with Icons</FxText>
        <FxButton
          iconLeft={<FxChevronLeftIcon />}
          iconRight={<FxChevronRightIcon />}
          size="large"
        >
          Full width
        </FxButton>
        <FxSpacer marginTop="16" />
        <FxText variant="bodyMediumRegular">
          Auto sizing to fill container
        </FxText>
        <Row>
          <FxButton flex={1} variant="inverted">
            Inverted
          </FxButton>
          <FxSpacer marginLeft="8" />
          <FxButton flex={1} disabled>
            Disabled
          </FxButton>
        </Row>
        <FxSpacer marginTop="8" />
      </ScrollView>
    </FxSafeAreaBox>
  );
};
