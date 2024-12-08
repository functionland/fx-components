module.exports = {
  presets: [
    [
      'module:metro-react-native-babel-preset',
      {
        unstable_transformProfile: 'hermes-stable',
        enableBabelRuntime: true
      }
    ]
  ],
  plugins: [
    'babel-plugin-syntax-hermes-parser',
    '@babel/plugin-transform-flow-strip-types',
    ['@babel/plugin-transform-class-properties', { loose: true }],
    ['@babel/plugin-transform-private-methods', { loose: true }],
    ['@babel/plugin-transform-private-property-in-object', { loose: true }],
    '@babel/plugin-transform-class-static-block',
    '@babel/plugin-transform-export-namespace-from',
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          'apps/blox/src': './src',
          '@functionland/component-library': '../../libs/component-library/src'
        }
      }
    ],
    'react-native-reanimated/plugin'
  ]
};