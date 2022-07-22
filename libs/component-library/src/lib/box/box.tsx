import { createBox } from '@shopify/restyle';
import Reanimated from 'react-native-reanimated';
import { FxTheme } from '../theme/theme';

export const FxBox = createBox<FxTheme>();
export const FxReanimatedBox = Reanimated.createAnimatedComponent(FxBox);
export type FxBoxProps = React.ComponentProps<typeof FxBox>;
