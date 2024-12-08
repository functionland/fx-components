import { EBloxInteractionType, TBloxInteraction } from '../models';
import HomeBoxSetupDark from '../app/icons/home-blox-setup-dark.svg';
import HomeBoxSetupLight from '../app/icons/home-blox-setup-light.svg';
import OfficeBloxUnitDark from '../app/icons/office-blox-unit-dark.svg';
import OfficeBloxUnitLight from '../app/icons/office-blox-unit-light.svg';

export const bloxInteractions: TBloxInteraction[] = [
  // {
  //   mode: EBloxInteractionType.HomeBloxSetup,
  //   title: 'Home Blox Setup',
  //   darkIcon: HomeBoxSetupDark,
  //   lightIcon: HomeBoxSetupLight,
  // },
  {
    mode: EBloxInteractionType.OfficeBloxUnit,
    title: 'Blox Unit #1',
    darkIcon: OfficeBloxUnitDark,
    lightIcon: OfficeBloxUnitLight,
  },
];
