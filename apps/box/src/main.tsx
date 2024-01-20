import { AppRegistry, LogBox } from 'react-native';
import App from './app/App';
import 'text-encoding-polyfill';
require('node-libs-react-native/globals');
require('react-native-url-polyfill/auto');
require('react-native-get-random-values');

if (typeof BigInt === 'undefined') {
  global.BigInt = require('big-integer');
}

AppRegistry.registerComponent('Box', () => App);

LogBox.ignoreLogs(['Require cycle: ../../node_modules/']);
