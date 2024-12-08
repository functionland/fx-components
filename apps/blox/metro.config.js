const { withNxMetro } = require('@nx/react-native');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '../..');
const projectRoot = __dirname;

const defaultConfig = getDefaultConfig(projectRoot);
const { assetExts, sourceExts } = defaultConfig.resolver;

const customConfig = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
        unstable_transformProfile: 'hermes-enabled'
      },
    }),
    resolver: {
      unstable_enablePackageExports: true,
      unstable_conditionNames: ['require', 'import']
    },
    hermesParser: true // Disable hermes parser to use babel parser
  },
  resolver: {
    extraNodeModules: {
      ...require('node-libs-react-native'),
      crypto: require.resolve('react-native-crypto'),
      'node-crypto': require.resolve('react-native-crypto'),
      'node:crypto': require.resolve('react-native-crypto'),
      stream: require.resolve('readable-stream'),
      buffer: require.resolve('buffer'),
      randombytes: require.resolve('react-native-randombytes'),
      fs: require.resolve('react-native-fs'),
    },
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    resolverMainFields: ['react-native', 'browser', 'main'],
    platforms: ['ios', 'android'],
    disableHierarchicalLookup: true
  },
  transformerPath: require.resolve('metro-transform-worker'),
  transformIgnorePatterns: [
    'node_modules/(?!(@polkadot|@babel/runtime)/)'
  ],
  watchFolders: [
    workspaceRoot,
    path.resolve(workspaceRoot, 'apps'),
    path.resolve(workspaceRoot, 'libs')
  ],
  projectRoot
};

module.exports = withNxMetro(mergeConfig(defaultConfig, customConfig));