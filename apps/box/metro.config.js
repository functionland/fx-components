const { withNxMetro } = require('@nx/react-native');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

// Node.js polyfills for React Native
const nodeLibs = require('node-libs-react-native');

// Handle node: protocol imports by stripping the prefix
const nodeProtocolPolyfills = {
  'node:crypto': nodeLibs.crypto,
  'node:stream': nodeLibs.stream,
  'node:buffer': nodeLibs.buffer,
  'node:util': nodeLibs.util,
  'node:events': nodeLibs.events,
  'node:path': nodeLibs.path,
  'node:os': nodeLibs.os,
  'node:url': nodeLibs.url,
  'node:assert': nodeLibs.assert,
  'node:http': nodeLibs.http,
  'node:https': nodeLibs.https,
  'node:zlib': nodeLibs.zlib,
  'node:process': nodeLibs.process,
};

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const customConfig = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    unstable_conditionNames: ['require', 'react-native'],
    extraNodeModules: {
      ...nodeLibs,
      ...nodeProtocolPolyfills,
    },
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    resolverMainFields: ['sbmodern', 'react-native', 'browser', 'main'],
    resolveRequest: (context, moduleName, platform) => {
      // Handle node: protocol imports
      if (moduleName.startsWith('node:')) {
        const strippedName = moduleName.slice(5); // Remove 'node:' prefix
        const polyfill = nodeLibs[strippedName];
        if (polyfill) {
          return context.resolveRequest(context, polyfill, platform);
        }
        // If no polyfill available, try resolving without the prefix
        return context.resolveRequest(context, strippedName, platform);
      }
      // Default resolution
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = withNxMetro(mergeConfig(defaultConfig, customConfig), {
  // Change this to true to see debugging info.
  // Useful if you have issues resolving modules
  debug: false,
  // all the file extensions used for imports other than 'ts', 'tsx', 'js', 'jsx', 'json'
  extensions: [],
  // Specify folders to watch, in addition to Nx defaults (workspace libraries and node_modules)
  watchFolders: [],
});
