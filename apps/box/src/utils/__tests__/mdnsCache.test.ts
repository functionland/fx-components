/**
 * Plan HTTP v2.1 — mdnsCache tests. Tests the sync read/write/freshness
 * surface; the actual Zeroconf scan path is exercised via the device
 * lab tests rather than unit-mocked (RN native module simulation is
 * fragile).
 */

import * as mdnsCache from '../mdnsCache';
import type { MDNSBloxService } from '../../models/blox';

function makeRecord(over: Partial<MDNSBloxService['txt']> = {}, host = '192.168.1.10'): MDNSBloxService {
    return {
        addresses: [host],
        fullName: `fulatower@${host}._fulatower._tcp`,
        host,
        name: 'fulatower',
        port: 8080,
        txt: {
            authorizer: 'APP1',
            bloxPeerIdString: 'BLOX1',
            hardwareID: 'HW1',
            poolName: 'p',
            ipAddress: host,
            ...over,
        },
    };
}

beforeEach(() => {
    mdnsCache.clear();
});

describe('mdnsCache.noteRecord + findAuthorizedBlox', () => {
    test('authorized blox is found by bloxPeerId+appPeerId match', () => {
        mdnsCache.noteRecord(makeRecord());

        const hit = mdnsCache.findAuthorizedBlox('BLOX1', 'APP1');

        expect(hit).not.toBeNull();
        expect(hit!.service.txt.hardwareID).toBe('HW1');
    });

    test('authorizer mismatch → not found', () => {
        mdnsCache.noteRecord(makeRecord({ authorizer: 'OTHER_APP' }));

        const hit = mdnsCache.findAuthorizedBlox('BLOX1', 'APP1');

        expect(hit).toBeNull();
    });

    test('bloxPeerId mismatch → not found', () => {
        mdnsCache.noteRecord(makeRecord());

        const hit = mdnsCache.findAuthorizedBlox('SOMETHING_ELSE', 'APP1');

        expect(hit).toBeNull();
    });

    test('multiple bloxes — picks the correct one by peerId', () => {
        mdnsCache.noteRecord(makeRecord({ bloxPeerIdString: 'BLOX1', hardwareID: 'HW1' }, '192.168.1.10'));
        mdnsCache.noteRecord(makeRecord({ bloxPeerIdString: 'BLOX2', hardwareID: 'HW2' }, '192.168.1.20'));

        const hitA = mdnsCache.findAuthorizedBlox('BLOX1', 'APP1');
        const hitB = mdnsCache.findAuthorizedBlox('BLOX2', 'APP1');

        expect(hitA!.service.txt.hardwareID).toBe('HW1');
        expect(hitB!.service.txt.hardwareID).toBe('HW2');
    });

    test('noteRecord updates observedAt on re-insert', async () => {
        const r = makeRecord();
        mdnsCache.noteRecord(r);
        const firstHit = mdnsCache.findAuthorizedBlox('BLOX1', 'APP1');
        const firstAt = firstHit!.observedAt;

        // Wait a tick + re-note to ensure timestamps differ.
        await new Promise(res => setTimeout(res, 5));
        mdnsCache.noteRecord(r);
        const secondHit = mdnsCache.findAuthorizedBlox('BLOX1', 'APP1');

        expect(secondHit!.observedAt).toBeGreaterThan(firstAt);
    });
});

describe('mdnsCache freshness gating', () => {
    test('stale record older than maxAgeMs is rejected', () => {
        mdnsCache.noteRecord(makeRecord());

        // Pretend the cached observedAt is way in the past.
        const internal = mdnsCache._internalRecords();
        const cached = Array.from(internal.values())[0];
        (cached as any).observedAt = Date.now() - 200_000;

        const fresh = mdnsCache.findAuthorizedBlox('BLOX1', 'APP1', 90_000);
        expect(fresh).toBeNull();
    });

    test('within freshness window → still found', () => {
        mdnsCache.noteRecord(makeRecord());

        const internal = mdnsCache._internalRecords();
        const cached = Array.from(internal.values())[0];
        (cached as any).observedAt = Date.now() - 5_000;     // 5 s old

        const fresh = mdnsCache.findAuthorizedBlox('BLOX1', 'APP1', 90_000);
        expect(fresh).not.toBeNull();
    });
});

describe('mdnsCache.clear', () => {
    test('removes all records', () => {
        mdnsCache.noteRecord(makeRecord({ bloxPeerIdString: 'A', hardwareID: 'H1' }));
        mdnsCache.noteRecord(makeRecord({ bloxPeerIdString: 'B', hardwareID: 'H2' }));

        mdnsCache.clear();

        expect(mdnsCache.findAuthorizedBlox('A', 'APP1')).toBeNull();
        expect(mdnsCache.findAuthorizedBlox('B', 'APP1')).toBeNull();
        expect(mdnsCache._internalRecords().size).toBe(0);
    });
});
