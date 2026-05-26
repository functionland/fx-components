/**
 * Plan HTTP v2.1 — H2 selector tests.
 *
 * Two focuses:
 *   1. ipIsPrivateLan — pure function with edge cases including the
 *      codex catch about 10.42.x.x being the hotspot AP subnet (NOT
 *      WireGuard) and therefore NOT blanket-rejected.
 *   2. selectAiTransport — picks LAN HTTP vs BLE based on mDNS,
 *      IP validity, and /health probe. We mock mdnsCache + HttpAiClient.health.
 */

jest.mock('../mdnsCache', () => ({
    findAuthorizedBlox: jest.fn(),
    refreshOnce: jest.fn().mockResolvedValue(undefined),
    noteRecord: jest.fn(),
    clear: jest.fn(),
}));

jest.mock('../httpAiClient', () => {
    // Keep the real DEFAULT_BLOX_AI_PORT but stub the class.
    const actual = jest.requireActual('../httpAiClient');
    return {
        ...actual,
        HttpAiClient: jest.fn(),
    };
});

import { ipIsPrivateLan, selectAiTransport } from '../aiTransport';
import * as mdnsCache from '../mdnsCache';
import { HttpAiClient } from '../httpAiClient';

const findAuthorizedBlox = mdnsCache.findAuthorizedBlox as unknown as jest.Mock;
const refreshOnce = mdnsCache.refreshOnce as unknown as jest.Mock;
const HttpAiClientMock = HttpAiClient as unknown as jest.Mock;

beforeEach(() => {
    findAuthorizedBlox.mockReset();
    refreshOnce.mockReset().mockResolvedValue(undefined);
    HttpAiClientMock.mockReset();
});

describe('ipIsPrivateLan — RFC1918 + link-local accept; loopback reject', () => {
    test.each([
        ['10.0.0.1',           true,  'RFC1918 10/8'],
        ['10.42.0.5',          true,  'codex catch: 10.42 is HOTSPOT AP subnet, NOT WireGuard — must accept'],
        ['192.168.1.50',       true,  'RFC1918 192.168/16'],
        ['172.16.0.10',        true,  'RFC1918 172.16/12 low edge'],
        ['172.31.255.255',     true,  'RFC1918 172.16/12 high edge'],
        ['169.254.1.1',        true,  'link-local 169.254/16'],
        ['127.0.0.1',          false, 'loopback rejected'],
        ['127.255.255.255',    false, 'loopback /8 rejected'],
        ['172.15.0.1',         false, '172.15 is OUTSIDE 172.16/12'],
        ['172.32.0.1',         false, '172.32 is OUTSIDE 172.16/12'],
        ['169.255.0.1',        false, '169.255 is not link-local'],
        ['8.8.8.8',            false, 'public IP rejected'],
        ['1.1.1.1',            false, 'public IP rejected'],
        ['',                   false, 'empty string'],
        ['not-an-ip',          false, 'malformed'],
        ['192.168.1',          false, 'truncated'],
        ['192.168.1.1.5',      false, 'too many octets'],
        ['256.0.0.1',          false, 'octet > 255'],
        ['fe80::1',            false, 'IPv6 not handled'],
    ])('%s -> %s (%s)', (ip, expected) => {
        expect(ipIsPrivateLan(ip)).toBe(expected);
    });
});

describe('selectAiTransport — happy path', () => {
    test('mDNS authorized + RFC1918 IP + healthy probe → LAN HTTP', async () => {
        findAuthorizedBlox.mockReturnValue({
            service: {
                txt: {
                    bloxPeerIdString: 'BLOX1',
                    authorizer: 'APP1',
                    hardwareID: 'HW1',
                    ipAddress: '192.168.1.50',
                },
                host: '192.168.1.50',
                addresses: ['192.168.1.50'],
                name: 'fulatower',
                fullName: 'fulatower._fulatower._tcp',
                port: 8080,
            },
            observedAt: Date.now(),
        });
        HttpAiClientMock.mockImplementation((ip: string, port: number) => ({
            ip,
            port,
            baseUrl: `http://${ip}:${port}`,
            health: jest.fn().mockResolvedValue({ ok: true, latencyMs: 15 }),
        }));

        const choice = await selectAiTransport('BLOX1', 'APP1', { scanIfEmpty: false });

        expect(choice.kind).toBe('lan-http');
        expect(HttpAiClientMock).toHaveBeenCalledWith('192.168.1.50', 8083);
        expect(refreshOnce).not.toHaveBeenCalled();
    });
});

