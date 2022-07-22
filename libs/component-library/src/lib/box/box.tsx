import { createBox } from '@shopify/restyle';
import { FxTheme } from '../theme/theme';

export const FxBox = createBox<FxTheme>();
export type FxBoxProps = React.ComponentProps<typeof FxBox>;
