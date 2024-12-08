import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  InitialSetupStackParamList,
  RootStackParamList,
  MainTabsParamList,
} from '../navigation/navigationConfig';

export const useRootNavigation = () =>
  useNavigation<NativeStackNavigationProp<RootStackParamList>>();

export const useInitialSetupNavigation = () =>
  useNavigation<NativeStackNavigationProp<InitialSetupStackParamList>>();

export const useMainTabsNavigation = () =>
  useNavigation<BottomTabNavigationProp<MainTabsParamList>>();
