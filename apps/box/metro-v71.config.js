/**
 * Old custom configuration for React Native v0.71.
 * From @react-native/metro-config 0.72.1, it is no longer necessary to use a config function to access the complete default config.
 * Please port your custom configuration to metro.config.js.
 * Please see https://reactnative.dev/docs/metro to learn about configuration.
 */
const { withNxMetro } = require('@nx/react-native');
const { getDefaultConfig } = require('metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig();
  return withNxMetro(
    {
      transformer: {
        getTransformOptions: async () => ({
          transform: {
            experimentalImportSupport: false,
            inlineRequires: true,
          },
        }),
        babelTransformerPath: require.resolve('react-native-svg-transformer'),
      },
      resolver: {
        extraNodeModules: require('node-libs-react-native'),
        assetExts: assetExts.filter((ext) => ext !== 'svg'),
        sourceExts: [...sourceExts, 'svg'],
        resolverMainFields: ['sbmodern', 'react-native', 'browser', 'main'],
        blockList: exclusionList([/\.\/dist\/.*/]),
      },
    },
    {
      // Change this to true to see debugging info.
      // Useful if you have issues resolving modules
      debug: false,
      // all the file extensions used for imports other than 'ts', 'tsx', 'js', 'jsx', 'json'
      extensions: [],
      // the project root to start the metro server
      projectRoot: __dirname,
      // Specify folders to watch, in addition to Nx defaults (workspace libraries and node_modules)
      watchFolders: [],
    }
  );
})();
