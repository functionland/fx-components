import Clipboard from '@react-native-clipboard/clipboard';

export const copyToClipboard = (contents: string) => {
  Clipboard.setString(contents);
};

export const copyFromClipboard = async () => {
  return Clipboard.getString();
};
