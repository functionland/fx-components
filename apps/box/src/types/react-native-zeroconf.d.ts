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

  class Zeroconf {
    constructor();
    scan(type: string, protocol?: string, domain?: string): void;
    stop(): void;
    getServices(): { [key: string]: Service };
    removeService(name: string): void;
    removeAllServices(): void;
    publishService(type: string, protocol: string, domain: string, name: string, port: number, txt?: Record<string, string>): void;
    unpublishService(name: string): void;
    on(event: string, handler: (service: Service) => void): void;
    off(event: string, handler: (service: Service) => void): void;
  }

  export default Zeroconf;
}
