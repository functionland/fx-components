import BleManager, { Peripheral } from 'react-native-ble-manager';
import { Platform, PermissionsAndroid } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { EConnectionStatus } from '../models';

/**
 * Whether the runtime BLUETOOTH_CONNECT permission is currently granted.
 *
 * Why this exists: on Android 12+ (API 31+) any native call that reaches
 * `BluetoothManager.getConnectedDevices()` — e.g. react-native-ble-manager's
 * `getConnectedPeripherals` — throws `java.lang.SecurityException` when
 * BLUETOOTH_CONNECT is NOT granted. That throw happens on the native
 * `mqt_v_native` thread (inside a posted Runnable) and is NOT marshalled back
 * to JS as a promise rejection, so a JS `try/catch` or `.catch()` can NOT
 * prevent the resulting hard crash (`FATAL EXCEPTION: mqt_v_native`). The only
 * reliable guard is to check the permission BEFORE making the call.
 *
 * Pre-12 (API < 31) `getConnectedDevices` needs no runtime permission (the
 * legacy install-time BLUETOOTH permission is auto-granted), and iOS has no
 * equivalent runtime gate here, so both return `true`.
 */
export async function hasBleConnectPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    const api = Number(Platform.Version);
    if (!Number.isFinite(api) || api < 31) return true;
    // Fall back to the literal string in case the RN constant is absent on
    // some versions of react-native / @types.
    const BLUETOOTH_CONNECT =
        (PermissionsAndroid.PERMISSIONS as { BLUETOOTH_CONNECT?: string })
            .BLUETOOTH_CONNECT ?? 'android.permission.BLUETOOTH_CONNECT';
    try {
        return await PermissionsAndroid.check(BLUETOOTH_CONNECT as any);
    } catch {
        return false;
    }
}

/**
 * Crash-safe replacement for `BleManager.getConnectedPeripherals(...)`.
 *
 * Returns `[]` instead of hard-crashing when BLUETOOTH_CONNECT is not granted
 * (see {@link hasBleConnectPermission} for why the native throw is uncatchable
 * from JS). EVERY caller in the app must use this instead of calling
 * `BleManager.getConnectedPeripherals` directly — an ESLint `no-restricted-syntax`
 * rule enforces it. All current call sites already treat an empty list as
 * "no BLE peripheral connected" and fall back to HTTP, so returning `[]` is the
 * correct degraded behaviour when the permission is absent.
 */
export async function safeGetConnectedPeripherals(
    serviceUUIDs: string[] = []
): Promise<Peripheral[]> {
    try {
        if (!(await hasBleConnectPermission())) {
            console.log(
                '[BLE] BLUETOOTH_CONNECT not granted — skipping getConnectedPeripherals'
            );
            return [];
        }
        // eslint-disable-next-line no-restricted-syntax -- the single sanctioned call; all others must route through this wrapper
        return await BleManager.getConnectedPeripherals(serviceUUIDs);
    } catch (e) {
        console.log('[BLE] getConnectedPeripherals failed (returning []):', e);
        return [];
    }
}

export type DiscoveredDevice = {
    peripheral: Peripheral;
    rssi: number;
};

export interface ChunkedResponse {
    type?: 'ble_header' | 'ble_chunk' | 'ble_stream';
    index?: number;
    total_length?: number;
    chunks?: number;
    data?: string;
    final?: boolean;
}

/**
 * Frame shape for the streaming protocol introduced in Phase 5 (foundation
 * for the Blox AI chat UX in Phase 12). One frame per token/event as it's
 * produced by the blox-side SSE → BLE bridge. `final: true` on the last
 * frame; `data` is a JSON string payload per frame.
 */
export interface BleStreamFrame {
    type: 'ble_stream';
    index: number;
    data: string;
    final: boolean;
}

/**
 * Accumulated result returned to the caller of writeToBLEAndWaitForResponse
 * when the response was a stream. `frames` is the ordered list of parsed
 * frame payloads (each one decoded from its `data` JSON string), and `final`
 * is the payload of the frame marked `final: true` (also the last entry in
 * `frames`). Phase 12 consumers can use whichever fits their UX better.
 */
