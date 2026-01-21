declare module 'react-native-zeroconf' {
  interface Service {
    name: string;
    fullName: string;
    host: string;
    port: number;
    addresses: string[];
    txt: Record<string, string>;
  }

  interface ZeroconfInit {
    host?: string;
    domain?: string;
  }

  type ZeroconfEvent = 'start' | 'stop' | 'found' | 'resolved' | 'remove' | 'update' | 'error';

  class Zeroconf {
    constructor();
    scan(type: string, protocol?: string, domain?: string): void;
    stop(): void;
    getServices(): { [key: string]: Service };
    removeService(name: string): void;
    removeAllServices(): void;
    publishService(type: string, protocol: string, domain: string, name: string, port: number, txt?: Record<string, string>): void;
    unpublishService(name: string): void;
    on(event: 'start' | 'stop', handler: () => void): void;
    on(event: 'found', handler: (name: string) => void): void;
    on(event: 'resolved' | 'remove' | 'update', handler: (service: Service) => void): void;
    on(event: 'error', handler: (error: Error) => void): void;
    off(event: ZeroconfEvent, handler: (...args: any[]) => void): void;
    removeAllListeners(event?: ZeroconfEvent): void;
  }

  export default Zeroconf;
}
