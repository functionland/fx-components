export interface TBlox {
    peerId: string
    name: string
    freeSpace?: TBloxFreeSpace
}
export interface TBloxFreeSpace {
    size: number;
    avail: number;
    used: number;
    used_percentage: number;
}
export type TBloxConectionStatus = 'CONNECTED' | 'PENDING' | 'DISCONNECTED'