describe('selectAiTransport — fall back to BLE', () => {
    test('no mDNS hit + default scanIfEmpty=false → BLE WITHOUT triggering refreshOnce', async () => {
        // Codex Plan HTTP final-review BLOCK: scanIfEmpty default must be
        // false to avoid stomping the pairing flow's Zeroconf scan. We
        // assert refreshOnce is NOT called by default.
        findAuthorizedBlox.mockReturnValue(null);

        const choice = await selectAiTransport('BLOX1', 'APP1');

        expect(choice.kind).toBe('ble');
        expect(refreshOnce).not.toHaveBeenCalled();
        expect(choice.reason).toMatch(/no fresh mDNS record/);
    });

    test('no mDNS hit + scanIfEmpty=true → triggers refreshOnce (opt-in)', async () => {
        findAuthorizedBlox.mockReturnValue(null);

        const choice = await selectAiTransport('BLOX1', 'APP1', { scanIfEmpty: true });

        expect(choice.kind).toBe('ble');
        expect(refreshOnce).toHaveBeenCalledTimes(1);
    });

    test('mDNS hit but IP not RFC1918 → BLE', async () => {
        findAuthorizedBlox.mockReturnValue({
            service: {
                txt: {
                    bloxPeerIdString: 'BLOX1',
                    authorizer: 'APP1',
                    hardwareID: 'HW1',
                    ipAddress: '8.8.8.8',           // public IP — must reject
                },
                host: '8.8.8.8',
                addresses: [],
                name: '',
                fullName: '',
                port: 8080,
            },
            observedAt: Date.now(),
        });

        const choice = await selectAiTransport('BLOX1', 'APP1', { scanIfEmpty: false });

        expect(choice.kind).toBe('ble');
        expect(choice.reason).toMatch(/not RFC1918/);
        expect(HttpAiClientMock).not.toHaveBeenCalled();
    });

    test('mDNS authorized + RFC1918 IP but /health fails → BLE', async () => {
        findAuthorizedBlox.mockReturnValue({
            service: {
                txt: {
                    bloxPeerIdString: 'BLOX1',
                    authorizer: 'APP1',
                    hardwareID: 'HW1',
                    ipAddress: '192.168.1.50',
                },
                host: '192.168.1.50',
                addresses: ['192.168.1.50'],
                name: 'fulatower',
                fullName: '',
                port: 8080,
            },
            observedAt: Date.now(),
        });
        HttpAiClientMock.mockImplementation(() => ({
            health: jest.fn().mockResolvedValue({ ok: false, latencyMs: 1200 }),
        }));

        const choice = await selectAiTransport('BLOX1', 'APP1', { scanIfEmpty: false });

        expect(choice.kind).toBe('ble');
        expect(choice.reason).toMatch(/probe failed/);
    });

    test('missing peer IDs → BLE without scan', async () => {
        const a = await selectAiTransport('', 'APP1');
        const b = await selectAiTransport('BLOX1', '');
        expect(a.kind).toBe('ble');
        expect(b.kind).toBe('ble');
        expect(refreshOnce).not.toHaveBeenCalled();
    });
});

describe('selectAiTransport — port discovery', () => {
    test('mDNS TXT bloxAiPort override → HttpAiClient uses it', async () => {
        findAuthorizedBlox.mockReturnValue({
            service: {
                txt: {
                    bloxPeerIdString: 'BLOX1',
                    authorizer: 'APP1',
                    hardwareID: 'HW1',
                    ipAddress: '10.0.0.5',
                    bloxAiPort: '8084',
                },
                host: '10.0.0.5',
                addresses: ['10.0.0.5'],
                name: '',
                fullName: '',
                port: 8080,
            },
            observedAt: Date.now(),
        });
        HttpAiClientMock.mockImplementation(() => ({
            health: jest.fn().mockResolvedValue({ ok: true, latencyMs: 10 }),
        }));

        await selectAiTransport('BLOX1', 'APP1', { scanIfEmpty: false });

        expect(HttpAiClientMock).toHaveBeenCalledWith('10.0.0.5', 8084);
    });

    test('malformed bloxAiPort → default 8083', async () => {
        findAuthorizedBlox.mockReturnValue({
            service: {
                txt: {
                    bloxPeerIdString: 'BLOX1',
                    authorizer: 'APP1',
                    hardwareID: 'HW1',
                    ipAddress: '10.0.0.5',
                    bloxAiPort: 'not-a-port',
                },
                host: '10.0.0.5',
                addresses: ['10.0.0.5'],
                name: '',
                fullName: '',
                port: 8080,
            },
            observedAt: Date.now(),
        });
        HttpAiClientMock.mockImplementation(() => ({
            health: jest.fn().mockResolvedValue({ ok: true, latencyMs: 10 }),
        }));

        await selectAiTransport('BLOX1', 'APP1', { scanIfEmpty: false });

        expect(HttpAiClientMock).toHaveBeenCalledWith('10.0.0.5', 8083);
    });
});
