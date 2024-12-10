import BleManager, { Peripheral } from 'react-native-ble-manager';
import BleManagerEmitter from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { EConnectionStatus } from '../models';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

export interface ChunkedResponse {
    type?: 'ble_header' | 'ble_chunk';
    index?: number;
    total_length?: number;
    chunks?: number;
    data?: string;
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
    private commandTimeout: NodeJS.Timeout | null = null;
    private bleListener: any = null;

    constructor() {
        this.setupBleListener();
    }

    private setupBleListener() {
        this.bleListener = BleManagerEmitter.addListener(
            'BleManagerDidUpdateValueForCharacteristic',
            async ({ value, characteristic }) => {
                console.log('BLE response received:', { characteristic, value });
                if (!this.currentCommand) return;
    
                // Convert array of numbers to string
                const stringValue = String.fromCharCode.apply(null, value);
                console.log('Converted response:', stringValue);
                
                const response = await this.handleResponse(stringValue);
                
                if (response) {
                    if (this.commandResolve) {
                        this.commandResolve(response);
                        this.cleanupCommand();
                    }
                }
            }
        );
    }

    private cleanupCommand() {
        this.currentCommand = null;
        this.commandResolve = null;
        this.commandPromise = null;
        if (this.commandTimeout) {
            clearTimeout(this.commandTimeout);
            this.commandTimeout = null;
        }
    }

    async writeToBLEAndWaitForResponse(
        command: string,
        peripheral: string,
        serviceUUID: string = "00000001-710e-4a5b-8d75-3e5b444bc3cf",
        characteristicUUID: string = "00000003-710e-4a5b-8d75-3e5b444bc3cf",
        timeout: number = 30000  // Increase timeout to 30 seconds
    ): Promise<any> {
        try {
            if (this.currentCommand) {
                throw new Error('Another command is in progress');
            }

            this.currentCommand = command;
            this.reset();
            await new Promise(resolve => setTimeout(resolve, 1000));

            // First retrieve the CCCD descriptor
            const descriptors = await BleManager.retrieveServices(peripheral);

            // Enable notifications before writing
            await BleManager.startNotification(
                peripheral,
                serviceUUID,
                characteristicUUID
            ).catch(error => {
                console.log('Notification error:', error);
                // Continue even if notification fails
            });
            console.log('Notifications enabled');
    
            // Set up listener before writing
            this.responsePromise = new Promise((resolve, reject) => {
                this.commandResolve = resolve;
                this.commandTimeout = setTimeout(() => {
                    console.log('Command timeout triggered after', timeout, 'ms');
                    reject(new Error('Command timed out'));
                    this.cleanupCommand();
                }, timeout);
            });
    
            // Write command
            const data = Buffer.from(command);
            console.log('Writing command:', command);
            await BleManager.write(
                peripheral,
                serviceUUID,
                characteristicUUID,
                Array.from(data),
                data.length  // Add length parameter
            );
            console.log('Write completed, waiting for response');
    
            // Wait for response
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
    private DEVICE_MAC = '2C:05:47:85:39:3F';
    private onStatusChange?: (status: EConnectionStatus) => void;

    constructor(statusCallback?: (status: EConnectionStatus) => void) {
        super();
        this.onStatusChange = statusCallback;
    }

    private async requestPermissions(): Promise<boolean> {
        if (Platform.OS === 'ios') return true;

        if (Platform.OS === 'android' && Platform.Version >= 31) {
            const permissions = [
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ];

            const results = await Promise.all(
                permissions.map((permission) => PermissionsAndroid.request(permission))
            );
            return results.every((result) => result === 'granted');
        }
        return true;
    }

    private async checkAndEnableBluetooth(): Promise<boolean> {
        try {
            console.log('ble.checkAndEnableBluetooth called');
            const permitted = await this.requestPermissions();
            if (!permitted) return false;

            const state = await BleManager.checkState();
            if (state === 'on') return true;

            if (Platform.OS === 'android') {
                await BleManager.enableBluetooth();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Bluetooth state check failed:', error);
            return false;
        }
    }

    public async connect(): Promise<boolean> {
        try {
            console.log('ble.connect called');
            await BleManager.start({ showAlert: false });
            const bluetoothReady = await this.checkAndEnableBluetooth();
            if (!bluetoothReady) return false;
            
            // Check existing connections
            const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
            const existingDevice = connectedPeripherals.find(
                device => device.name === this.DEVICE_NAME || device.id === this.DEVICE_MAC
            );
            console.log({existingDevice});
            if (existingDevice) return true;
            

            // Disconnect any other devices
            for (const peripheral of connectedPeripherals) {
                await BleManager.disconnect(peripheral.id);
            }

            

            return new Promise((resolve) => {
                console.log('scan promise called');
                const discoveredDevices: Array<{
                    peripheral: string;
                    rssi: number;
                    timestamp: number;
                }> = [];

                const SCAN_DURATION = 4000;
                const discoveryListener = bleManagerEmitter.addListener(
                    'BleManagerDiscoverPeripheral',
                    (peripheral) => {
                        if (peripheral.name === this.DEVICE_NAME || 
                            peripheral.id === this.DEVICE_MAC) {
                            discoveredDevices.push({
                                peripheral: peripheral.id,
                                rssi: peripheral.rssi,
                                timestamp: Date.now(),
                            });
                        }
                    }
                );

                BleManager.scan([], SCAN_DURATION, true)
                    .then(() => {
                        console.log('Scanning...');
                    })
                    .catch((err) => {
                        console.error('Scan failed', err);
                        discoveryListener.remove();
                        resolve(false);
                    });

                setTimeout(async () => {
                    discoveryListener.remove();
                    if (discoveredDevices.length === 0) {
                        resolve(false);
                        return;
                    }

                    const strongestDevice = discoveredDevices
                        .sort((a, b) => b.rssi - a.rssi)[0];

                    try {
                        console.log('ble connection is strating');
                        console.log({strongestDevice});
                        await BleManager.connect(strongestDevice.peripheral);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        resolve(true);
                    } catch (error) {
                        console.error('Connection error:', error);
                        resolve(false);
                    }
                }, SCAN_DURATION + 2000);
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