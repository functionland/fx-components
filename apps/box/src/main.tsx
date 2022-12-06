import { AppRegistry, LogBox } from 'react-native';
import App from './app/App';
import 'text-encoding-polyfill';
require('node-libs-react-native/globals');

AppRegistry.registerComponent('Box', () => App);

LogBox.ignoreLogs(['Require cycle: ../../node_modules/']);