export interface BleStreamResult {
    frames: any[];
    final: any;
}

/**
 * Error thrown when a stream times out before its `final: true` frame
 * arrives. Carries the frames that DID arrive before the timeout — Phase 12's
 * chat UX needs to render the partial transcript ("stream interrupted, here's
 * what we got") rather than just showing "error" and losing the user's
 * mid-stream content. All three post-implementation reviewers (gemini, codex,
 * built-in advisor) recommended this shape; consumers `try { ... } catch (e)
 * { if (e instanceof BleStreamTimeoutError) { renderPartial(e.partialFrames); } }`.
 */
export class BleStreamTimeoutError extends Error {
    public readonly partialFrames: any[];
    constructor(message: string, partialFrames: any[]) {
        super(message);
        this.name = 'BleStreamTimeoutError';
        this.partialFrames = partialFrames;
        // Preserve prototype chain across the babel/TS class-extends transform
        Object.setPrototypeOf(this, BleStreamTimeoutError.prototype);
    }
}

export class ResponseAssembler {
    private buffer: string[] = [];
    private expectedChunks: number = 0;
    private isReceivingChunks: boolean = false;
    private responsePromise: Promise<any> | null = null;
    private resolveResponse: ((value: any) => void) | null = null;

    private chunkCount: number = 0;

    private currentCommand: string | null = null;
    private commandPromise: Promise<any> | null = null;
    private commandResolve: ((value: any) => void) | null = null;
    private commandReject: ((reason?: any) => void) | null = null;
    private commandTimeout: NodeJS.Timeout | null = null;
    private bleListener: any = null;

    // Streaming state — isolated per command. Reset on cleanupCommand() so
    // a leftover stream from a prior command can never bleed into the next.
    // Per Codex pre-implementation review: stream isolation is mandatory.
    private isStreaming: boolean = false;
    private streamFrames: any[] = [];
    private onStreamFrame: ((frame: any) => void) | null = null;

    constructor() {
        this.setupBleListener();
    }

    private setupBleListener() {
        // Use new event API for react-native 0.76+
        this.bleListener = BleManager.onDidUpdateValueForCharacteristic(
            ({ value, characteristic }) => {
                console.log('BLE response received:', { characteristic, value });
                if (!this.currentCommand) return;

                // Convert array of numbers to string
                const stringValue = String.fromCharCode.apply(null, value as number[]);
                console.log('Converted response:', stringValue);

                this.handleResponse(stringValue).then((response) => {
                    if (response) {
                        if (this.commandResolve) {
                            this.commandResolve(response);
                            this.cleanupCommand();
                        }
                    }
                });
            }
        );
    }

    private cleanupCommand() {
        this.currentCommand = null;
        this.commandResolve = null;
        this.commandReject = null;
        this.commandPromise = null;
        if (this.commandTimeout) {
            clearTimeout(this.commandTimeout);
            this.commandTimeout = null;
        }
        // Reset stream state so the next command starts clean. Without this,
        // a leftover frames[] or onStreamFrame callback from a prior command
        // could leak into an unrelated subsequent command (Codex's "stream
        // should be isolated per command" review point).
        this.isStreaming = false;
        this.streamFrames = [];
        this.onStreamFrame = null;
    }

