export const FXRelay =
  '/dns/relay.dev.fx.land/tcp/4001/p2p/12D3KooWDRrBaAfPwsGJivBoUw5fE7ZpDiyfUjqgiURq2DEcL835/p2p-circuit';

export type BluetoothCommandType =
  | 'reset'
  | 'cancel'
  | 'removedockercpblock'
  | 'connect';
export const BluetoothServices: Record<
  'command',
  { serviceUUID: string; characteristicUUID: string }
> = {
  command: {
    serviceUUID: '00000001-710e-4a5b-8d75-3e5b444bc3cf',
    characteristicUUID: '00000003-710e-4a5b-8d75-3e5b444bc3cf',
  },
};
