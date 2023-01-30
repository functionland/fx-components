import { FC } from 'react';
import { SvgProps } from 'react-native-svg';
export * from './dApps';
export * from './pool';

export enum EBloxInteractionType {
  HomeBloxSetup = 'HomeBloxSetup',
  OfficeBloxUnit = 'OfficeBloxUnit',
}

export type TBloxInteraction = {
  mode: EBloxInteractionType;
  title: string;
  darkIcon: FC<SvgProps>;
  lightIcon: FC<SvgProps>;
};

export enum EConnectionStatus {
  connected = 'connected',
  connecting = 'connecting',
  failed = 'failed',
  notConnected = 'notConnected',
}
