import React, { useEffect, useState } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxPressableOpacity,
  FxText,
  useFxTheme,
  APP_HORIZONTAL_PADDING,
} from '@functionland/component-library';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants/layout';
import { DynamicIcon } from '../components';
import { useRootNavigation } from '../hooks';
import { Routes } from '../navigation/navigationConfig';
import {
  useActivePluginsForCurrentBlox,
  useRefetchActivePluginsOnConnect,
} from '../hooks/usePluginsForBlox';
import { SvgUri } from 'react-native-svg';

type Plugin = {
  name: string;
  'icon-path': string;
  'icon-file'?: string;
};

type GlobalBottomSheetProps = {
  closeBottomSheet: VoidFunction;
};

export const GlobalBottomSheet = React.forwardRef<
  FxBottomSheetModalMethods,
  GlobalBottomSheetProps
>((_, ref) => {
  const navigationRoot = useRootNavigation();
  const theme = useFxTheme();
  const itemWidth = (SCREEN_WIDTH - APP_HORIZONTAL_PADDING * 2) / 4;
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  // Installed-plugin list + fetch status for the CURRENTLY selected blox, so
  // the "Installed" tags reflect the active device and refresh on blox switch.
  const { plugins: activePlugins, status: activePluginsStatus } =
    useActivePluginsForCurrentBlox();
  useRefetchActivePluginsOnConnect();

  useEffect(() => {
    // Fetch the catalogue of available plugins (blox-independent).
    fetch(
      'https://raw.githubusercontent.com/functionland/fula-ota/refs/heads/main/docker/fxsupport/linux/plugins/info.json'
    )
      .then((response) => response.json())
      .then((data: Plugin[]) => setPlugins(data))
      .catch((error) => console.error('Error fetching plugins:', error));
  }, []);

  return (
    <FxBottomSheetModal ref={ref}>
      <FxBox height={SCREEN_HEIGHT * 0.75}>
        <FxText variant="bodyMediumRegular">Plugins</FxText>
        {/* Distinguish "we don't know yet / couldn't reach this blox" from
            "this blox has no plugins installed" — otherwise an unknown state
            silently reads as every plugin being not-installed. */}
        {(activePluginsStatus === 'idle' || activePluginsStatus === 'loading') && (
          <FxText variant="bodyXSLight" color="content3" marginTop="4">
            Checking installed plugins…
          </FxText>
        )}
        {activePluginsStatus === 'error' && (
          <FxText variant="bodyXSLight" color="errorBase" marginTop="4">
            Couldn't reach this blox — install status unavailable
          </FxText>
        )}
        <FxBox paddingVertical="20" flexDirection="row" flexWrap="wrap">
        {plugins.map((plugin) => (
          <FxPressableOpacity
            key={plugin.name}
            width={itemWidth}
            alignItems="center"
            marginVertical="4"
            paddingVertical="4"
            onPress={() => {
              _.closeBottomSheet();
              navigationRoot.navigate(Routes.MainTabs, { screen: Routes.PluginTab, params: { name: plugin.name } });
            }}
          >
            {plugin['icon-path'] ? (
              <DynamicIcon
                iconPath={plugin['icon-path']}
                fill={theme.colors.primary}
              />
            ) : plugin['icon-file'] ? (
              <SvgUri
                uri={plugin['icon-file']}
                width={itemWidth}
                height={24}
                fill={theme.colors.primary}
                style={{ alignSelf: 'center', padding: 0, margin: 0 }}
              />
            ) : null}

            <FxText marginTop="4">{plugin.name}</FxText>
            
            {activePlugins.includes(plugin.name) && (
              <FxText variant="bodyXSLight" color="greenBase" marginTop="0">
                Installed
              </FxText>
            )}
          </FxPressableOpacity>
        ))}
        </FxBox>
      </FxBox>
    </FxBottomSheetModal>
  );
});
