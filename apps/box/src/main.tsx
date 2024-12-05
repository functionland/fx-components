import { AppRegistry, LogBox } from 'react-native';
import App from './app/App';
import 'text-encoding-polyfill';
import { fetch as fetchPolyfill } from 'whatwg-fetch';
require('node-libs-react-native/globals');
require('react-native-url-polyfill/auto');
require('react-native-get-random-values');


if (typeof BigInt === 'undefined') {
  global.BigInt = require('big-integer');
}
if (typeof fetch === 'undefined') {
  global.fetch = fetchPolyfill
}

AppRegistry.registerComponent('box', () => App);

LogBox.ignoreLogs(['Require cycle: ../../node_modules/']);
