import { createBox } from '@shopify/restyle';
import { FxTheme } from '../theme/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export const FxSafeAreaBox = createBox<FxTheme>(SafeAreaView);
