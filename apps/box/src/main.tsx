import { AppRegistry, LogBox } from 'react-native';
import App from './app/App';
import 'text-encoding-polyfill';
require('node-libs-react-native/globals');

if (typeof BigInt === 'undefined') {
    global.BigInt = require('big-integer');
}

AppRegistry.registerComponent('Box', () => App);

LogBox.ignoreLogs(['Require cycle: ../../node_modules/']);
