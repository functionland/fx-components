import 'react-native-crypto';
import { polyfillWebCrypto } from 'react-native-get-random-values';
polyfillWebCrypto();
import './src/main.tsx';