    async writeToBLEAndWaitForResponse(
        command: string,
        peripheral: string,
        serviceUUID: string = "00000001-710e-4a5b-8d75-3e5b444bc3cf",
        characteristicUUID: string = "00000003-710e-4a5b-8d75-3e5b444bc3cf",
        timeout: number = 30000,
        onStreamFrame?: (frame: any) => void
    ): Promise<any> {
        try {
            if (this.currentCommand) {
                throw new Error('Another command is in progress');
            }
    
            this.currentCommand = command;
            this.onStreamFrame = onStreamFrame || null;
            this.reset();
            
            // Add delay after connection before retrieving services
            await new Promise(resolve => setTimeout(resolve, 2000));
    
            // Try retrieveServices multiple times with increasing delays
            let services = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    services = await Promise.race([
                        BleManager.retrieveServices(peripheral, [serviceUUID]),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('retrieveServices timeout')), 7000)
                        )
                    ]);
                    if (services) break;
                } catch (e) {
                    console.log(`Attempt ${attempt} failed:`, e);
                    if (attempt < 3) {
                        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                        // Optionally refresh connection
                        if (attempt === 2) {
                            await BleManager.disconnect(peripheral);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            await BleManager.connect(peripheral);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    } else {
                        throw e;
                    }
                }
            }
    
            // Enable notifications before writing
            await BleManager.startNotification(
                peripheral,
                serviceUUID,
                characteristicUUID
            ).catch(error => {
                console.log('Notification error:', error);
            });
            console.log('Notifications enabled');
    
            this.responsePromise = new Promise((resolve, reject) => {
                this.commandResolve = resolve;
                this.commandReject = reject;
                this.commandTimeout = setTimeout(() => {
                    console.log('Command timeout triggered after', timeout, 'ms');
                    // Per Codex/Gemini/built-in advisor consensus: the
                    // OUTER promise rejects on timeout — never resolves
                    // with a partial result — BUT the rejection carries the
                    // frames that DID arrive so Phase 12's chat UX can
                    // render a partial transcript. Without this, consumers
                    // would have to maintain parallel mutable state to
                    // recover progress after a timeout.
                    const partial = this.isStreaming
                        ? this.streamFrames.slice()
                        : [];
                    reject(new BleStreamTimeoutError(
                        'Command timed out', partial));
                    this.cleanupCommand();
                }, timeout);
            });
    
            const data = Buffer.from(command);
            console.log('Writing command:', command);
            await BleManager.write(
                peripheral,
                serviceUUID,
                characteristicUUID,
                Array.from(data),
                data.length
            );
            console.log('Write completed, waiting for response');
    
            const response = await this.responsePromise;
            return response;
        } catch (error) {
            console.error('Error in writeToBLEAndWaitForResponse:', error);
            throw error;
        } finally {
            try {
                await BleManager.stopNotification(
                    peripheral,
                    serviceUUID,
                    characteristicUUID
                );
            } catch (e) {
                console.error('Error stopping notifications:', e);
            }
            this.cleanupCommand();
        }
    }
    

    async handleResponse(value: string): Promise<any> {
        try {
            let parsed;
            try {
                parsed = JSON.parse(value);
            } catch {
                console.log('Received non-JSON response:', value);
                return value;
            }

            if (Array.isArray(parsed) || typeof parsed !== 'object' || parsed === null) {
                console.log('Received direct response:', parsed);
                return parsed;
            }

            // Phase 5 streaming protocol: one frame per token/event with
            // explicit `index` for diagnostics + `final: true` on the last
            // frame. Foundation for Phase 12's Blox AI chat UX. Backward
            // compatible: existing ble_header + ble_chunk path below is
            // untouched, so non-streaming callers see no behavior change.
            if (parsed.type === 'ble_stream') {
                if (!this.isStreaming) {
                    this.isStreaming = true;
                    this.streamFrames = [];
                }

                // Each frame's `data` is itself a JSON-encoded payload.
                // Decode it once per frame so the caller sees structured data
                // rather than nested-stringified JSON.
                let framePayload: any = parsed.data;
                if (typeof parsed.data === 'string') {
                    try {
                        framePayload = JSON.parse(parsed.data);
                    } catch {
                        framePayload = parsed.data;
                    }
                }
                this.streamFrames.push(framePayload);

                // Deliver to consumer as soon as we have it. The callback is
                // best-effort: any exception in user code is swallowed so a
                // single bad frame can't kill the stream.
                if (this.onStreamFrame) {
                    try {
                        this.onStreamFrame(framePayload);
                    } catch (cbErr) {
                        console.error('onStreamFrame callback raised:', cbErr);
                    }
                }

                if (parsed.final === true) {
                    const result = {
                        frames: this.streamFrames,
                        final: framePayload,
                    };
                    if (this.commandResolve) {
                        this.commandResolve(result);
                    }
                }
                // Returning null signals "frame handled, don't resolve at the
                // outer command level yet" — the outer promise was already
                // resolved above on `final: true`, or remains pending.
                return null;
            }

            if (parsed.type === 'ble_header') {
                console.log(`Starting to receive chunked response with ${parsed.chunks} chunks`);
                this.buffer = [];
                this.expectedChunks = parsed.chunks || 0;
                this.chunkCount = 0;
                this.isReceivingChunks = true;
                
                this.responsePromise = new Promise((resolve) => {
                    this.resolveResponse = resolve;
                });
                return this.responsePromise;
            }

            if (parsed.type === 'ble_chunk' && this.isReceivingChunks) {
                this.chunkCount++;
                console.log(`Received chunk ${this.chunkCount}/${this.expectedChunks}`);
                
                this.buffer[parsed.index || 0] = parsed.data;

                if (this.buffer.filter(Boolean).length === this.expectedChunks) {
                    console.log('All chunks received, assembling response');
                    this.isReceivingChunks = false;
                    const completeData = this.buffer.join('');
                    this.buffer = [];
                    
                    let finalResponse;
                    try {
                        finalResponse = JSON.parse(completeData);
                    } catch {
                        finalResponse = completeData;
                    }

                    if (this.resolveResponse) {
                        console.log('Resolving complete response');
                        this.resolveResponse(finalResponse);
                        this.resolveResponse = null;
                        this.responsePromise = null;
                    }
                }
                return null;
            }

            console.log('Received regular response with type:', parsed.type);
            return parsed;

        } catch (error) {
            console.error('Error processing response:', error);
            this.reset(); // Reset state on error
            return null;
        }
    }

    reset() {
        console.log('Resetting ResponseAssembler state');
        this.buffer = [];
        this.expectedChunks = 0;
        this.chunkCount = 0;
        this.isReceivingChunks = false;
        this.responsePromise = null;
        this.resolveResponse = null;
    }

    cleanup() {
        if (this.bleListener) {
            this.bleListener.remove();
        }
        this.reset();
        this.cleanupCommand();
    }
}

