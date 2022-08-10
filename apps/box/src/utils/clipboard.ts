import Clipboard from '@react-native-clipboard/clipboard';

export const copyToClipboard = (contents: string) => {
  Clipboard.setString(contents);
};
