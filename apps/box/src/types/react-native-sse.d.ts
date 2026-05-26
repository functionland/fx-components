/**
 * Local ambient module declaration for `react-native-sse`.
 *
 * Why: until `npm install` pulls the package, TypeScript can't find
 * its built-in types. This stub keeps the workspace type-checkable
 * before `npm install` runs (which CI does anyway). After install,
 * the package's bundled types will take precedence in the resolver,
 * so this stub stays harmless.
 *
 * The shape mirrors react-native-sse v1.x. We deliberately keep it
 * narrow to the surface httpAiClient.ts uses.
 */
declare module 'react-native-sse' {
    export interface EventSourceListener {
        (event: any): void;
    }

    export interface EventSourceOptions {
        method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        headers?: Record<string, string>;
        body?: string;
        timeout?: number;
        timeoutBeforeConnection?: number;
        pollingInterval?: number;
        withCredentials?: boolean;
        debug?: boolean;
    }

    export default class EventSource {
        constructor(url: string, options?: EventSourceOptions);
        addEventListener(event: string, listener: EventSourceListener): void;
        removeAllEventListeners(event?: string): void;
        close(): void;
    }
}