export class BleManagerWrapper extends ResponseAssembler {
    private DEVICE_NAME = 'fulatower';
    private DEVICE_NAME2 = 'fxblox-rk1';
    private onStatusChange?: (status: EConnectionStatus) => void;

    constructor(statusCallback?: (status: EConnectionStatus) => void) {
        super();
        this.onStatusChange = statusCallback;
    }

    private async requestPermissions(): Promise<boolean> {
        if (Platform.OS === 'android') {
            try {
                if (Platform.Version < 31) {
                    // For Android 11 (API 30) and below
                    const locationPermission = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        {
                            title: 'Location Permission',
                            message: 'This app requires access to your location for Bluetooth functionality',
                            buttonPositive: 'OK',
                        }
                    );
                    return locationPermission === PermissionsAndroid.RESULTS.GRANTED;
                } else {
                    // For Android 12 (API 31) and above
                    const bluetoothPermissions = await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
                    ]);
    
                    return Object.values(bluetoothPermissions).every(
                        result => result === PermissionsAndroid.RESULTS.GRANTED
                    );
                }
            } catch (error) {
                console.error('Permission request error:', error);
                return false;
            }
        } else if (Platform.OS === 'ios') {
            // iOS requires location permission for BLE scanning
            try {
                const locationResult = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
                if (locationResult !== RESULTS.GRANTED) {
                    console.log('Location permission denied on iOS - required for BLE scanning');
                    return false;
                }
                return true;
            } catch (error) {
                console.error('iOS permission request error:', error);
                return false;
            }
        }
        return true;
    }
    
    

    private async checkAndEnableBluetooth(): Promise<boolean> {
        try {
            console.log('ble.checkAndEnableBluetooth called');
            
            // Check state first on iOS
            if (Platform.OS === 'ios') {
                const state = await BleManager.checkState();
                if (state === 'unauthorized') {
                    console.log('Bluetooth permission not granted');
                    return false;
                }
            }
    
            const permitted = await this.requestPermissions();
            if (!permitted) return false;
    
            // Recheck state after permissions
            const state = await BleManager.checkState();
            console.log('BLE state:', state);
    
            // Accept 'on' or 'unknown' states on iOS (unknown is common on first launch)
            if (state === 'on' || (Platform.OS === 'ios' && state === 'unknown')) {
                console.log('Bluetooth state acceptable, proceeding with connection');
                return true;
            }
    
            if (Platform.OS === 'android') {
                if (state === 'off') {
                    await BleManager.enableBluetooth();
                    return true;
                }
                return String(state) === 'on';
            } else {
                // On iOS, only fail if explicitly off or unauthorized
                if (state === 'off') {
                    console.log('Bluetooth is disabled on iOS - please enable it manually');
                    return false;
                }
                // For other states (including 'unknown'), proceed with connection attempt
                console.log('iOS Bluetooth state unclear, proceeding with connection attempt');
                return true;
            }
        } catch (error) {
            console.error('Bluetooth state check failed:', error);
            return false;
        }
    }
    

    public async connect(options?: {
        onMultipleDevicesFound?: (devices: DiscoveredDevice[]) => Promise<string | null>;
    }): Promise<boolean> {
        try {
            console.log('ble.connect called');
            console.log('[BLE] Initializing BleManager...');
            await BleManager.start({
                showAlert: false,
                forceLegacy: true  // Add this for iOS stability
            });
            console.log('[BLE] BleManager initialized successfully');
    
            const bluetoothReady = await this.checkAndEnableBluetooth();
            if (!bluetoothReady) return false;
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check existing connections
            const connectedPeripherals = await safeGetConnectedPeripherals([]);
            const existingDevice = connectedPeripherals.find(device => {
                const name = (device.name || '').toLowerCase();
                return name.includes('fulatower') || name.includes('fxblox');
            });
            
            if (existingDevice) {
                // On iOS, verify connection is still valid
                if (Platform.OS === 'ios') {
                    try {
                        await BleManager.retrieveServices(existingDevice.id);
                        return true;
                    } catch {
                        await BleManager.disconnect(existingDevice.id);
                    }
                } else {
                    return true;
                }
            }
    
            // Ensure clean state before scanning
            for (const peripheral of connectedPeripherals) {
                await BleManager.disconnect(peripheral.id);
            }
    
            return new Promise((resolve) => {
                const discoveredDevices: DiscoveredDevice[] = [];
    
                const SCAN_DURATION = Platform.OS === 'ios' ? 10000 : 10000; // 10 second scan

                // Use new event API for react-native 0.76+
                const discoveryListener = BleManager.onDiscoverPeripheral((peripheral) => {
                    // Log all discovered peripherals for debugging
                    console.log('[BLE] Discovered peripheral:', {
                        name: peripheral.name,
                        id: peripheral.id,
                        rssi: peripheral.rssi,
                    });

                    // Check if name matches (also check for partial match or localName)
                    const deviceName = peripheral.name || (peripheral as any).localName || '';
                    const isTargetDevice =
                        deviceName === this.DEVICE_NAME ||
                        deviceName === this.DEVICE_NAME2 ||
                        deviceName.toLowerCase().includes('fulatower') ||
                        deviceName.toLowerCase().includes('fxblox');

                    if (isTargetDevice) {
                        console.log('[BLE] Found target device:', deviceName);
                        // On iOS, only add if not already discovered
                        if (!discoveredDevices.some(d => d.peripheral.id === peripheral.id)) {
                            discoveredDevices.push({
                                peripheral: peripheral,
                                rssi: peripheral.rssi,
                            });
                        }
                    }
                });

                // Add connection state listener for iOS
                const connectListener = Platform.OS === 'ios'
                    ? BleManager.onConnectPeripheral(() => console.log('[BLE] Connection successful'))
                    : null;

                const disconnectListener = Platform.OS === 'ios'
                    ? BleManager.onDisconnectPeripheral(() => console.log('[BLE] Device disconnected'))
                    : null;

                // Add scan stop listener
                const stopScanListener = BleManager.onStopScan(() => console.log('[BLE] Native scan stopped'));

                console.log('[BLE] Starting scan for', SCAN_DURATION / 1000, 'seconds...');
                BleManager.scan({
                    serviceUUIDs: [],
                    seconds: SCAN_DURATION / 1000, // convert ms to seconds
                    allowDuplicates: Platform.OS !== 'ios',
                })
                    .then(() => {
                        console.log('Scanning...');
                    })
                    .catch((err) => {
                        console.error('[BLE] Scan failed', err);
                        discoveryListener.remove();
                        connectListener?.remove();
                        disconnectListener?.remove();
                        stopScanListener.remove();
                        resolve(false);
                    });
    
                setTimeout(async () => {
                    console.log('[BLE] Scan complete. Found', discoveredDevices.length, 'target devices');
                    discoveryListener.remove();
                    connectListener?.remove();
                    disconnectListener?.remove();
                    stopScanListener.remove();

                    if (discoveredDevices.length === 0) {
                        console.log('[BLE] No matching devices found');
                        resolve(false);
                        return;
                    }

                    let targetPeripheralId: string;

                    if (discoveredDevices.length === 1) {
                        // Single device: auto-connect (same as before)
                        targetPeripheralId = discoveredDevices[0].peripheral.id;
                    } else if (options?.onMultipleDevicesFound) {
                        // Multiple devices: sort and ask the caller
                        const sorted = [...discoveredDevices].sort((a, b) => {
                            const nameA = (a.peripheral.name || '').toLowerCase();
                            const nameB = (b.peripheral.name || '').toLowerCase();
                            const aIsPlainOrNew = nameA === 'fulatower' || nameA === 'fxblox-rk1' || nameA.endsWith('_new');
                            const bIsPlainOrNew = nameB === 'fulatower' || nameB === 'fxblox-rk1' || nameB.endsWith('_new');
                            if (aIsPlainOrNew && !bIsPlainOrNew) return -1;
                            if (!aIsPlainOrNew && bIsPlainOrNew) return 1;
                            return b.rssi - a.rssi; // secondary sort by signal strength
                        });
                        const selectedId = await options.onMultipleDevicesFound(sorted);
                        if (!selectedId) {
                            resolve(false);
                            return;
                        }
                        targetPeripheralId = selectedId;
                    } else {
                        // Multiple devices, no callback: strongest RSSI (backward compat)
                        targetPeripheralId = discoveredDevices.sort((a, b) => b.rssi - a.rssi)[0].peripheral.id;
                    }

                    try {
                        console.log('ble connection is starting');
                        console.log({targetPeripheralId});

                        if (Platform.OS === 'ios') {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }

                        await BleManager.connect(targetPeripheralId);
                        console.log('connected to ble');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        console.log('retrieveServices started');
                        await BleManager.retrieveServices(targetPeripheralId);
                        console.log('retrieveServices done');
                        resolve(true);
                    } catch (error) {
                        console.error('Connection error:', error);
                        resolve(false);
                    }
                }, SCAN_DURATION + (Platform.OS === 'ios' ? 3000 : 2000));
            });
        } catch (error) {
            console.error('Scan error:', error);
            return false;
        }
    }    
}


// Usage:
/*
const responseAssembler = new ResponseAssembler();

bleManagerEmitter.addListener(
    'BleManagerDidUpdateValueForCharacteristic',
    async ({ value, characteristic }) => {
        const stringValue = base64.decode(value);
        
        const response = await responseAssembler.handleResponse(stringValue);
        if (response) {
            // This will only be called when:
            // 1. A complete non-chunked response is received
            // 2. All chunks have been assembled into a complete response
            handleCompleteResponse(response);
        }
    }
);
*/