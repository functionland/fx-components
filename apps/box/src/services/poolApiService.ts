import { SupportedChain } from '../contracts/types';

export interface JoinPoolRequest {
  peerId: string;
  kuboPeerId?: string;
  account: string;
  chain: SupportedChain;
  poolId: number;
}

export interface JoinPoolResponse {
  status: 'ok' | 'err';
  msg: string;
}

export class PoolApiService {
  private static readonly BASE_URL = 'https://pools.fx.land';

  static async joinPool(request: JoinPoolRequest): Promise<JoinPoolResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (response.status === 401) {
        return {
          status: 'err',
          msg: 'Blox is not registered. Please contact sales@fx.land or register your Blox.',
        };
      }

      if (!response.ok) {
        return {
          status: 'err',
          msg: `HTTP error! status: ${response.status}`,
        };
      }

      const data: JoinPoolResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Pool API join error:', error);
      return {
        status: 'err',
        msg: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  static async cancelJoinRequest(request: JoinPoolRequest): Promise<JoinPoolResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (response.status === 401) {
        return {
          status: 'err',
          msg: 'Blox is not registered. Please contact sales@fx.land or register your Blox.',
        };
      }

      if (!response.ok) {
        return {
          status: 'err',
          msg: `HTTP error! status: ${response.status}`,
        };
      }

      const data: JoinPoolResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Pool API cancel error:', error);
      return {
        status: 'err',
        msg: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  static async leavePool(request: JoinPoolRequest): Promise<JoinPoolResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (response.status === 401) {
        return {
          status: 'err',
          msg: 'Blox is not registered. Please contact sales@fx.land or register your Blox.',
        };
      }

      if (!response.ok) {
        return {
          status: 'err',
          msg: `HTTP error! status: ${response.status}`,
        };
      }

      const data: JoinPoolResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Pool API leave error:', error);
      return {
        status: 'err',
        msg: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
