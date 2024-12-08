export type SUPPORTED_MEDIA_FORMATS = 'jpg' | 'jpeg' | 'png' | 'svg';

export const getMediaExtension = (url: string): SUPPORTED_MEDIA_FORMATS => {
  return url
    .split(/[#?]/)[0]
    .split('.')
    .pop()
    .trim() as SUPPORTED_MEDIA_FORMATS;
};

export const getWalletImage = (walletName: string) => {
  switch (walletName) {
    case 'MetaMask':
      return require('../../assets/images/wallets/MetaMask.png');
    default:
      return null;
  }
};
